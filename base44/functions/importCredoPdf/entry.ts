import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH = 50;

const MONTH_LABELS = {
  '01': 'JANUARY', '02': 'FEBRUARY', '03': 'MARCH', '04': 'APRIL',
  '05': 'MAY', '06': 'JUNE', '07': 'JULY', '08': 'AUGUST',
  '09': 'SEPTEMBER', '10': 'OCTOBER', '11': 'NOVEMBER', '12': 'DECEMBER',
};

function cleanText(value) {
  return String(value || '').trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const text = raw.replace(/[$,\s()]/g, '');
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function fileNameFromUrl(fileUrl) {
  try {
    return decodeURIComponent(fileUrl.split('/').pop() || '').replace(/\?.*$/, '');
  } catch {
    return fileUrl.split('/').pop() || '';
  }
}

function normalizeText(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ── Client merge rules (inlined — no local imports allowed) ──────────────────
async function loadClientMergeRules(base44) {
  try {
    return await base44.asServiceRole.entities.ClientMergeRule.list('-created_date', 500) || [];
  } catch {
    return [];
  }
}

function applyClientMergeRules(row, mergeRules) {
  if (!mergeRules || mergeRules.length === 0) return row;
  const nameKey = normalizeText(row.portfolio_name);
  const accountCode = cleanText(row.account_code);
  for (const rule of mergeRules) {
    const ruleKeys = (rule.client_keys || '').split('|').map(k => cleanText(k)).filter(Boolean);
    const ruleAccounts = (rule.account_codes || '').split('|').map(k => cleanText(k)).filter(Boolean);
    const ruleSourceNames = (rule.source_names || '').split('|').map(k => normalizeText(k)).filter(Boolean);
    const matchesAccount = accountCode && ruleAccounts.includes(accountCode);
    const matchesName = nameKey && ruleSourceNames.includes(nameKey);
    if (matchesAccount || matchesName) {
      return { ...row, portfolio_name: cleanText(rule.merged_name) || row.portfolio_name };
    }
  }
  return row;
}

// ── Shared DB helpers ────────────────────────────────────────────────────────
async function deleteMatchingRows(base44, query) {
  let deleted = 0;
  while (true) {
    const records = await base44.asServiceRole.entities.PortfolioValuation.filter(query, '-created_date', BATCH);
    if (!records || records.length === 0) break;
    for (const row of records) {
      await base44.asServiceRole.entities.PortfolioValuation.delete(row.id);
      deleted++;
    }
    if (records.length < BATCH) break;
  }
  return deleted;
}

async function bulkCreateValuations(base44, records, replaceExisting, uploadMonth, platform) {
  if (replaceExisting && records.length > 0) {
    let deleted = 0;
    while (true) {
      const toDelete = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month: uploadMonth, platform }, '-created_date', BATCH
      );
      if (!toDelete || toDelete.length === 0) break;
      for (const r of toDelete) {
        try { await base44.asServiceRole.entities.PortfolioValuation.delete(r.id); deleted++; } catch {}
        await new Promise(res => setTimeout(res, 50));
      }
      if (toDelete.length < BATCH) break;
    }
  }
  let created = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(records.slice(i, i + BATCH));
    created += records.slice(i, i + BATCH).length;
    if (i + BATCH < records.length) await new Promise(res => setTimeout(res, 200));
  }
  return created;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function makeAccountCode(clientName) {
  return `CREDO_${clientName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50)}`;
}

function makeValuationRow({ upload_month, accountCode, clientName, investmentName, navUsd, usdToZar, rebatePct, advisoryPct }) {
  const zarValue = navUsd * usdToZar;
  return {
    upload_month,
    account_code: accountCode,
    portfolio_name: clientName,
    platform: 'Credo',
    investment_name: investmentName || 'Unknown',
    currency: 'USD',
    original_currency_value: navUsd,
    month_end_market_value: navUsd,
    exchange_rate_to_zar: usdToZar,
    zar_value: zarValue,
    exchange_rate_date: null,
    exchange_rate_source: 'Manual Upload Rate',
    conversion_status: navUsd === 0 ? 'Failed' : 'Converted',
    number_of_units: null,
    month_end_unit_price: null,
    has_missing_account_code: false,
    has_missing_identity_no: true,
    has_missing_market_value: navUsd === 0,
    is_duplicate: false,
    is_flagged: navUsd === 0,
    rebate_fee_annual_percent: rebatePct * 100,
    advisory_fee_annual_percent: advisoryPct * 100,
  };
}

