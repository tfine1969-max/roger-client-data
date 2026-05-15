import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

function cleanText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function hasUnknownValue(value: unknown) {
  return cleanText(value).toLowerCase().includes('unknown');
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[$R,\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function annualPercent(value: unknown) {
  const n = toNumber(value);
  if (n == null) return 0;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function monthlyFeeAmounts(value: number, rebateAnnualPercent: number, advisoryAnnualPercent: number) {
  const rebateMonthly = value * (rebateAnnualPercent / 100) / 12;
  const advisoryMonthly = value * (advisoryAnnualPercent / 100) / 12;
  return {
    rebate_fee_annual_percent: rebateAnnualPercent,
    advisory_fee_annual_percent: advisoryAnnualPercent,
    rebate_fee_monthly_percent: rebateAnnualPercent / 12,
    advisory_fee_monthly_percent: advisoryAnnualPercent / 12,
    rebate_fee_monthly_amount_original_currency: rebateMonthly,
    advisory_fee_monthly_amount_original_currency: advisoryMonthly,
    rebate_fee_monthly_amount_zar: rebateMonthly,
    advisory_fee_monthly_amount_zar: advisoryMonthly,
    total_monthly_fee_original_currency: rebateMonthly + advisoryMonthly,
    total_monthly_fee_zar: rebateMonthly + advisoryMonthly,
    fee_required: false,
  };
}

function normalizeCurrency(value: unknown) {
  return cleanText(value).toUpperCase() || 'ZAR';
}

function generatedAccountCode(row: Record<string, unknown>) {
  const identity = cleanText(row['Identity No']).replace(/[^a-zA-Z0-9]+/g, '_');
  const name = cleanText(row['Portfolio Name']).replace(/[^a-zA-Z0-9]+/g, '_');
  return `UNKNOWN_${identity || name || 'ACCOUNT'}`;
}

function generatedProviderAccountCode(platform: string, client: string) {
  const name = cleanText(client).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${platform.toUpperCase()}_${name || 'UNKNOWN'}`;
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

function normalizedPlatform(value: unknown) {
  const text = cleanText(value).toLowerCase();
  if (text.includes('peresec')) return 'Peresec';
  if (text.includes('prescient')) return 'Prescient';
  return cleanText(value);
}

function getCell(row: unknown[], headers: string[], candidates: string[]) {
  const index = headers.findIndex(header => candidates.some(candidate => header === candidate || header.includes(candidate)));
  return index >= 0 ? row[index] : null;
}

function rowsFromSheet(sheet: XLSX.WorkSheet, sheetName: string) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const headerIndex = matrix.findIndex(row => row.some(cell => cleanText(cell).toLowerCase() === 'account code'));
  if (headerIndex === -1) return [];

  const headers = matrix[headerIndex].map(value => cleanText(value));
  return matrix.slice(headerIndex + 1).map((values) => {
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = values[index] ?? null;
    });
    if (!row.Platform && sheetName && !/^sheet\d*$/i.test(sheetName)) row.Platform = sheetName;
    return row;
  });
}

function providerRowsFromSheet(sheet: XLSX.WorkSheet, uploadMonth: string, providerFilter: string) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as unknown[][];
  const headerIndex = matrix.findIndex(row => {
    const headers = row.map(value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    return headers.includes('client') && headers.some(header => header.includes('investment name'));
  });
  if (headerIndex === -1) return [];

  const targetMonth = monthLabel(uploadMonth);
  const navCandidates = [`nav ${targetMonth}`, targetMonth, 'nav'];
  const headers = matrix[headerIndex].map(value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const rows: Record<string, unknown>[] = [];

  for (const values of matrix.slice(headerIndex + 1)) {
    const client = cleanText(getCell(values, headers, ['client']));
    const investmentName = cleanText(getCell(values, headers, ['investment name', 'investment']));
    const serviceProvider = normalizedPlatform(getCell(values, headers, ['service provider', 'provider', 'platform'])) || providerFilter;
    const platform = normalizedPlatform(providerFilter || serviceProvider);
    const providerText = cleanText(serviceProvider).toLowerCase();
    if (!client || !investmentName) continue;
    if (providerFilter && providerText && normalizedPlatform(serviceProvider) !== normalizedPlatform(providerFilter)) continue;

    const navValue = toNumber(getCell(values, headers, navCandidates));
    if (navValue == null) continue;

    const accountCode = cleanText(getCell(values, headers, ['account code', 'account number', 'reference', 'portfolio id']));
    rows.push({
      'Account Code': accountCode || generatedProviderAccountCode(platform, client),
      'Identity No': null,
      'Portfolio Name': client,
      Platform: platform,
      'Investment Name': investmentName,
      Currency: 'ZAR',
      'Month End Market Value': navValue,
      'Value ZAR': navValue,
      'Exchange Rate Date': monthEndDate(uploadMonth),
      'Rebate Annual Percent': annualPercent(getCell(values, headers, ['rebate'])),
      'Advisory Annual Percent': annualPercent(getCell(values, headers, ['advisory fee', 'advisory'])),
      'Generated Account Code': !accountCode,
    });
  }

  return rows;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { file_url, upload_month, replace_existing, exchange_rates = {}, provider_filter = '' } = body;
  const providerFilter = normalizedPlatform(provider_filter);
  const mergeRules = await loadClientMergeRules(base44);

  if (!file_url || !upload_month) {
    return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
  }

  const manualRates: Record<string, number> = {};
  Object.entries(exchange_rates || {}).forEach(([currency, rate]) => {
    const parsed = toNumber(rate);
    if (parsed && parsed > 0) manualRates[String(currency).toUpperCase()] = parsed;
  });

  const fileResp = await fetch(file_url);
  const arrayBuffer = await fileResp.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const providerFormatRows = providerFilter
    ? workbook.SheetNames.flatMap(name => providerRowsFromSheet(workbook.Sheets[name], upload_month, providerFilter))
    : [];

  const dataSheetNames = workbook.SheetNames.filter(name => {
    const normalized = String(name).trim().toLowerCase();
    if (['total', 'totals', 'summary'].includes(normalized)) return false;
    return rowsFromSheet(workbook.Sheets[name], name).length > 0;
  });
  const providerSheetNames = dataSheetNames.filter(name => !/^sheet\d*$/i.test(String(name).trim()));
  const fallbackSheetName = workbook.SheetNames.find(n => n === 'Sheet1') || workbook.SheetNames[0];
  const sheetNamesToImport = providerSheetNames.length ? providerSheetNames : dataSheetNames.length ? dataSheetNames : [fallbackSheetName];
  const rawRows = providerFormatRows.length
    ? providerFormatRows
    : sheetNamesToImport.flatMap(name => rowsFromSheet(workbook.Sheets[name], name));

  const platformRateMap: Record<string, number> = {};
  const totalsSheetName = workbook.SheetNames.find(name => /^totals?$/i.test(String(name).trim()));
  if (totalsSheetName) {
    const totalRows = XLSX.utils.sheet_to_json(workbook.Sheets[totalsSheetName], { header: 1, defval: null }) as unknown[][];
    for (const totalRow of totalRows) {
      const providerIndex = totalRow.findIndex(value => typeof value === 'string' && cleanText(value));
      if (providerIndex === -1) continue;
      const platform = cleanText(totalRow[providerIndex]);
      const nativeValue = totalRow[providerIndex + 1];
      const parsedRate = toNumber(totalRow[providerIndex + 2]);
      if (nativeValue != null && parsedRate) platformRateMap[platform] = parsedRate;
    }
  }

  const accountRateMap: Record<string, number> = {};
  for (const row of rawRows) {
    const acct = cleanText(row['Account Code']);
    const platform = cleanText(row.Platform);
    const currency = normalizeCurrency(row.Currency);
    if (!acct || !platform || currency === 'ZAR') continue;

    const key = `${platform}||${acct}`;
    const rate = manualRates[currency] ?? platformRateMap[platform];
    if (rate != null && !accountRateMap[key]) accountRateMap[key] = rate;
  }

  const rows = [];
  let skippedRows = 0;

  for (const row of rawRows) {
    const rawAccountCode = cleanText(row['Account Code']);
    const accountCode = rawAccountCode || generatedAccountCode(row);
    const platform = cleanText(row.Platform);
    const currency = normalizeCurrency(row.Currency);
    const origValue = toNumber(row['Month End Market Value']);
    const investmentName = cleanText(row['Investment Name']);

    if (!platform || !investmentName || origValue == null) {
      skippedRows += 1;
      continue;
    }

    const key = `${platform}||${accountCode}`;
    const rate = manualRates[currency] ?? accountRateMap[key] ?? platformRateMap[platform] ?? null;
    const preConvertedZar = toNumber(row['Value ZAR'] ?? row['ZAR Value']);

    let zarValue;
    let conversionStatus;
    let exchangeRate;

    if (currency === 'ZAR') {
      zarValue = origValue;
      conversionStatus = 'ZAR Base Currency';
      exchangeRate = 1;
    } else if (rate) {
      zarValue = origValue * rate;
      conversionStatus = manualRates[currency] ? 'Converted' : 'Converted';
      exchangeRate = rate;
    } else if (preConvertedZar != null) {
      zarValue = preConvertedZar;
      conversionStatus = 'Converted';
      exchangeRate = null;
    } else {
      zarValue = origValue;
      conversionStatus = 'Manual Rate Required';
      exchangeRate = null;
    }

    const hasUnknown = [
      accountCode,
      row['Identity No'],
      row['Portfolio Name'],
      platform,
      investmentName,
      currency,
    ].some(hasUnknownValue);

    const feeFields = row['Rebate Annual Percent'] != null || row['Advisory Annual Percent'] != null
      ? monthlyFeeAmounts(zarValue, Number(row['Rebate Annual Percent'] ?? 0), Number(row['Advisory Annual Percent'] ?? 0))
      : {};

    const mergedRow = applyClientMergeRules({
      upload_month,
      portfolio_id: row['Portfolio Id'] != null ? String(row['Portfolio Id']) : null,
      account_code: accountCode,
      identity_no: row['Identity No'] != null ? String(row['Identity No']) : null,
      portfolio_name: row['Portfolio Name'] ?? null,
      platform: platform || null,
      investment_name: investmentName,
      currency,
      month_end_market_value: origValue,
      number_of_units: toNumber(row['Number of Units']),
      month_end_unit_price: toNumber(row['Month End Unit Price']),
      original_currency_value: origValue,
      exchange_rate_to_zar: exchangeRate,
      zar_value: zarValue,
      exchange_rate_source: manualRates[currency] ? 'Manual Upload Rate' : 'Workbook',
      conversion_status: conversionStatus,
      exchange_rate_date: row['Exchange Rate Date'] != null ? String(row['Exchange Rate Date']) : undefined,
      has_missing_account_code: !rawAccountCode,
      has_missing_market_value: origValue === 0 || origValue == null,
      has_unknown_value: hasUnknown,
      is_flagged: hasUnknown || !rawAccountCode || origValue === 0 || origValue == null || conversionStatus === 'Manual Rate Required',
    }, mergeRules);

    rows.push({ ...mergedRow, ...feeFields });
  }

  if (replace_existing) {
    const deleteQuery = providerFilter ? { upload_month, platform: providerFilter } : { upload_month };
    const existingRows = await base44.asServiceRole.entities.PortfolioValuation.filter(deleteQuery, '', 5000);
    for (const existing of existingRows) {
      await base44.asServiceRole.entities.PortfolioValuation.delete(existing.id);
    }
    if (!providerFilter) {
      const existingUploads = await base44.asServiceRole.entities.MonthlyUpload.filter({ upload_month }, '', 500);
      for (const existingUpload of existingUploads) {
        await base44.asServiceRole.entities.MonthlyUpload.delete(existingUpload.id);
      }
    }
  }

  const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: file_url.split('/').pop(),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: rows.length,
    rows_imported: rows.length,
    rows_skipped: skippedRows,
    import_status: 'Imported',
    notes: `Sheets imported: ${sheetNamesToImport.join(', ')}. Manual rates: ${JSON.stringify(manualRates)}.`,
  });

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, monthly_upload_id: upload.id }));
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
  }

  return Response.json({
    success: true,
    rows_imported: rows.length,
    rows_skipped: skippedRows,
    upload_id: upload.id,
    sheets_imported: sheetNamesToImport,
    manual_rates_applied: manualRates,
    exchange_rates_detected: accountRateMap,
  });
});
