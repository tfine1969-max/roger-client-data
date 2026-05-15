import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

const PLATFORM = 'Peresec';
const BATCH = 100;

function cleanText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function normaliseHeader(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/[$R,\s]/g, '')
    .replace(/[()]/g, match => (match === '(' ? '-' : ''))
    .replace(/\)$/g, '')
    .replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function annualPercent(value: unknown) {
  const n = toNumber(value);
  if (n == null) return 0;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function calcFees(value: number, rebateAnnualPercent: number, advisoryAnnualPercent: number) {
  const rebateOriginal = value * (rebateAnnualPercent / 100) / 12;
  const advisoryOriginal = value * (advisoryAnnualPercent / 100) / 12;
  return {
    rebate_fee_annual_percent: rebateAnnualPercent,
    advisory_fee_annual_percent: advisoryAnnualPercent,
    rebate_fee_monthly_percent: rebateAnnualPercent / 12,
    advisory_fee_monthly_percent: advisoryAnnualPercent / 12,
    rebate_fee_monthly_amount_original_currency: rebateOriginal,
    advisory_fee_monthly_amount_original_currency: advisoryOriginal,
    rebate_fee_monthly_amount_zar: rebateOriginal,
    advisory_fee_monthly_amount_zar: advisoryOriginal,
    total_monthly_fee_original_currency: rebateOriginal + advisoryOriginal,
    total_monthly_fee_zar: rebateOriginal + advisoryOriginal,
    fee_required: false,
  };
}

function monthLabel(uploadMonth: string) {
  const [, month] = uploadMonth.split('-').map(Number);
  return [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ][month - 1] || '';
}

function monthEndDate(uploadMonth: string) {
  const [year, month] = uploadMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function accountCodeFor(platform: string, client: string, explicitCode: string) {
  if (explicitCode) return explicitCode;
  const compact = client.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${platform.toUpperCase()}_${compact || 'UNKNOWN'}`;
}

function getCell(row: unknown[], headers: string[], candidates: string[]) {
  const index = headers.findIndex(header => candidates.some(candidate => header === candidate || header.includes(candidate)));
  return index >= 0 ? row[index] : null;
}

function parseRows(workbook: XLSX.WorkBook, uploadMonth: string, platform: string, mergeRules: any[]) {
  const rows = [];
  const targetMonth = monthLabel(uploadMonth);
  const navCandidates = [`nav ${targetMonth}`, targetMonth ? targetMonth : 'nav', 'nav'];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as unknown[][];
    const headerIndex = matrix.findIndex(row => {
      const headers = row.map(normaliseHeader);
      return headers.includes('client') && headers.some(header => header.includes('investment name'));
    });
    if (headerIndex === -1) continue;

    const headers = matrix[headerIndex].map(normaliseHeader);
    for (const row of matrix.slice(headerIndex + 1)) {
      const client = cleanText(getCell(row, headers, ['client']));
      const investmentName = cleanText(getCell(row, headers, ['investment name', 'investment']));
      const serviceProvider = cleanText(getCell(row, headers, ['service provider']));
      if (!client || !investmentName) continue;
      const providerText = normaliseHeader(serviceProvider);
      if (serviceProvider && !(providerText.includes('peresec') || providerText.includes(normaliseHeader(platform)))) continue;

      const navValue = toNumber(getCell(row, headers, navCandidates));
      if (navValue == null) continue;

      const explicitCode = cleanText(getCell(row, headers, ['account code', 'account number', 'reference', 'portfolio id']));
      const accountCode = accountCodeFor(platform, client, explicitCode);
      const rebateAnnualPercent = annualPercent(getCell(row, headers, ['rebate']));
      const advisoryAnnualPercent = annualPercent(getCell(row, headers, ['advisory fee', 'advisory']));
      const isSyntheticCode = !explicitCode;

      rows.push(applyClientMergeRules({
        upload_month: uploadMonth,
        account_code: accountCode,
        identity_no: null,
        portfolio_name: client,
        platform,
        investment_name: investmentName,
        currency: 'ZAR',
        month_end_market_value: navValue,
        original_currency_value: navValue,
        zar_value: navValue,
        exchange_rate_to_zar: 1,
        exchange_rate_source: 'ZAR Base Currency',
        conversion_status: 'ZAR Base Currency',
        exchange_rate_date: monthEndDate(uploadMonth),
        has_missing_account_code: isSyntheticCode,
        has_missing_identity_no: true,
        has_missing_market_value: navValue === 0,
        has_unknown_value: /unknown/i.test(`${client} ${accountCode} ${investmentName}`),
        is_flagged: isSyntheticCode || navValue === 0 || /unknown/i.test(`${client} ${accountCode} ${investmentName}`),
        ...calcFees(navValue, rebateAnnualPercent, advisoryAnnualPercent),
      }, mergeRules));
    }
  }

  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, upload_month, replace_existing } = await req.json();
    if (!file_url || !upload_month) {
      return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
    }

    const filename = decodeURIComponent((file_url.split('/').pop() || '').split('?')[0]);
    const fileResp = await fetch(file_url);
    const workbook = XLSX.read(new Uint8Array(await fileResp.arrayBuffer()), { type: 'array', cellDates: true });
    const mergeRules = await loadClientMergeRules(base44);
    const rows = parseRows(workbook, upload_month, PLATFORM, mergeRules);

    if (rows.length === 0) {
      return Response.json({ error: 'No Peresec rows found. Check that the file has Client, Investment Name, Service Provider, and NAV columns for the selected month.' }, { status: 400 });
    }

    if (replace_existing) {
      const existing = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month, platform: PLATFORM }, '', 5000
      );
      for (const rec of existing) await base44.asServiceRole.entities.PortfolioValuation.delete(rec.id);
    }

    const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: filename,
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: rows.length,
      rows_imported: rows.length,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `${PLATFORM} workbook import.`,
    });

    for (let i = 0; i < rows.length; i += BATCH) {
      await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(
        rows.slice(i, i + BATCH).map(row => ({ ...row, monthly_upload_id: upload.id }))
      );
    }

    return Response.json({
      success: true,
      rows_imported: rows.length,
      upload_id: upload.id,
      platform: PLATFORM,
      sheets_imported: workbook.SheetNames,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : `${PLATFORM} import failed` }, { status: 500 });
  }
});
