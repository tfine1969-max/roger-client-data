import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as xlsx from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

const BATCH = 50;

const PROVIDERS: Record<string, string> = {
  peresec: 'Peresec',
  prescient: 'Prescient',
};

const COLUMN_ALIASES: Record<string, string[]> = {
  client: ['client', 'client name', 'investor', 'investor name', 'portfolio name'],
  investment: ['investment name', 'investment', 'fund', 'fund name', 'instrument', 'portfolio'],
  serviceProvider: ['service provider', 'provider', 'product provider', 'manager'],
  nav: ['nav', 'aum', 'market value', 'value', 'current value', 'balance'],
  rebate: ['rebate', 'rebate fee', 'rebate %', 'rebate percent'],
  advisory: ['advisory fee', 'advice fee', 'advisory', 'advisor fee', 'annual advice fee'],
  account: ['account', 'account code', 'account number', 'reference', 'portfolio number', 'code'],
  identity: ['id', 'identity', 'identity no', 'identity number', 'registration number', 'reg no'],
  currency: ['currency', 'ccy'],
};

function cleanText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalize(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slug(value: unknown) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = cleanText(value);
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const parsed = Number(raw.replace(/[%R$,\s()]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function parseAnnualPercent(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return 0;
  const parsed = parseNumber(raw);
  if (!parsed) return 0;
  if (raw.includes('%')) return parsed;
  if (Math.abs(parsed) > 0 && Math.abs(parsed) <= 0.05) return parsed * 100;
  return parsed;
}

function columnIndex(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalize);
  for (const alias of aliases.map(normalize)) {
    const exact = normalized.findIndex(header => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases.map(normalize)) {
    const partial = normalized.findIndex(header => header.includes(alias) || alias.includes(header));
    if (partial >= 0) return partial;
  }
  return -1;
}

function findHeader(rows: unknown[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const headers = (rows[i] || []).map(cleanText);
    const client = columnIndex(headers, COLUMN_ALIASES.client);
    const investment = columnIndex(headers, COLUMN_ALIASES.investment);
    const nav = columnIndex(headers, COLUMN_ALIASES.nav);
    if (client >= 0 && investment >= 0 && nav >= 0) return { rowIndex: i, headers };
  }
  return null;
}

function accountFromFilename(fileName: string) {
  const match = cleanText(fileName).match(/^([A-Z]{2,}\d+|\d{4,})\s*-/i);
  return match?.[1] || '';
}

async function deleteExisting(base44: any, uploadMonth: string, platform: string) {
  let deleted = 0;
  while (true) {
    const rows = await base44.asServiceRole.entities.PortfolioValuation.filter(
      { upload_month: uploadMonth, platform },
      '-created_date',
      BATCH,
    );
    if (!rows || rows.length === 0) break;
    for (const row of rows) {
      await base44.asServiceRole.entities.PortfolioValuation.delete(row.id);
      deleted++;
    }
    if (rows.length < BATCH) break;
  }
  return deleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider, file_url, upload_month, replace_existing = false } = await req.json();
    const platform = PROVIDERS[String(provider || '').toLowerCase()];
    if (!platform) return Response.json({ error: 'provider must be peresec or prescient' }, { status: 400 });
    if (!file_url || !upload_month) return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });

    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: `Could not fetch uploaded file (${fileRes.status})` }, { status: 400 });
    const buffer = await fileRes.arrayBuffer();
    const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    const mergeRules = await loadClientMergeRules(base44);
    const fileName = decodeURIComponent(file_url.split('/').pop() || 'provider-workbook').replace(/\?.*$/, '');
    const fallbackAccount = accountFromFilename(fileName);
    const records: Record<string, unknown>[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
      const header = findHeader(rows);
      if (!header) continue;

      const { rowIndex, headers } = header;
      const idx = {
        client: columnIndex(headers, COLUMN_ALIASES.client),
        investment: columnIndex(headers, COLUMN_ALIASES.investment),
        serviceProvider: columnIndex(headers, COLUMN_ALIASES.serviceProvider),
        nav: columnIndex(headers, COLUMN_ALIASES.nav),
        rebate: columnIndex(headers, COLUMN_ALIASES.rebate),
        advisory: columnIndex(headers, COLUMN_ALIASES.advisory),
        account: columnIndex(headers, COLUMN_ALIASES.account),
        identity: columnIndex(headers, COLUMN_ALIASES.identity),
        currency: columnIndex(headers, COLUMN_ALIASES.currency),
      };

      for (const row of rows.slice(rowIndex + 1)) {
        const clientName = cleanText(row[idx.client]);
        const investmentName = cleanText(row[idx.investment]);
        const serviceProvider = idx.serviceProvider >= 0 ? cleanText(row[idx.serviceProvider]) : '';
        const nav = parseNumber(row[idx.nav]);
        if (!clientName || !investmentName || !nav) continue;

        const accountCode = (idx.account >= 0 ? cleanText(row[idx.account]) : '') || fallbackAccount || `${platform.toUpperCase()}_${slug(clientName)}`;
        const currency = (idx.currency >= 0 ? cleanText(row[idx.currency]) : 'ZAR').toUpperCase() || 'ZAR';
        const rate = currency === 'ZAR' ? 1 : null;
        const rebate = idx.rebate >= 0 ? parseAnnualPercent(row[idx.rebate]) : 0;
        const advisory = idx.advisory >= 0 ? parseAnnualPercent(row[idx.advisory]) : 0;

        records.push(applyClientMergeRules({
          upload_month,
          account_code: accountCode,
          portfolio_name: clientName,
          identity_no: idx.identity >= 0 ? cleanText(row[idx.identity]) : '',
          platform,
          investment_name: investmentName,
          service_provider: serviceProvider || platform,
          currency,
          original_currency_value: nav,
          month_end_market_value: nav,
          exchange_rate_to_zar: rate ?? 1,
          zar_value: currency === 'ZAR' ? nav : nav,
          exchange_rate_source: currency === 'ZAR' ? 'N/A' : 'Not supplied',
          conversion_status: currency === 'ZAR' ? 'ZAR Base Currency' : 'Rate Required',
          rebate_fee_annual_percent: rebate,
          advisory_fee_annual_percent: advisory,
          has_missing_account_code: !accountCode,
          has_missing_identity_no: !(idx.identity >= 0 && cleanText(row[idx.identity])),
          has_missing_market_value: nav === 0,
          is_duplicate: false,
          is_flagged: nav === 0,
        }, mergeRules));
      }
    }

    if (records.length === 0) {
      return Response.json({
        error: 'No rows found. Expected columns include Client, Investment Name, NAV, Rebate, and Advisory Fee.',
      }, { status: 400 });
    }

    if (replace_existing) await deleteExisting(base44, upload_month, platform);

    let created = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(records.slice(i, i + BATCH));
      created += records.slice(i, i + BATCH).length;
    }

    await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: fileName,
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: records.length,
      rows_imported: created,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `${platform} workbook import`,
    });

    return Response.json({
      success: true,
      platform,
      rows_imported: created,
      upload_month,
      total_zar: records.reduce((sum, row: any) => sum + (Number(row.zar_value) || 0), 0),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});