// Detect if this is a combined (multi-client) file by checking if multiple distinct
// non-total client names exist in the extracted rows.
function isCombinedFile(rows) {
  const clients = new Set(
    rows
      .filter(r => cleanText(r.client) && !cleanText(r.client).toLowerCase().includes('total'))
      .map(r => cleanText(r.client).toLowerCase())
  );
  return clients.size > 1;
}

// ── NEW: Credo Excel (.xlsx) import ─────────────────────────────────────────
// Handles both per-client files (client name from filename) and combined files
// (all clients in one sheet, client name from "Client" column).
async function importCredoExcel({ base44, user, file_url, upload_month, exchange_rate, replace_existing }) {
  const monthNum = upload_month.split('-')[1] || '';
  const monthLabel = MONTH_LABELS[monthNum] || '';
  if (!monthLabel) {
    return Response.json({ error: `Cannot determine month label for upload_month: ${upload_month}` }, { status: 400 });
  }

  const monthLabelTitle = monthLabel.charAt(0) + monthLabel.slice(1).toLowerCase(); // "May"
  const year = upload_month.split('-')[0];
  const navColDesc = `NAV value for ${monthLabelTitle} ${year}. Look for a column whose name contains "${monthLabelTitle}" or "${monthLabel}" and "NAV". Extract the full precision number. Null if blank or zero.`;

  const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          client:          { type: 'string',           description: 'Client name from the "Client" column. Skip rows where Client contains "Total" or "—".' },
          investment_name: { type: 'string',           description: 'Fund / security name from the "Investment Name" column' },
          nav_value:       { type: ['number', 'null'], description: navColDesc },
          rebate_pct:      { type: ['number', 'null'], description: 'Decimal from "Rebate" column, e.g. 0.005 for 0.5%' },
          advisory_pct:    { type: ['number', 'null'], description: 'Decimal from "Advisory Fee" column, e.g. 0.0075 for 0.75%' },
        },
      },
    },
  });

  if (result?.status !== 'success' || !Array.isArray(result?.output)) {
    return Response.json({ error: `Failed to extract Excel data: ${result?.details || 'Unknown error'}` }, { status: 400 });
  }

  // Filter out total/summary rows and rows with no investment or nav
  const allRows = result.output.filter(r => {
    const clientRaw = cleanText(r.client);
    if (!clientRaw || clientRaw.toLowerCase().includes('total')) return false;
    if (!cleanText(r.investment_name)) return false;
    if (parseNumber(r.nav_value) <= 0) return false;
    return true;
  });

  if (allRows.length === 0) {
    const rawFileName = fileNameFromUrl(file_url).replace(/\.xlsx?$/i, '').replace(/^[0-9a-f]{7,}_/i, '').replace(/_/g, ' ').trim();
    return Response.json({
      success: true,
      platform: 'Credo',
      rows_imported: 0,
      client_name: rawFileName,
      upload_month,
      exchange_rate_used: Number(exchange_rate),
      usd_total: 0,
      zar_total: 0,
      warning: `No holdings found for NAV month ${monthLabelTitle} ${year}. Check column names in the file.`,
    });
  }

  const usdToZar = Number(exchange_rate);
  const mergeRules = await loadClientMergeRules(base44);
  const combined = isCombinedFile(allRows);

  if (combined) {
    // ── Combined file: group rows by client name from "Client" column ──────
    const clientMap = {};
    for (const r of allRows) {
      const clientName = cleanText(r.client);
      if (!clientMap[clientName]) clientMap[clientName] = [];
      clientMap[clientName].push(r);
    }

    let totalCreated = 0;
    let totalUsd = 0;
    const clientNames = Object.keys(clientMap);

    // If replacing, clear all existing Credo data for this month first
    if (replace_existing) {
      await deleteMatchingRows(base44, { upload_month, platform: 'Credo' });
    }

    for (const clientName of clientNames) {
      const clientRows = clientMap[clientName];
      const accountCode = makeAccountCode(clientName);

      if (!replace_existing) {
        await deleteMatchingRows(base44, { upload_month, platform: 'Credo', account_code: accountCode });
      }

      const valuations = clientRows.map(r => applyClientMergeRules(
        makeValuationRow({
          upload_month, accountCode, clientName,
          investmentName: cleanText(r.investment_name),
          navUsd: parseNumber(r.nav_value),
          usdToZar,
          rebatePct: parseNumber(r.rebate_pct),
          advisoryPct: parseNumber(r.advisory_pct),
        }), mergeRules
      ));

      const created = await bulkCreateValuations(base44, valuations, false, upload_month, 'Credo');
      totalCreated += created;
      totalUsd += valuations.reduce((s, v) => s + (v.original_currency_value || 0), 0);
    }

    await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: fileNameFromUrl(file_url),
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: totalCreated,
      rows_imported: totalCreated,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `Credo combined Excel import. ${clientNames.length} clients. USD/ZAR: ${usdToZar}.`,
    });

    return Response.json({
      success: true,
      platform: 'Credo',
      rows_imported: totalCreated,
      client_name: `${clientNames.length} clients (combined file)`,
      account_code: 'COMBINED',
      account_number: 'COMBINED',
      upload_month,
      exchange_rate_used: usdToZar,
      usd_total: totalUsd,
      zar_total: totalUsd * usdToZar,
    });
  }

  // ── Per-client file: derive client name from filename ───────────────────
  const rawFileName = fileNameFromUrl(file_url).replace(/\.xlsx?$/i, '');
  const fileClientName = rawFileName
    .replace(/^[0-9a-f]{7,}_/i, '')
    .replace(/_and_/gi, ' & ')
    .replace(/_/g, ' ')
    .trim();

  const llmClientName = cleanText(allRows[0]?.client);
  const clientName = fileClientName || llmClientName || 'Credo Client';
  const accountCode = makeAccountCode(clientName);

  await deleteMatchingRows(base44, { upload_month, platform: 'Credo', account_code: accountCode });

  const valuations = allRows.map(r => applyClientMergeRules(
    makeValuationRow({
      upload_month, accountCode, clientName,
      investmentName: cleanText(r.investment_name),
      navUsd: parseNumber(r.nav_value),
      usdToZar,
      rebatePct: parseNumber(r.rebate_pct),
      advisoryPct: parseNumber(r.advisory_pct),
    }), mergeRules
  ));

  const created = await bulkCreateValuations(base44, valuations, false, upload_month, 'Credo');

  await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: fileNameFromUrl(file_url),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: created,
    rows_imported: created,
    rows_skipped: 0,
    import_status: 'Imported',
    notes: `Credo Excel import. Client: ${clientName}. Account: ${accountCode}. USD/ZAR: ${usdToZar}.`,
  });

  const usdTotal = valuations.reduce((sum, r) => sum + (r.original_currency_value || 0), 0);

  return Response.json({
    success: true,
    platform: 'Credo',
    rows_imported: created,
    client_name: clientName,
    account_code: accountCode,
    account_number: accountCode,
    upload_month,
    exchange_rate_used: usdToZar,
    usd_total: usdTotal,
    zar_total: usdTotal * usdToZar,
  });
}

