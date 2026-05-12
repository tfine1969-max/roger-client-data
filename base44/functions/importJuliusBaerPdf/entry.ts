import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

/**
 * Parses a Julius Baer PDF valuation report (text extracted via LLM)
 * and imports holdings into PortfolioValuation.
 *
 * Expected payload:
 *   file_url        - uploaded PDF URL
 *   upload_month    - "YYYY-MM"
 *   exchange_rate   - USD→ZAR rate (number, required)
 *   replace_existing - boolean
 */

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalizeJuliusRelationshipNo(value: unknown) {
  const text = cleanText(value);
  if (!text || /^pri/i.test(text)) return '';

  const dotted = text.match(/\b(\d{4})\.(\d{4})\b/);
  if (dotted) return `${dotted[1]}.${dotted[2]}`;

  const compact = text.replace(/\D/g, '');
  if (compact.length >= 8) return `${compact.slice(0, 4)}.${compact.slice(4, 8)}`;
  return '';
}

function relationshipNoFromFileUrl(fileUrl: string) {
  try {
    const filename = decodeURIComponent(fileUrl.split('/').pop() || '');
    return normalizeJuliusRelationshipNo(filename);
  } catch (_error) {
    return normalizeJuliusRelationshipNo(fileUrl);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { file_url, upload_month, exchange_rate, replace_existing } = body;

  if (!file_url || !upload_month) {
    return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
  }

  const usdToZar = Number(exchange_rate);
  if (!usdToZar || usdToZar <= 0) {
    return Response.json({ error: 'A valid exchange_rate (USD to ZAR) is required' }, { status: 400 });
  }

  // Use LLM to extract structured holdings from the PDF
  const extractionPrompt = `
You are extracting investment holdings data from a Julius Baer portfolio valuation PDF.

Extract ALL individual position/holding lines from the "Positions" section pages 
(Cash & Short-Term Investments, Equities & similar positions, Alternative Investments, Other funds & investment products).

Also extract the following from the report header:
- client_name: full client name (e.g. "MR MARC HOAR")
- portfolio_no: portfolio number (e.g. "0315.2553 02.01")
- relationship_no: relationship number (e.g. "0315.2553")
- report_date: date of valuation in YYYY-MM-DD format
- currency: reporting currency (e.g. "USD")

For each holding line extract:
- instrument_name: full instrument name (e.g. "UNITS GLOBAL X COPPER MINERS ETF")
- isin: ISIN code if present
- security_no: security number if present
- asset_class: the section it belongs to (e.g. "Cash & Short-Term Investments", "Equities & similar positions", "Alternative Investments", "Other funds & investment products")
- currency: currency of the holding (e.g. "USD")
- quantity: number of units/quantity (numeric)
- current_price: current unit price (numeric)
- price_date: price date in YYYY-MM-DD
- market_value: market value in the holding's currency (numeric, the value labeled "Market Value" or "Total Value" for cash)
- percent_of_nav: percentage of NAV (numeric, without the % sign)

Return a JSON object with this exact schema:
{
  "client_name": string,
  "portfolio_no": string,
  "relationship_no": string,
  "report_date": string,
  "currency": string,
  "holdings": [
    {
      "instrument_name": string,
      "isin": string or null,
      "security_no": string or null,
      "asset_class": string,
      "currency": string,
      "quantity": number or null,
      "current_price": number or null,
      "price_date": string or null,
      "market_value": number,
      "percent_of_nav": number or null
    }
  ]
}
`;

  const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: extractionPrompt,
    file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        portfolio_no: { type: 'string' },
        relationship_no: { type: 'string' },
        report_date: { type: 'string' },
        currency: { type: 'string' },
        holdings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              instrument_name: { type: 'string' },
              isin: { type: ['string', 'null'] },
              security_no: { type: ['string', 'null'] },
              asset_class: { type: 'string' },
              currency: { type: 'string' },
              quantity: { type: ['number', 'null'] },
              current_price: { type: ['number', 'null'] },
              price_date: { type: ['string', 'null'] },
              market_value: { type: 'number' },
              percent_of_nav: { type: ['number', 'null'] },
            },
          },
        },
      },
    },
  });

  if (!extracted || !extracted.holdings || extracted.holdings.length === 0) {
    return Response.json({ error: 'Could not extract holdings from PDF', raw: extracted }, { status: 400 });
  }

  const accountCode =
    relationshipNoFromFileUrl(file_url) ||
    normalizeJuliusRelationshipNo(extracted.relationship_no) ||
    normalizeJuliusRelationshipNo(extracted.portfolio_no) ||
    'JB_UNKNOWN';
  const portfolioName = extracted.client_name || 'Unknown';
  const platform = 'Julius Baer';
  const mergeRules = await loadClientMergeRules(base44);

  // Delete existing records for this specific client+month if replacing
  if (replace_existing) {
    const existing = await base44.asServiceRole.entities.PortfolioValuation.filter({ upload_month, platform, account_code: accountCode }, '', 5000);
    for (const rec of existing) {
      await base44.asServiceRole.entities.PortfolioValuation.delete(rec.id);
    }
  }

  const rows = extracted.holdings.map(h => {
    const origValue = h.market_value ?? 0;
    const currency = (h.currency || extracted.currency || 'USD').toUpperCase();
    const zarValue = currency === 'ZAR' ? origValue : origValue * usdToZar;

    return applyClientMergeRules({
      upload_month,
      account_code: accountCode,
      portfolio_name: portfolioName,
      platform,
      investment_name: h.instrument_name,
      currency,
      original_currency_value: origValue,
      month_end_market_value: origValue,
      number_of_units: h.quantity ?? null,
      month_end_unit_price: h.current_price ?? null,
      exchange_rate_to_zar: currency === 'ZAR' ? 1 : usdToZar,
      zar_value: zarValue,
      exchange_rate_date: extracted.report_date ?? null,
      exchange_rate_source: 'Manual Upload Rate',
      conversion_status: currency === 'ZAR' ? 'ZAR Base Currency' : 'Converted',
      has_missing_account_code: false,
      has_missing_identity_no: true,
      has_missing_market_value: origValue === 0,
      is_duplicate: false,
      is_flagged: origValue === 0,
    }, mergeRules);
  });

  const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
    upload_month,
    file_name: file_url.split('/').pop(),
    upload_date: new Date().toISOString(),
    uploaded_by: user.email,
    total_rows: rows.length,
    rows_imported: rows.length,
    rows_skipped: 0,
    import_status: 'Imported',
    notes: `Julius Baer PDF import. Client: ${portfolioName}. Portfolio: ${extracted.portfolio_no}. USD/ZAR rate: ${usdToZar}.`,
  });

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, monthly_upload_id: upload.id }));
    await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
  }

  return Response.json({
    success: true,
    rows_imported: rows.length,
    upload_id: upload.id,
    client_name: portfolioName,
    portfolio_no: extracted.portfolio_no,
    relationship_no: accountCode,
    account_code: accountCode,
    exchange_rate_used: usdToZar,
    holdings_extracted: extracted.holdings.map(h => ({
      instrument: h.instrument_name,
      usd_value: h.market_value,
      zar_value: h.market_value * usdToZar,
    })),
  });
});
