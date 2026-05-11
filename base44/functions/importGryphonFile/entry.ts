import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

function cleanText(value) {
  return value == null ? '' : String(value).trim();
}

function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[R,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, upload_month, replace_existing } = await req.json();
    if (!file_url || !upload_month) {
      return Response.json({ error: 'file_url and upload_month are required' }, { status: 400 });
    }

    const fileResp = await fetch(file_url);
    const arrayBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

    const rows = [];
    let skippedRows = 0;

    for (const row of rawRows) {
      const accountCode = cleanText(row['Reference']);
      const portfolioName = cleanText(row['Investor Name']);
      const investmentName = cleanText(row['Asset Group']);
      const value = toNumber(row['Value']);
      const qty = toNumber(row['Qty']);
      const unitPrice = toNumber(row['Unit Price']);
      const fundClass = cleanText(row['Fund Class']);

      // Skip rows with no meaningful data
      if (!accountCode || !investmentName || value == null) {
        skippedRows++;
        continue;
      }

      // Use fund class to distinguish sub-classes (e.g. "Gryphon Dividend Income A")
      const fullInvestmentName = fundClass ? `${investmentName} (Class ${fundClass})` : investmentName;

      rows.push({
        upload_month,
        account_code: accountCode,
        identity_no: row['Entity ID'] != null ? String(row['Entity ID']) : null,
        portfolio_name: portfolioName || null,
        platform: 'Gryphon',
        investment_name: fullInvestmentName,
        currency: 'ZAR',
        month_end_market_value: value,
        original_currency_value: value,
        zar_value: value,
        exchange_rate_to_zar: 1,
        exchange_rate_source: 'ZAR Base Currency',
        conversion_status: 'ZAR Base Currency',
        number_of_units: qty,
        month_end_unit_price: unitPrice,
        has_missing_account_code: !accountCode,
        has_missing_market_value: value === 0 || value == null,
        is_flagged: !accountCode || value == null,
        fee_required: true,
      });
    }

    if (replace_existing) {
      const existing = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month, platform: 'Gryphon' }, '', 5000
      );
      for (const r of existing) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(r.id);
      }
    }

    const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: file_url.split('/').pop(),
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: rawRows.length,
      rows_imported: rows.length,
      rows_skipped: skippedRows,
      import_status: 'Imported',
      notes: `Gryphon Unit Holder Report import. Sheet: ${sheetName}.`,
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
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});