// ── Northstar PDF import (unchanged) ─────────────────────────────────────────
function clientNameFromNorthstarFilename(fileUrl) {
  const name = fileNameFromUrl(fileUrl).replace(/\.pdf$/i, '');
  const match = name.match(/Northstar Monthly Statement\s+.+?-\s+(.+?)\s+-\s+\d{1,2}\s+\w+$/i) ||
    name.match(/Northstar Monthly Statement\s+.+?-\s+(.+)$/i);
  if (!match) return '';
  return match[1].trim();
}

function slugNorthstarAccount(value) {
  const slug = cleanText(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return slug ? `NORTHSTAR_${slug}` : 'NORTHSTAR_UNKNOWN';
}

function dedupeNorthstarHoldings(holdings) {
  const map = new Map();
  for (const holding of holdings) {
    const name = normalizeText(holding.holding_name);
    const value = Math.round(parseNumber(holding.market_value) * 100) / 100;
    const key = `${name}||${value}`;
    const currency = cleanText(holding.currency).toUpperCase();
    const existing = map.get(key);
    if (!existing) { map.set(key, holding); continue; }
    if (currency === 'ZAR' && cleanText(existing.currency).toUpperCase() !== 'ZAR') {
      map.set(key, holding);
    }
  }
  return [...map.values()];
}

async function deleteStaleNorthstarCredoRows(base44, uploadMonth, clientName, accountCode, filenameClient) {
  const names = new Set([normalizeText(clientName), normalizeText(filenameClient)].filter(Boolean));
  const accounts = new Set([cleanText(accountCode)].filter(Boolean));
  let deleted = 0;
  for (const account of accounts) {
    deleted += await deleteMatchingRows(base44, { upload_month: uploadMonth, platform: 'Credo', account_code: account });
  }
  let page = 0;
  while (true) {
    const records = await base44.asServiceRole.entities.PortfolioValuation.filter(
      { upload_month: uploadMonth, platform: 'Credo' }, '-created_date', 200, page * 200
    );
    if (!records || records.length === 0) break;
    for (const row of records) {
      if (names.has(normalizeText(row.portfolio_name))) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(row.id);
        deleted++;
      }
    }
    if (records.length < 200) break;
    page++;
  }
  return deleted;
}

