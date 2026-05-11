import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as xlsx from 'npm:xlsx@0.18.5';

const BATCH = 50;

function sanitize(str) {
  return typeof str === 'string' ? str.trim() : '';
}

function parseExcelValue(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  return null;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.includes('-') ? val : null;
  if (typeof val === 'number') {
    const epoch = new Date(1900, 0, 1);
    const date = new Date(epoch.getTime() + (val - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  return null;
}

async function bulkCreateValuations(base44, records, replaceExisting, uploadMonth) {
  if (replaceExisting && records.length > 0) {
    let deleted = 0;
    while (true) {
      const toDelete = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month: uploadMonth, platform: 'Gryphon' }, '-created_date', BATCH
      );
      if (!toDelete || toDelete.length === 0) break;
      for (const r of toDelete) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
        deleted++;
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, upload_month, replace_existing } = await req.json();
    if (!file_url || !upload_month) {
      return Response.json({ error: 'file_url and upload_month required' }, { status: 400 });
    }

    const fileRes = await fetch(file_url);
    const buffer = await fileRes.arrayBuffer();
    const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return Response.json({ error: 'No sheet found in workbook' }, { status: 400 });
    }

    const rows = xlsx.utils.sheet_to_json(sheet);
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data rows found' }, { status: 400 });
    }

    const valuations = [];
    for (const row of rows) {
      const accountCode = sanitize(String(row['Reference'] || row['Entity ID'] || ''));
      const investorName = sanitize(row['Investor Name'] || '');
      const fundCode = sanitize(row['Code'] || '');
      const assetGroup = sanitize(row['Asset Group'] || '');

      if (!accountCode || !investorName || !fundCode) continue;

      const qty = parseExcelValue(row['Qty']);
      const unitPrice = parseExcelValue(row['Unit Price']);
      const value = parseExcelValue(row['Value']);
      const priceDate = parseExcelDate(row['Price Date']);

      valuations.push({
        upload_month: upload_month,
        account_code: accountCode,
        portfolio_name: investorName,
        platform: 'Gryphon',
        investment_name: fundCode || assetGroup,
        currency: 'ZAR',
        original_currency_value: value,
        exchange_rate_to_zar: 1,
        zar_value: value,
        exchange_rate_date: priceDate,
        exchange_rate_source: 'N/A',
        conversion_status: 'ZAR Base Currency',
        number_of_units: qty,
        month_end_unit_price: unitPrice,
      });
    }

    const created = await bulkCreateValuations(base44, valuations, replace_existing, upload_month);

    return Response.json({
      success: true,
      rows_imported: created,
      upload_month,
      file_name: file_url.split('/').pop(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});