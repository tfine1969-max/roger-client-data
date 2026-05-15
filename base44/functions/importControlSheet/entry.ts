import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as xlsx from 'npm:xlsx@0.18.5';

const BATCH = 100;

const PROVIDERS: Record<string, string> = {
  prime: 'Prime',
  gryphon: 'Gryphon',
  'julius-baer': 'Julius Baer',
  credo: 'Credo',
  northstar: 'Northstar',
  peresec: 'Peresec',
  prescient: 'Prescient',
};

const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function cleanText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalize(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = cleanText(value);
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const parsed = Number(raw.replace(/[R$,\s()%]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function parsePercent(value: unknown) {
  const parsed = parseNumber(value);
  if (!parsed) return 0;
  return Math.abs(parsed) <= 0.05 ? parsed * 100 : parsed;
}

function monthTokens(uploadMonth: string) {
  const monthIndex = Number(String(uploadMonth).split('-')[1]) - 1;
  return [MONTH_NAMES[monthIndex], MONTH_SHORT[monthIndex]].filter(Boolean);
}

function findHeader(rows: unknown[][]) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const headers = (rows[i] || []).map(cleanText);
    const normalized = headers.map(normalize);
    if (normalized.includes('client') && normalized.includes('investment name')) return { rowIndex: i, headers };
  }
  return null;
}

function findCol(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalize);
  for (const candidate of candidates.map(normalize)) {
    const exact = normalized.findIndex(h => h === candidate);
    if (exact >= 0) return exact;
  }
  for (const candidate of candidates.map(normalize)) {
    const partial = normalized.findIndex(h => h.includes(candidate) || candidate.includes(h));
    if (partial >= 0) return partial;
  }
  return -1;
}

function findMonthCol(headers: string[], prefix: string, uploadMonth: string) {
  const tokens = monthTokens(uploadMonth).map(normalize);
  const normalizedPrefix = normalize(prefix);
  return headers.findIndex(header => {
    const h = normalize(header);
    return h.includes(normalizedPrefix) && tokens.some(token => h.includes(token));
  });
}

function fileNameFromUrl(fileUrl: string) {
  try {
    return decodeURIComponent(fileUrl.split('/').pop() || '').replace(/\?.*$/, '');
  } catch (_error) {
    return fileUrl.split('/').pop() || '';
  }
}

async function deleteExisting(base44: any, uploadMonth: string, providerId: string) {
  while (true) {
    const rows = await base44.asServiceRole.entities.ControlValue.filter({ upload_month: uploadMonth, provider_id: providerId }, '-created_date', BATCH);
    if (!rows || rows.length === 0) break;
    for (const row of rows) await base44.asServiceRole.entities.ControlValue.delete(row.id);
    if (rows.length < BATCH) break;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider_id, file_url, upload_month, replace_existing = true } = await req.json();
    const providerName = PROVIDERS[String(provider_id || '').toLowerCase()];
    if (!providerName) return Response.json({ error: 'Unknown control provider' }, { status: 400 });
    if (!file_url || !upload_month) return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });

    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: `Could not fetch uploaded file (${fileRes.status})` }, { status: 400 });

    const buffer = await fileRes.arrayBuffer();
    let workbook;
    try {
      workbook = xlsx.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    } catch (error) {
      return Response.json({ error: `Could not read control workbook: ${error.message || String(error)}` }, { status: 400 });
    }
    const fileName = fileNameFromUrl(file_url);
    const records: Record<string, unknown>[] = [];

    for (const sheetName of workbook.SheetNames) {
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' }) as unknown[][];
      const header = findHeader(rows);
      if (!header) continue;

      const { rowIndex, headers } = header;
      const idx = {
        client: findCol(headers, ['Client']),
        classLabel: findCol(headers, ['Class']),
        investment: findCol(headers, ['Investment Name']),
        serviceProvider: findCol(headers, ['Service Provider']),
        nav: findMonthCol(headers, 'NAV', upload_month),
        rebateRate: findCol(headers, ['Rebate']),
        advisoryRate: findCol(headers, ['Advisory Fee']),
        rebateAmount: findMonthCol(headers, 'Rebates', upload_month),
        advisoryAmount: findMonthCol(headers, 'Advisory', upload_month),
      };

      if (idx.client < 0 || idx.investment < 0 || idx.nav < 0) continue;

      for (const row of rows.slice(rowIndex + 1)) {
        const clientName = cleanText(row[idx.client]);
        const investmentName = cleanText(row[idx.investment]);
        const nav = parseNumber(row[idx.nav]);
        if (!clientName || !investmentName || !nav) continue;

        const rebateRate = idx.rebateRate >= 0 ? parsePercent(row[idx.rebateRate]) : 0;
        const advisoryRate = idx.advisoryRate >= 0 ? parsePercent(row[idx.advisoryRate]) : 0;
        const rebateAmount = idx.rebateAmount >= 0 ? parseNumber(row[idx.rebateAmount]) : nav * (rebateRate / 100) / 12;
        const advisoryAmount = idx.advisoryAmount >= 0 ? parseNumber(row[idx.advisoryAmount]) : nav * (advisoryRate / 100) / 12;

        records.push({
          upload_month,
          provider_id,
          provider_name: providerName,
          client_name: clientName,
          class_label: idx.classLabel >= 0 ? cleanText(row[idx.classLabel]) : '',
          investment_name: investmentName,
          service_provider: idx.serviceProvider >= 0 ? cleanText(row[idx.serviceProvider]) : providerName,
          nav_zar: nav,
          rebate_annual_percent: rebateRate,
          advisory_annual_percent: advisoryRate,
          rebate_monthly_zar: rebateAmount,
          advisory_monthly_zar: advisoryAmount,
          source_file: fileName,
        });
      }
    }

    if (records.length === 0) {
      return Response.json({ error: 'No control rows found. Expected Client, Investment Name, Service Provider, NAV - month, Rebate, and Advisory Fee columns.' }, { status: 400 });
    }

    try {
      if (replace_existing) await deleteExisting(base44, upload_month, provider_id);
    } catch (error) {
      return Response.json({ error: `ControlValue delete failed. Confirm the ControlValue entity is published. ${error.message || String(error)}` }, { status: 500 });
    }

    let created = 0;
    try {
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        await base44.asServiceRole.entities.ControlValue.bulkCreate(batch);
        created += batch.length;
      }
    } catch (error) {
      return Response.json({ error: `ControlValue create failed. Confirm the ControlValue entity is published. ${error.message || String(error)}` }, { status: 500 });
    }

    return Response.json({
      success: true,
      provider_id,
      provider_name: providerName,
      upload_month,
      rows_imported: created,
      total_nav_zar: records.reduce((sum, row: any) => sum + (Number(row.nav_zar) || 0), 0),
      rebate_monthly_zar: records.reduce((sum, row: any) => sum + (Number(row.rebate_monthly_zar) || 0), 0),
      advisory_monthly_zar: records.reduce((sum, row: any) => sum + (Number(row.advisory_monthly_zar) || 0), 0),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});