async function importNorthstarPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing }) {
  const filenameClient = clientNameFromNorthstarFilename(file_url);
  const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Extract portfolio holdings from this Northstar monthly statement PDF.
The statement may be a scanned PDF. Read all pages and extract every individual holding/position/fund line.
Important currency rules:
- ZAR values → currency: ZAR. USD values → currency: USD.
- Do not convert values. Extract numbers as shown.
- If same holding appears in both USD and ZAR, keep ZAR only.
Extract:
- client_name (use "${filenameClient}" if unclear)
- account_number
- report_date (YYYY-MM-DD)
- reporting_currency
For each holding: holding_name, asset_class, currency, units, unit_price, market_value, percent_of_portfolio.
Return only real holdings with numeric market_value.
Return JSON: { "client_name": string, "account_number": string, "report_date": string, "reporting_currency": string, "holdings": [{ "holding_name": string, "asset_class": string, "currency": string, "units": number|null, "unit_price": number|null, "market_value": number, "percent_of_portfolio": number|null }] }`,
    file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        account_number: { type: 'string' },
        report_date: { type: 'string' },
        reporting_currency: { type: 'string' },
        holdings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              holding_name: { type: 'string' },
              asset_class: { type: 'string' },
              currency: { type: 'string' },
              units: { type: ['number', 'null'] },
              unit_price: { type: ['number', 'null'] },
              market_value: { type: 'number' },
              percent_of_portfolio: { type: ['number', 'null'] },
            },
          },
        },
      },
    },
  });

  const holdings = dedupeNorthstarHoldings(
    Array.isArray(extracted?.holdings)
      ? extracted.holdings.filter(h => cleanText(h?.holding_name) && parseNumber(h?.market_value) !== 0)
      : []
  );

  if (holdings.length === 0) {
    return Response.json({ error: 'No Northstar holdings extracted from PDF', raw: extracted }, { status: 400 });
  }

  const usdToZar = Number(exchange_rate);
  const clientName = cleanText(extracted.client_name) || filenameClient || 'Northstar Client';
  const accountCode = cleanText(extracted.account_number) || slugNorthstarAccount(clientName);
  const reportDate = cleanText(extracted.report_date) || null;
  const reportingCurrency = cleanText(extracted.reporting_currency).toUpperCase() || 'USD';
  const mergeRules = await loadClientMergeRules(base44);

  await deleteStaleNorthstarCredoRows(base44, upload_month, clientName, accountCode, filenameClient);

  const valuations = holdings.map(h => {
    const currency = cleanText(h.currency).toUpperCase() || reportingCurrency || 'USD';
    const originalValue = parseNumber(h.market_value);
    const rate = currency === 'ZAR' ? 1 : usdToZar;
    return applyClientMergeRules({
      upload_month,
      account_code: accountCode,
      portfolio_name: clientName,
      platform: 'Northstar',
      investment_name: cleanText(h.holding_name) || cleanText(h.asset_class) || 'Northstar Holding',
      currency,
      original_currency_value: originalValue,
      month_end_market_value: originalValue,
      exchange_rate_to_zar: rate,
      zar_value: originalValue * rate,
      exchange_rate_date: reportDate,
      exchange_rate_source: currency === 'ZAR' ? 'N/A' : 'Manual Upload Rate',
      conversion_status: currency === 'ZAR' ? 'ZAR Base Currency' : 'Converted',
      number_of_units: h.units ?? null,
      month_end_unit_price: h.unit_price ?? null,
      has_missing_account_code: !accountCode,
      has_missing_identity_no: true,
      has_missing_market_value: originalValue === 0,
      is_duplicate: false,
      is_flagged: originalValue === 0,
    }, mergeRules);
  });

  const created = await bulkCreateValuations(base44, valuations, replace_existing, upload_month, 'Northstar');

  await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: fileNameFromUrl(file_url),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: created,
    rows_imported: created,
    rows_skipped: 0,
    import_status: 'Imported',
    notes: `Northstar PDF import. Client: ${clientName}. Account: ${accountCode}. USD/ZAR rate: ${usdToZar}.`,
  });

  const usdTotal = valuations.filter(r => String(r.currency || '').toUpperCase() === 'USD')
    .reduce((sum, r) => sum + (r.original_currency_value || 0), 0);
  const zarTotal = valuations.reduce((sum, r) => sum + (r.zar_value || 0), 0);

  return Response.json({
    success: true,
    platform: 'Northstar',
    rows_imported: created,
    client_name: clientName,
    account_code: accountCode,
    upload_month,
    exchange_rate_used: usdToZar,
    usd_total: usdTotal,
    zar_total: zarTotal,
  });
}

// ── Legacy PDF import for Credo ───────────────────────────────────────────────
async function importCredoPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing }) {
  const extracted = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract from this Credo valuation PDF the client name, account number, and all security holdings.
For each holding extract: quantity, security_name, unit_cost, market_value_usd (USD value).
Return JSON: { "client_name": "string", "account_number": "string", "holdings": [{"quantity": number, "security_name": "string", "unit_cost": number, "market_value_usd": number}] }
Include ALL holdings. If a field is missing or 0, include as-is.`,
    file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        account_number: { type: 'string' },
        holdings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quantity: { type: 'number' },
              security_name: { type: 'string' },
              unit_cost: { type: 'number' },
              market_value_usd: { type: 'number' },
            },
          },
        },
      },
    },
  });

  const { client_name, account_number, holdings } = extracted;
  if (!holdings || holdings.length === 0) {
    return Response.json({ error: 'No holdings extracted from PDF' }, { status: 400 });
  }

  const mergeRules = await loadClientMergeRules(base44);
  const valuations = holdings.map(h => applyClientMergeRules({
    upload_month,
    account_code: account_number || 'UNKNOWN',
    portfolio_name: client_name || 'Credo Client',
    platform: 'Credo',
    investment_name: h.security_name || 'Unknown Security',
    currency: 'USD',
    original_currency_value: h.market_value_usd,
    exchange_rate_to_zar: exchange_rate,
    zar_value: (h.market_value_usd || 0) * exchange_rate,
    exchange_rate_date: null,
    exchange_rate_source: 'Manual',
    conversion_status: 'Converted',
    number_of_units: h.quantity,
    month_end_unit_price: h.unit_cost,
  }, mergeRules));

  const created = await bulkCreateValuations(base44, valuations, replace_existing, upload_month, 'Credo');

  return Response.json({
    success: true,
    platform: 'Credo',
    rows_imported: created,
    client_name,
    account_number,
    upload_month,
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, provider = 'Credo', format, file_url, upload_month, exchange_rate, replace_existing = true } = await req.json();

    if (action === 'capabilities') {
      return Response.json({ success: true, platform: 'Credo', northstar_supported: true, excel_supported: true });
    }

    if (!file_url || !upload_month || !exchange_rate) {
      return Response.json({ error: 'file_url, upload_month, and exchange_rate required' }, { status: 400 });
    }

    if (String(provider).toLowerCase() === 'northstar') {
      return importNorthstarPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing });
    }

    // Auto-detect Excel by extension or explicit format flag
    if (format === 'excel' || /\.xlsx?$/i.test(fileNameFromUrl(file_url))) {
      return importCredoExcel({ base44, user, file_url, upload_month, exchange_rate, replace_existing });
    }

    // Legacy PDF
    return importCredoPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});