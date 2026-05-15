import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { applyClientMergeRules, loadClientMergeRules } from '../_shared/clientMergeRules.ts';

function cleanText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/[$R,\s]/g, '')
    .replace(/[()]/g, match => (match === '(' ? '-' : ''))
    .replace(/\)$/g, '');
  const parsed = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function excelDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + value * 86400000);
  }
  const parsed = new Date(cleanText(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthEnd(uploadMonth: string) {
  const [year, month] = uploadMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0, 23, 59, 59));
}

function normaliseHeader(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fileParts(fileUrl: string) {
  const filename = decodeURIComponent((fileUrl.split('/').pop() || '').split('?')[0]);
  const parts = filename.replace(/\.(xlsx|xls)$/i, '').split(' - ').map(part => part.trim());
  return {
    filename,
    accountCode: parts[0] || 'PRESCIENT_UNKNOWN',
    clientName: parts[1] || 'Prescient Client',
  };
}

function findLabelValue(matrix: unknown[][], labels: string[]) {
  for (const row of matrix) {
    for (let index = 0; index < row.length; index += 1) {
      const cell = normaliseHeader(row[index]);
      if (!labels.some(label => cell.includes(label))) continue;
      for (let offset = 1; offset <= 3; offset += 1) {
        const value = cleanText(row[index + offset]);
        if (value) return value;
      }
    }
  }
  return '';
}

function findBestLabelledValue(matrix: unknown[][]) {
  const labelWeights = [
    { labels: ['closing market value', 'market value', 'total market value'], weight: 100 },
    { labels: ['daily valuation', 'portfolio value', 'valuation'], weight: 80 },
    { labels: ['current value', 'total value', 'balance'], weight: 60 },
  ];
  const candidates: Array<{ value: number; score: number }> = [];

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const label = normaliseHeader(row[colIndex]);
      const match = labelWeights.find(group => group.labels.some(item => label.includes(item)));
      if (!match) continue;

      const nearby = [
        ...row.slice(colIndex + 1, colIndex + 6),
        ...(matrix[rowIndex + 1] || []).slice(colIndex, colIndex + 6),
      ];
      for (const valueCell of nearby) {
        const value = toNumber(valueCell);
        if (value != null) {
          candidates.push({ value, score: match.weight + Math.min(Math.abs(value) / 1_000_000, 20) });
        }
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score)[0]?.value ?? null;
}

function largestCurrencyValue(matrix: unknown[][]) {
  const values: number[] = [];
  for (const row of matrix) {
    for (const cell of row) {
      const value = toNumber(cell);
      if (value != null && Math.abs(value) > 1000) values.push(value);
    }
  }
  return values.sort((a, b) => Math.abs(b) - Math.abs(a))[0] ?? null;
}

function extractValuationRows(sheet: XLSX.WorkSheet, uploadMonth: string, fallbackInvestment: string) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as unknown[][];
  const cutoff = monthEnd(uploadMonth);
  const fallbackDate = cutoff;
  const investmentName =
    findLabelValue(matrix, ['fund name', 'portfolio name', 'product name', 'instrument']) ||
    fallbackInvestment;

  const candidates: Array<{
    date: Date;
    value: number;
    units: number | null;
    price: number | null;
    investment: string;
  }> = [];
  for (let headerIndex = 0; headerIndex < matrix.length; headerIndex += 1) {
    const headers = matrix[headerIndex].map(normaliseHeader);
    const dateIndex = headers.findIndex(header => ['date', 'valuation date', 'price date'].some(label => header === label || header.includes(label)));
    const valueLabels = ['market value', 'closing value', 'current value', 'total value', 'balance', 'value', 'valuation'];
    const valueIndex = headers.findIndex((header, index) =>
      index !== dateIndex && valueLabels.some(label => header === label || header.includes(label))
    );
    if (dateIndex === -1 || valueIndex === -1) continue;

    const unitsIndex = headers.findIndex(header => ['units', 'number of units', 'quantity'].some(label => header.includes(label)));
    const priceIndex = headers.findIndex(header => ['unit price', 'nav price', 'price'].some(label => header.includes(label)));
    const fundIndex = headers.findIndex(header => ['fund', 'portfolio', 'instrument', 'product'].some(label => header.includes(label)));

    for (const row of matrix.slice(headerIndex + 1)) {
      const date = excelDate(row[dateIndex]);
      const value = toNumber(row[valueIndex]);
      if (!date || value == null || date > cutoff) continue;
      candidates.push({
        date,
        value,
        units: unitsIndex >= 0 ? toNumber(row[unitsIndex]) : null,
        price: priceIndex >= 0 ? toNumber(row[priceIndex]) : null,
        investment: (fundIndex >= 0 ? cleanText(row[fundIndex]) : '') || investmentName,
      });
    }
  }

  const datedRows = candidates
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 1);
  if (datedRows.length > 0) return datedRows;

  const labelledValue = findBestLabelledValue(matrix);
  const fallbackValue = labelledValue ?? largestCurrencyValue(matrix);
  if (fallbackValue == null) return [];

  return [{
    date: fallbackDate,
    value: fallbackValue,
    units: null,
    price: null,
    investment: investmentName,
  }];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, upload_month, password, replace_existing } = await req.json();
    if (!file_url || !upload_month || !password) {
      return Response.json({ error: 'file_url, upload_month, and password are required' }, { status: 400 });
    }

    const { filename, accountCode, clientName } = fileParts(file_url);
    const fileResp = await fetch(file_url);
    const arrayBuffer = await fileResp.arrayBuffer();

    let workbook;
    try {
      workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: 'array',
        cellDates: true,
        password: cleanText(password),
      });
    } catch (error) {
      return Response.json({
        error: `Could not open Prescient workbook. Check the password or save the workbook as an unprotected .xlsx. ${error instanceof Error ? error.message : ''}`,
      }, { status: 400 });
    }

    const mergeRules = await loadClientMergeRules(base44);
    const rows = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const valuations = extractValuationRows(sheet, upload_month, sheetName || 'Prescient Valuation');
      for (const valuation of valuations) {
        rows.push(applyClientMergeRules({
          upload_month,
          account_code: accountCode,
          identity_no: null,
          portfolio_name: clientName,
          platform: 'Prescient',
          investment_name: valuation.investment || sheetName || 'Prescient Valuation',
          currency: 'ZAR',
          month_end_market_value: valuation.value,
          original_currency_value: valuation.value,
          zar_value: valuation.value,
          number_of_units: valuation.units,
          month_end_unit_price: valuation.price,
          exchange_rate_to_zar: 1,
          exchange_rate_source: 'ZAR Base Currency',
          conversion_status: 'ZAR Base Currency',
          exchange_rate_date: valuation.date.toISOString().slice(0, 10),
          has_missing_account_code: !accountCode,
          has_missing_identity_no: true,
          has_missing_market_value: valuation.value === 0,
          has_unknown_value: false,
          is_flagged: valuation.value === 0,
        }, mergeRules));
      }
    }

    if (rows.length === 0) {
      return Response.json({ error: 'No valuation rows were found in the Prescient workbook' }, { status: 400 });
    }

    if (replace_existing) {
      const existing = await base44.asServiceRole.entities.PortfolioValuation.filter(
        { upload_month, platform: 'Prescient', account_code: accountCode }, '', 5000
      );
      for (const rec of existing) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(rec.id);
      }
    }

    const upload = await base44.asServiceRole.entities.MonthlyUpload.create({
      upload_month,
      file_name: filename,
      upload_date: new Date().toISOString(),
      uploaded_by: user.email,
      total_rows: rows.length,
      rows_imported: rows.length,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `Prescient workbook import. Client: ${clientName}. Account: ${accountCode}.`,
    });

    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(row => ({ ...row, monthly_upload_id: upload.id }));
      await base44.asServiceRole.entities.PortfolioValuation.bulkCreate(batch);
    }

    return Response.json({
      success: true,
      rows_imported: rows.length,
      upload_id: upload.id,
      account_code: accountCode,
      client_name: clientName,
      sheets_imported: workbook.SheetNames,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Prescient import failed' }, { status: 500 });
  }
});
