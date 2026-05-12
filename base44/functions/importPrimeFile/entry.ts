import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

function cleanText(value) {
  return value == null ? '' : String(value).trim();
}

function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[$R,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateStr(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    // Excel serial date — convert manually
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { file_url, upload_month, replace_existing } = body;
  const mergeRules = await loadClientMergeRules(base44);

  if (!file_url || !upload_month) {
    return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
  }

  const fileResp = await fetch(file_url);
  const arrayBuffer = await fileResp.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  // Prime files can have one or multiple sheets — parse all
  const allRows = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!matrix || matrix.length < 2) continue;

    // Find header row (look for "Investor" or "Account number")
    let headerIndex = matrix.findIndex(row =>
      row.some(cell => cleanText(cell).toLowerCase() === 'investor' || cleanText(cell).toLowerCase() === 'account number')
    );
    if (headerIndex === -1) continue;

    const headers = matrix[headerIndex].map(v => cleanText(v));
    const dataRows = matrix.slice(headerIndex + 1);

    for (const values of dataRows) {
      const row = {};
      headers.forEach((h, i) => { if (h) row[h] = values[i] ?? null; });
      if (!cleanText(row['Investor']) && !cleanText(row['Account number'])) continue;
      allRows.push(row);
    }
  }

  if (allRows.length === 0) {
    return Response.json({ error: 'No data rows found. Ensure the file has an "Investor" or "Account number" header.' }, { status: 400 });
  }

  // If replacing, delete existing records for this month
  if (replace_existing) {
    const existing = await base44.asServiceRole.entities.PrimeHolding.filter({ upload_month }, '', 5000);
    for (const rec of existing) {
      await base44.asServiceRole.entities.PrimeHolding.delete(rec.id);
    }
  }

  const records = allRows.map(row => ({
    upload_month,
    date_of_report: toDateStr(row['Date of report']),
    account_number: cleanText(row['Account number']) || cleanText(row['Instrument account numbers']),
    investor: cleanText(row['Investor']),
    id_number: cleanText(row['ID Number']),
    product: cleanText(row['Product']),
    status: cleanText(row['Status']),
    instrument_code: cleanText(row['Instrument code']),
    instrument_name: cleanText(row['Instrument name']),
    percent_of_account: toNumber(row['% of account']),
    currency: cleanText(row['Preferred Currency']) || 'ZAR',
    market_value: toNumber(row['Value']) ?? toNumber(row['Market Value in System Currency']),
    units: toNumber(row['Units']),
    price: toNumber(row['Price']),
    price_date: toDateStr(row['Price Date']),
    adviser: cleanText(row['Adviser']),
  })).filter(r => r.investor || r.account_number);

  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    await base44.asServiceRole.entities.PrimeHolding.bulkCreate(records.slice(i, i + BATCH));
    if (i + BATCH < records.length) await new Promise(r => setTimeout(r, 300));
  }

  // Also write into PortfolioValuation so dashboard/fees/platforms see Prime data
  if (replace_existing) {
    let page = 0;
    while (true) {
      const existingPV = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month, platform: 'Prime' }, '', 200, page * 200
      );
      if (!existingPV.length) break;
      await Promise.all(existingPV.map(rec => base44.asServiceRole.entities.PortfolioValuation.delete(rec.id)));
      if (existingPV.length < 200) break;
      page++;
    }
  }

  const pvRecords = records
    .filter(r => r.market_value != null && r.instrument_name)
    .map(r => applyClientMergeRules({
      upload_month,
      account_code: r.account_number,
      portfolio_name: r.investor,
      identity_no: r.id_number,
      platform: 'Prime',
      investment_name: r.instrument_name,
      currency: r.currency || 'ZAR',
      original_currency_value: r.market_value,
      exchange_rate_to_zar: 1,
      zar_value: r.market_value,
      conversion_status: 'ZAR Base Currency',
      number_of_units: r.units,
      month_end_unit_price: r.price,
      month_end_market_value: r.market_value,
      has_missing_account_code: !r.account_number,
      has_missing_identity_no: !r.id_number,
      has_missing_market_value: !r.market_value,
      is_duplicate: false,
      is_flagged: !r.account_number || !r.id_number,
    }, mergeRules));

  for (let i = 0; i < pvRecords.length; i += BATCH) {
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(pvRecords.slice(i, i + BATCH));
    if (i + BATCH < pvRecords.length) await new Promise(r => setTimeout(r, 500));
  }

  return Response.json({
    success: true,
    rows_imported: records.length,
    upload_month,
  });
});
