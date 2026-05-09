import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { file_url, upload_month, replace_existing } = body;

  if (!file_url || !upload_month) {
    return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
  }

  // Fetch the file bytes
  const fileResp = await fetch(file_url);
  const arrayBuffer = await fileResp.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  // We process Sheet1 which contains all platforms combined.
  // The exchange rate is in col_12 (index 12), appears only on the first row
  // of each account group — we propagate it per account_code within the sheet.
  const sheetName = workbook.SheetNames.find(n => n === 'Sheet1') || workbook.SheetNames[1];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  // Build per-account exchange rate map.
  // The exchange rate column appears as '__EMPTY_2' in Sheet1 (XLSX parser naming).
  // It is only populated on the first row of each account group — propagate per account+platform key.
  const accountRateMap = {};
  for (const row of rawRows) {
    const acct = String(row['Account Code'] ?? '').trim();
    const platform = String(row['Platform'] ?? '').trim();
    const key = `${platform}||${acct}`;
    // Try both possible column names (Sheet1 uses __EMPTY_2; sub-sheets may use col_12)
    const rate = row['__EMPTY_2'] ?? row['col_12'];
    if (rate != null && !accountRateMap[key]) {
      accountRateMap[key] = Number(rate);
    }
  }

  // Also scan each sub-sheet to pick up any rates missed in Sheet1
  for (const sName of workbook.SheetNames) {
    if (sName === 'Sheet1' || sName === 'Total') continue;
    const subRows = XLSX.utils.sheet_to_json(workbook.Sheets[sName], { defval: null });
    for (const row of subRows) {
      const acct = String(row['Account Code'] ?? '').trim();
      const platform = String(row['Platform'] ?? '').trim();
      const key = `${platform}||${acct}`;
      const rate = row['__EMPTY_2'] ?? row['col_12'];
      if (rate != null && !accountRateMap[key]) {
        accountRateMap[key] = Number(rate);
      }
    }
  }

  // Build valuation rows
  const rows = [];
  for (const row of rawRows) {
    const accountCode = String(row['Account Code'] ?? '').trim();
    const platform = String(row['Platform'] ?? '').trim();
    const currency = String(row['Currency'] ?? '').trim();
    const marketValue = row['Month End Market Value'];

    // Skip rows with no meaningful data
    if (!accountCode || marketValue == null) continue;

    const origValue = Number(marketValue);
    const key = `${platform}||${accountCode}`;
    const rate = accountRateMap[key] ?? null;

    let zarValue, conversionStatus, exchangeRate;

    if (currency === 'ZAR') {
      zarValue = origValue;
      conversionStatus = 'ZAR Base Currency';
      exchangeRate = 1;
    } else if (rate) {
      zarValue = origValue * rate;
      conversionStatus = 'Converted';
      exchangeRate = rate;
    } else {
      zarValue = origValue; // fallback: treat as ZAR (will be flagged)
      conversionStatus = 'Manual Rate Required';
      exchangeRate = null;
    }

    rows.push({
      upload_month,
      portfolio_id: row['Portfolio Id'] != null ? String(row['Portfolio Id']) : null,
      account_code: accountCode,
      identity_no: row['Identity No'] != null ? String(row['Identity No']) : null,
      portfolio_name: row['Portfolio Name'] ?? null,
      platform: platform || null,
      investment_name: row['Investment Name'] ?? null,
      currency,
      month_end_market_value: origValue,
      number_of_units: row['Number of Units'] != null ? Number(row['Number of Units']) : null,
      month_end_unit_price: row['Month End Unit Price'] != null ? Number(row['Month End Unit Price']) : null,
      original_currency_value: origValue,
      exchange_rate_to_zar: exchangeRate,
      zar_value: zarValue,
      conversion_status: conversionStatus,
      has_missing_account_code: !accountCode,
      has_missing_market_value: origValue === 0 || origValue == null,
      is_flagged: !accountCode || origValue === 0 || origValue == null,
    });
  }

  // Note: replace_existing param is ignored. Use dashboard to delete old month records before re-importing.

  // Create MonthlyUpload record
  const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: file_url.split('/').pop(),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: rows.length,
    rows_imported: rows.length,
    rows_skipped: 0,
    import_status: 'Imported',
  });

  // Bulk insert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, monthly_upload_id: upload.id }));
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
  }

  return Response.json({
    success: true,
    rows_imported: rows.length,
    upload_id: upload.id,
    exchange_rates_detected: accountRateMap,
  });
});