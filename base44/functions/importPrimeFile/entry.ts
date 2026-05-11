import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

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

  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    await base44.asServiceRole.entities.PrimeHolding.bulkCreate(records.slice(i, i + BATCH));
  }

  return Response.json({
    success: true,
    rows_imported: records.length,
    upload_month,
  });
});