import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

const BATCH = 50;

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const negative = raw.startsWith('(') && raw.endsWith(')');
  const text = raw.replace(/[$,\s()]/g, '');
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function fileNameFromUrl(fileUrl: string) {
  try {
    return decodeURIComponent(fileUrl.split('/').pop() || '').replace(/\?.*$/, '');
  } catch (_error) {
    return fileUrl.split('/').pop() || '';
  }
}

function clientNameFromNorthstarFilename(fileUrl: string) {
  const name = fileNameFromUrl(fileUrl).replace(/\.pdf$/i, '');
  const match = name.match(/Northstar Monthly Statement\s+.+?-\s+(.+?)\s+-\s+\d{1,2}\s+\w+$/i) ||
    name.match(/Northstar Monthly Statement\s+.+?-\s+(.+)$/i);
  if (!match) return '';
  return match[1].trim();
}

function slugNorthstarAccount(value: string) {
  const slug = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug ? `NORTHSTAR_${slug}` : 'NORTHSTAR_UNKNOWN';
}

function normalizeText(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function bulkCreateValuations(base44, records, replaceExisting, uploadMonth, platform = 'Credo') {
  if (replaceExisting && records.length > 0) {
    let deleted = 0;
    while (true) {
      const toDelete = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month: uploadMonth, platform }, '-created_date', BATCH
      );
      if (!toDelete || toDelete.length === 0) break;
      for (const r of toDelete) {
        try {
          await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
          deleted++;
        } catch (err) {
          // Record may have been deleted already, skip
        }
        await new Promise(res => setTimeout(res, 100));
      }
      if (toDelete.length < BATCH) break;
    }
  }

  let created = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
    created += batch.length;
    if (i + BATCH < records.length) {
      await new Promise(res => setTimeout(res, 300));
    }
  }
  return created;
}

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
      { upload_month: uploadMonth, platform: 'Credo' },
      '-created_date',
      200,
      page * 200,
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

function dedupeNorthstarHoldings(holdings) {
  const map = new Map();
  for (const holding of holdings) {
    const name = normalizeText(holding.holding_name);
    const value = Math.round(parseNumber(holding.market_value) * 100) / 100;
    const key = `${name}||${value}`;
    const currency = cleanText(holding.currency).toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, holding);
      continue;
    }
    const existingCurrency = cleanText(existing.currency).toUpperCase();
    if (currency === 'ZAR' && existingCurrency !== 'ZAR') {
      map.set(key, holding);
    }
  }
  return [...map.values()];
}

async function importNorthstarPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing }) {
  const filenameClient = clientNameFromNorthstarFilename(file_url);
  const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `
Extract portfolio holdings from this Northstar monthly statement PDF.

The statement may be a scanned PDF. Read all pages and extract every individual holding/position/fund line from the holdings, portfolio valuation, portfolio details, asset allocation, or similar statement tables. Do not return summary-only asset-class rows if individual holdings are present.

Important currency rules:
- If a value is shown in a ZAR/Rand/current value column, set currency to ZAR. Never label a ZAR value as USD.
- If a value is shown in a USD/Dollar/current value column, set currency to USD.
- Do not convert values yourself. Extract the number exactly as shown and the currency exactly from the column/section.
- If the same holding appears twice with the same value in both USD and ZAR, keep the ZAR version only.

Extract statement-level fields:
- client_name: the investor/client name. If unclear, use this filename-derived client name: "${filenameClient}".
- account_number: account, portfolio, investor, policy, product, or reference number if shown.
- report_date: valuation/report date in YYYY-MM-DD format if shown.
- reporting_currency: statement reporting currency, usually USD.

For each holding extract:
- holding_name: full fund/security/instrument name.
- asset_class: section/category if shown.
- currency: holding/reporting currency. Use ZAR when the value is shown in Rand/ZAR and USD only when the value is explicitly shown in USD.
- units: units/shares/quantity if shown.
- unit_price: price/NAV if shown.
- market_value: market value in the holding currency, preferring the USD/current value column.
- percent_of_portfolio: percentage allocation if shown.

Return only real holdings with a numeric market_value. Include cash or money market positions if they appear as holdings.

Return JSON exactly in this shape:
{
  "client_name": string,
  "account_number": string,
  "report_date": string,
  "reporting_currency": string,
  "holdings": [
    {
      "holding_name": string,
      "asset_class": string,
      "currency": string,
      "units": number or null,
      "unit_price": number or null,
      "market_value": number,
      "percent_of_portfolio": number or null
    }
  ]
}
`,
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

  const holdings = dedupeNorthstarHoldings(Array.isArray(extracted?.holdings)
    ? extracted.holdings.filter(h => cleanText(h?.holding_name) && parseNumber(h?.market_value) !== 0)
    : []);

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

  const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: fileNameFromUrl(file_url),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: valuations.length,
    rows_imported: valuations.length,
    rows_skipped: 0,
    import_status: 'Imported',
    notes: `Northstar PDF import. Client: ${clientName}. Account: ${accountCode}. USD/ZAR rate: ${usdToZar}.`,
  });

  const created = await bulkCreateValuations(base44, valuations.map(r => ({ ...r, monthly_upload_id: upload.id })), replace_existing, upload_month, 'Northstar');

  const usdTotal = valuations
    .filter(row => String(row.currency || '').toUpperCase() === 'USD')
    .reduce((sum, row) => sum + (row.original_currency_value || 0), 0);
  const zarTotal = valuations.reduce((sum, row) => sum + (row.zar_value || 0), 0);

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, provider = 'Credo', file_url, upload_month, exchange_rate, replace_existing = true } = await req.json();
    if (action === 'capabilities') {
      return Response.json({
        success: true,
        platform: 'Credo',
        northstar_supported: true,
      });
    }

    if (!file_url || !upload_month || !exchange_rate) {
      return Response.json({ error: 'file_url, upload_month, and exchange_rate required' }, { status: 400 });
    }

    if (String(provider).toLowerCase() === 'northstar') {
      return importNorthstarPdf({ base44, user, file_url, upload_month, exchange_rate, replace_existing });
    }

    // Extract PDF content via LLM
    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract from this Credo valuation PDF the client name, account number, and all security holdings.
      
For each holding, extract:
- quantity (numeric)
- security_name (string)
- unit_cost (numeric)
- market_value_usd (numeric - the value in reporting currency USD)

Return as JSON: {
  "client_name": "string",
  "account_number": "string",
  "holdings": [
    {"quantity": number, "security_name": "string", "unit_cost": number, "market_value_usd": number}
  ]
}

Include ALL holdings from all currency sections. If a field is missing or 0, include it as-is.`,
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

    const credoUpload = await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: fileNameFromUrl(file_url),
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: holdings.length,
      rows_imported: holdings.length,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `Credo PDF import. Client: ${client_name}. Account: ${account_number}.`,
    });

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
      monthly_upload_id: credoUpload.id,
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
