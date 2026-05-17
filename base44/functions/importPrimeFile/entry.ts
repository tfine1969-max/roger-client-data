import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

const BATCH = 50;

function cleanText(value) {
  return value == null ? '' : String(value).trim();
}

function headerKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getValue(row, candidates) {
  for (const candidate of candidates) {
    const value = row[headerKey(candidate)];
    if (value != null && value !== '') return value;
  }
  return null;
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
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
}

function rowHasHeader(row) {
  return row.some(cell => {
    const key = headerKey(cell);
    return key === 'investor' || key === 'accountnumber';
  });
}

async function bulkCreate(entity, records, delayMs = 300) {
  for (let i = 0; i < records.length; i += BATCH) {
    await entity.bulkCreate(records.slice(i, i + BATCH));
    if (i + BATCH < records.length) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

Deno.serve(async (req) => {
  try {
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
    if (!fileResp.ok) {
      return Response.json({ error: `Could not download uploaded file (${fileResp.status}).` }, { status: 400 });
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const rawRows = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      if (!matrix || matrix.length < 2) continue;

      const headerIndex = matrix.findIndex(rowHasHeader);
      if (headerIndex === -1) continue;

      const headers = matrix[headerIndex].map(value => cleanText(value));
      for (const values of matrix.slice(headerIndex + 1)) {
        const row = {};
        headers.forEach((header, index) => {
          if (header) row[headerKey(header)] = values[index] ?? null;
        });

        const investor = cleanText(getValue(row, ['Investor', 'Client', 'Client name']));
        const accountNumber = cleanText(getValue(row, ['Account number', 'Instrument account numbers', 'Instrument account number']));
        const instrumentName = cleanText(getValue(row, ['Instrument name', 'Instrument Name', 'Investment name', 'Investment']));
        if ((!investor && !accountNumber) || !instrumentName) continue;
        rawRows.push(row);
      }
    }

    if (rawRows.length === 0) {
      return Response.json({
        error: 'No Prime holding rows found. Check that the sheet has Investor, Account number, Instrument name, and Value columns.',
      }, { status: 400 });
    }

    const records = rawRows.map(row => ({
      upload_month,
      date_of_report: toDateStr(getValue(row, ['Date of report', 'Report date'])),
      account_number: cleanText(getValue(row, ['Account number', 'Instrument account numbers', 'Instrument account number'])),
      investor: cleanText(getValue(row, ['Investor', 'Client', 'Client name'])),
      id_number: cleanText(getValue(row, ['ID Number', 'ID number', 'Identity number', 'Registration number'])),
      product: cleanText(getValue(row, ['Product'])),
      status: cleanText(getValue(row, ['Status'])),
      instrument_code: cleanText(getValue(row, ['Instrument code', 'Investment code'])),
      instrument_name: cleanText(getValue(row, ['Instrument name', 'Investment name', 'Investment'])),
      percent_of_account: toNumber(getValue(row, ['% of account', 'Percent of account'])),
      currency: cleanText(getValue(row, ['Preferred Currency', 'Currency'])) || 'ZAR',
      market_value: toNumber(getValue(row, ['Value', 'Market Value in System Currency', 'Market value'])),
      units: toNumber(getValue(row, ['Units'])),
      price: toNumber(getValue(row, ['Price'])),
      price_date: toDateStr(getValue(row, ['Price Date'])),
      adviser: cleanText(getValue(row, ['Adviser', 'Advisor'])),
    })).filter(row => row.account_number && row.instrument_name && row.market_value != null);

    if (records.length === 0) {
      return Response.json({
        error: 'Prime rows were found, but none had Account number, Instrument name, and Value populated.',
      }, { status: 400 });
    }

    if (replace_existing) {
      const existing = await base44.asServiceRole.entities.PrimeHolding.filter({ upload_month }, '', 5000);
      for (const rec of existing) {
        await base44.asServiceRole.entities.PrimeHolding.delete(rec.id);
      }

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

    await bulkCreate(base44.asServiceRole.entities.PrimeHolding, records, 300);

    const pvRecords = records.map(row => applyClientMergeRules({
      upload_month,
      account_code: row.account_number,
      portfolio_name: row.investor,
      identity_no: row.id_number,
      platform: 'Prime',
      investment_name: row.instrument_name,
      currency: row.currency || 'ZAR',
      original_currency_value: row.market_value,
      exchange_rate_to_zar: 1,
      zar_value: row.market_value,
      conversion_status: 'ZAR Base Currency',
      number_of_units: row.units,
      month_end_unit_price: row.price,
      month_end_market_value: row.market_value,
      has_missing_account_code: !row.account_number,
      has_missing_identity_no: !row.id_number,
      has_missing_market_value: !row.market_value,
      is_duplicate: false,
      is_flagged: !row.account_number || !row.id_number,
    }, mergeRules));

    await bulkCreate(base44.asServiceRole.entities.PortfolioValuation, pvRecords, 500);

    return Response.json({
      success: true,
      rows_imported: records.length,
      upload_month,
    });
  } catch (err) {
    console.error('importPrimeFile failed', err);
    return Response.json({
      success: false,
      error: err?.message || 'Prime import failed unexpectedly.',
    }, { status: 500 });
  }
});