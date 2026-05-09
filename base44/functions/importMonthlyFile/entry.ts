import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

function hasUnknownValue(value: unknown) {
  return String(value ?? '').toLowerCase().includes('unknown');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { file_url, upload_month, replace_existing, exchange_rates = {} } = body;

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
  const providerTabs = new Set(['prime', 'credo', 'gryphon', 'julius baer', 'other']);
  const importSheetNames = workbook.SheetNames.filter(name => providerTabs.has(String(name).trim().toLowerCase()));
  const fallbackSheetName = workbook.SheetNames.find(n => n === 'Sheet1') || workbook.SheetNames[0];
  const sheetNamesToImport = importSheetNames.length ? importSheetNames : [fallbackSheetName];
  const rawRows = sheetNamesToImport.flatMap(name => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null }));

  const platformRateMap = {};
  if (workbook.Sheets.Total) {
    const totalRows = XLSX.utils.sheet_to_json(workbook.Sheets.Total, { header: 1, defval: null });
    for (const totalRow of totalRows) {
      const providerIndex = totalRow.findIndex(value => typeof value === 'string' && String(value).trim());
      if (providerIndex === -1) continue;
      const platform = String(totalRow[providerIndex]).trim();
      const nativeValue = totalRow[providerIndex + 1];
      const rate = totalRow[providerIndex + 2];
      if (nativeValue != null && rate != null) platformRateMap[platform] = Number(rate);
    }
  }

  // Build per-account exchange rate map from Sheet1 and sub-sheets.
  // Exchange rates are in col_12. Only the first row of each account group has a rate.
  // We need to scan all rows to find and cache the rate for each platform+account combination.
  const accountRateMap = {};
  
  // Scan Sheet1 first
  for (const row of rawRows) {
    const acct = String(row['Account Code'] ?? '').trim();
    const platform = String(row['Platform'] ?? '').trim();
    const currency = String(row['Currency'] ?? '').trim();
    if (!acct || !platform) continue;
    
    const key = `${platform}||${acct}`;
    const rate = row['col_12'] ?? platformRateMap[platform];
    
    // Cache the rate if found and not already set; also only for non-ZAR currencies
    if (rate != null && !accountRateMap[key] && currency !== 'ZAR') {
      accountRateMap[key] = Number(rate);
    }
  }

  // Also scan each sub-sheet (platform-specific sheets and "Other")
  for (const sName of sheetNamesToImport) {
    const subRows = XLSX.utils.sheet_to_json(workbook.Sheets[sName], { defval: null });
    for (const row of subRows) {
      const acct = String(row['Account Code'] ?? '').trim();
      const platform = String(row['Platform'] ?? '').trim();
      const currency = String(row['Currency'] ?? '').trim();
      if (!acct || !platform) continue;
      
      const key = `${platform}||${acct}`;
      const rate = row['col_12'] ?? platformRateMap[platform];
      
      if (rate != null && !accountRateMap[key] && currency !== 'ZAR') {
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
    const hasUnknown = [
      accountCode,
      row['Identity No'],
      row['Portfolio Name'],
      platform,
      row['Investment Name'],
      currency,
    ].some(hasUnknownValue);

    // Skip rows with no meaningful data
    if (!accountCode || marketValue == null) continue;

    const origValue = Number(marketValue);
    const key = `${platform}||${accountCode}`;
    const rate = accountRateMap[key] ?? null;

    let zarValue, conversionStatus, exchangeRate;

    // Special case: col_10 in "Other" sheet (and potentially others) may contain pre-converted ZAR values
    const preConvertedZar = row['col_10'];

    // Check if user provided an exchange rate for this currency
    const userProvidedRate = exchange_rates[currency] ? Number(exchange_rates[currency]) : null;

    if (currency === 'ZAR') {
      zarValue = origValue;
      conversionStatus = 'ZAR Base Currency';
      exchangeRate = 1;
    } else if (userProvidedRate) {
      // Prioritize user-provided rate
      zarValue = origValue * userProvidedRate;
      conversionStatus = 'Converted';
      exchangeRate = userProvidedRate;
    } else if (rate) {
      zarValue = origValue * rate;
      conversionStatus = 'Converted';
      exchangeRate = rate;
    } else if (preConvertedZar != null) {
      // Fall back to a pre-converted workbook value only when no rate is available.
      zarValue = Number(preConvertedZar);
      conversionStatus = 'Converted';
      exchangeRate = null;
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
      has_unknown_value: hasUnknown,
      is_flagged: hasUnknown || !accountCode || origValue === 0 || origValue == null,
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