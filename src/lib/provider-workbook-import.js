import { unzipSync, strFromU8 } from 'fflate';
import { base44 } from '@/api/base44Client';

const BATCH_SIZE = 25;

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const cleanText = value => String(value ?? '').trim();
const normalize = value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const parseNumber = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/[$R,\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const annualPercent = value => {
  const parsed = parseNumber(value);
  if (parsed == null) return 0;
  return Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
};

const monthLabel = uploadMonth => {
  const month = Number(String(uploadMonth).split('-')[1]);
  return MONTHS[month - 1] || '';
};

const monthEndDate = uploadMonth => {
  const [year, month] = String(uploadMonth).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const normalPlatform = value => {
  const text = normalize(value);
  if (text.includes('gryphon')) return 'Gryphon';
  if (text.includes('julius')) return 'Julius Baer';
  if (text.includes('northstar')) return 'Northstar';
  if (text.includes('peresec')) return 'Peresec';
  if (text.includes('prescient')) return 'Prescient';
  if (text.includes('credo')) return 'Credo';
  if (text.includes('prime')) return 'Prime';
  return cleanText(value);
};

const generatedAccountCode = (platform, client) => {
  const slug = cleanText(client)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70);
  return `${platform.toUpperCase()}_${slug || 'UNKNOWN'}`;
};

const calcFees = (value, rebateAnnualPercent, advisoryAnnualPercent) => {
  const rebate = value * (rebateAnnualPercent / 100) / 12;
  const advisory = value * (advisoryAnnualPercent / 100) / 12;
  return {
    rebate_fee_annual_percent: rebateAnnualPercent,
    advisory_fee_annual_percent: advisoryAnnualPercent,
    rebate_fee_monthly_percent: rebateAnnualPercent / 12,
    advisory_fee_monthly_percent: advisoryAnnualPercent / 12,
    rebate_fee_monthly_amount_original_currency: rebate,
    advisory_fee_monthly_amount_original_currency: advisory,
    rebate_fee_monthly_amount_zar: rebate,
    advisory_fee_monthly_amount_zar: advisory,
    total_monthly_fee_original_currency: rebate + advisory,
    total_monthly_fee_zar: rebate + advisory,
    fee_required: false,
  };
};

const parseXml = xml => new DOMParser().parseFromString(xml, 'application/xml');

const xmlText = (node, tagName) => node.getElementsByTagName(tagName)[0]?.textContent ?? '';

const columnIndex = ref => {
  const letters = String(ref).match(/[A-Z]+/i)?.[0] || 'A';
  return [...letters.toUpperCase()].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
};

const readEntry = (zip, path) => {
  const bytes = zip[path];
  return bytes ? strFromU8(bytes) : '';
};

const sharedStrings = zip => {
  const xml = readEntry(zip, 'xl/sharedStrings.xml');
  if (!xml) return [];
  return [...parseXml(xml).getElementsByTagName('si')].map(item =>
    [...item.getElementsByTagName('t')].map(node => node.textContent || '').join('')
  );
};

const workbookSheets = zip => {
  const workbook = parseXml(readEntry(zip, 'xl/workbook.xml'));
  const rels = parseXml(readEntry(zip, 'xl/_rels/workbook.xml.rels'));
  const relMap = new Map([...rels.getElementsByTagName('Relationship')].map(rel => [
    rel.getAttribute('Id'),
    rel.getAttribute('Target'),
  ]));

  return [...workbook.getElementsByTagName('sheet')].map(sheet => {
    const relId = sheet.getAttribute('r:id');
    const target = relMap.get(relId) || '';
    return {
      name: sheet.getAttribute('name') || 'Sheet',
      path: target.startsWith('worksheets/') ? `xl/${target}` : `xl/worksheets/${target.split('/').pop()}`,
    };
  });
};

const sheetMatrix = (zip, sheetPath, strings) => {
  const xml = readEntry(zip, sheetPath);
  if (!xml) return [];
  const doc = parseXml(xml);
  const rows = [];

  for (const rowNode of doc.getElementsByTagName('row')) {
    const rowIndex = Number(rowNode.getAttribute('r') || rows.length + 1) - 1;
    rows[rowIndex] = rows[rowIndex] || [];
    for (const cell of rowNode.getElementsByTagName('c')) {
      const colIndex = columnIndex(cell.getAttribute('r'));
      const type = cell.getAttribute('t');
      let value = xmlText(cell, 'v');
      if (type === 's') value = strings[Number(value)] ?? '';
      if (type === 'inlineStr') value = xmlText(cell, 't');
      const parsed = type === 's' || type === 'str' || type === 'inlineStr' ? value : parseNumber(value);
      rows[rowIndex][colIndex] = parsed ?? value;
    }
  }

  return rows;
};

const getCell = (row, headers, candidates) => {
  const index = headers.findIndex(header => candidates.some(candidate => header === candidate || header.includes(candidate)));
  return index >= 0 ? row[index] : null;
};

const sheetMonth = (sheetName, defaultYear = 2026) => {
  const text = normalize(sheetName);
  const aliases = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  const month = aliases[text] || MONTHS.findIndex(monthName => text.includes(monthName)) + 1;
  return month > 0 ? `${defaultYear}-${String(month).padStart(2, '0')}` : '';
};

export async function parseRogerDataWorkbook(file, defaultYear = 2026) {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const strings = sharedStrings(zip);
  const sheets = workbookSheets(zip);
  const rows = [];
  const sheetSummaries = [];

  for (const sheet of sheets) {
    const uploadMonth = sheetMonth(sheet.name, defaultYear);
    if (!uploadMonth) continue;

    const matrix = sheetMatrix(zip, sheet.path, strings);
    const headerIndex = matrix.findIndex(row => {
      const headers = (row || []).map(normalize);
      return headers.includes('client') && headers.some(header => header.includes('investment name')) && headers.some(header => header.includes('service provider'));
    });
    if (headerIndex === -1) continue;

    const headers = matrix[headerIndex].map(normalize);
    let imported = 0;
    let skipped = 0;
    let aum = 0;
    let rebateTotal = 0;
    let advisoryTotal = 0;

    for (const row of matrix.slice(headerIndex + 1)) {
      const client = cleanText(getCell(row || [], headers, ['client']));
      const investmentName = cleanText(getCell(row || [], headers, ['investment name', 'investment']));
      const investmentClass = cleanText(getCell(row || [], headers, ['class']));
      const platform = normalPlatform(getCell(row || [], headers, ['service provider', 'provider', 'platform']));
      const navValue = parseNumber(getCell(row || [], headers, ['nav']));
      if (!client || !investmentName || !platform || navValue == null) {
        skipped += client || investmentName || platform ? 1 : 0;
        continue;
      }

      const rebateAnnualPercent = annualPercent(getCell(row || [], headers, ['rebate']));
      const advisoryAnnualPercent = annualPercent(getCell(row || [], headers, ['advisory fee', 'advisory']));
      const rebateMonthly = parseNumber(getCell(row || [], headers, ['rebates'])) ?? (navValue * (rebateAnnualPercent / 100) / 12);
      const advisoryMonthly = parseNumber(getCell(row || [], headers, ['advisory jan', 'advisory feb', 'advisory mar', 'advisory apr', 'advisory may'])) ?? (navValue * (advisoryAnnualPercent / 100) / 12);
      const accountCode = generatedAccountCode(platform, client);

      rows.push({
        upload_month: uploadMonth,
        account_code: accountCode,
        identity_no: null,
        portfolio_name: client,
        platform,
        source_provider: cleanText(getCell(row || [], headers, ['service provider', 'provider', 'platform'])),
        investment_name: investmentName,
        investment_class: investmentClass,
        currency: 'ZAR',
        month_end_market_value: navValue,
        original_currency_value: navValue,
        exchange_rate_to_zar: 1,
        zar_value: navValue,
        exchange_rate_date: monthEndDate(uploadMonth),
        exchange_rate_source: 'Roger source workbook',
        conversion_status: 'ZAR Source Value',
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
        fee_source: 'roger-source',
        has_missing_account_code: false,
        has_missing_identity_no: true,
        has_missing_market_value: navValue === 0,
        has_unknown_value: /unknown/i.test(`${client} ${investmentName} ${accountCode}`),
        is_duplicate: false,
        is_flagged: false,
      });

      imported += 1;
      aum += navValue;
      rebateTotal += rebateMonthly;
      advisoryTotal += advisoryMonthly;
    }

    sheetSummaries.push({
      sheet: sheet.name,
      upload_month: uploadMonth,
      rows_imported: imported,
      rows_skipped: skipped,
      aum,
      rebate: rebateTotal,
      advisory: advisoryTotal,
    });
  }

  return { rows, sheetSummaries };
}

export async function importRogerDataWorkbook({ file, replaceExisting = false, defaultYear = 2026 }) {
  const { rows, sheetSummaries } = await parseRogerDataWorkbook(file, defaultYear);
  if (rows.length === 0) {
    throw new Error('No Roger source rows found. Expected sheets such as Jan, Feb, March with Client, Investment Name, Service Provider, NAV, Rebate, and Advisory Fee columns.');
  }

  const months = [...new Set(rows.map(row => row.upload_month))];
  if (replaceExisting) {
    for (const month of months) {
      const existing = await base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', 20000);
      for (const row of existing) {
        await base44.entities.PortfolioValuation.delete(row.id);
      }
    }
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(row => base44.entities.PortfolioValuation.create(row)));
  }

  for (const summary of sheetSummaries) {
    await base44.entities.MonthlyUpload.create({
      upload_month: summary.upload_month,
      file_name: file.name,
      upload_date: new Date().toISOString(),
      total_rows: summary.rows_imported + summary.rows_skipped,
      rows_imported: summary.rows_imported,
      rows_skipped: summary.rows_skipped,
      import_status: 'Imported',
      notes: `Roger source workbook import. Sheet: ${summary.sheet}. AUM: ${summary.aum.toFixed(2)}.`,
    });
  }

  return {
    success: true,
    rows_imported: rows.length,
    clients_imported: new Set(rows.map(row => row.account_code || row.portfolio_name).filter(Boolean)).size,
    aum_imported: rows.reduce((sum, row) => sum + row.zar_value, 0),
    sheets_imported: sheetSummaries.map(summary => summary.sheet),
    months_imported: months,
    sheet_summaries: sheetSummaries,
    rows_skipped: sheetSummaries.reduce((sum, summary) => sum + summary.rows_skipped, 0),
  };
}

export async function parseProviderWorkbook(file, uploadMonth, provider) {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const strings = sharedStrings(zip);
  const sheets = workbookSheets(zip);
  const month = monthLabel(uploadMonth);
  const rows = [];

  for (const sheet of sheets) {
    const matrix = sheetMatrix(zip, sheet.path, strings);
    const headerIndex = matrix.findIndex(row => {
      const headers = (row || []).map(normalize);
      return headers.includes('client') && headers.some(header => header.includes('investment name'));
    });
    if (headerIndex === -1) continue;

    const headers = matrix[headerIndex].map(normalize);
    const navCandidates = [`nav ${month}`, month, 'nav'];

    for (const row of matrix.slice(headerIndex + 1)) {
      const client = cleanText(getCell(row || [], headers, ['client']));
      const investmentName = cleanText(getCell(row || [], headers, ['investment name', 'investment']));
      const serviceProvider = normalPlatform(getCell(row || [], headers, ['service provider', 'provider', 'platform'])) || provider;
      if (!client || !investmentName) continue;
      if (normalPlatform(serviceProvider) !== normalPlatform(provider)) continue;

      const navValue = parseNumber(getCell(row || [], headers, navCandidates));
      if (navValue == null) continue;

      const explicitAccountCode = cleanText(getCell(row || [], headers, ['account code', 'account number', 'reference', 'portfolio id']));
      const accountCode = explicitAccountCode || generatedAccountCode(provider, client);
      const rebate = annualPercent(getCell(row || [], headers, ['rebate']));
      const advisory = annualPercent(getCell(row || [], headers, ['advisory fee', 'advisory']));

      rows.push({
        upload_month: uploadMonth,
        account_code: accountCode,
        identity_no: null,
        portfolio_name: client,
        platform: provider,
        investment_name: investmentName,
        currency: 'ZAR',
        month_end_market_value: navValue,
        original_currency_value: navValue,
        exchange_rate_to_zar: 1,
        zar_value: navValue,
        exchange_rate_date: monthEndDate(uploadMonth),
        exchange_rate_source: 'Workbook',
        conversion_status: 'ZAR Base Currency',
        has_missing_account_code: false,
        has_missing_identity_no: true,
        has_missing_market_value: navValue === 0,
        has_unknown_value: /unknown/i.test(`${client} ${investmentName} ${accountCode}`),
        is_duplicate: false,
        is_flagged: navValue === 0 || /unknown/i.test(`${client} ${investmentName} ${accountCode}`),
        ...calcFees(navValue, rebate, advisory),
      });
    }
  }

  return rows;
}

export async function importProviderWorkbook({ file, uploadMonth, provider, replaceExisting }) {
  const rows = await parseProviderWorkbook(file, uploadMonth, provider);
  if (rows.length === 0) {
    throw new Error(`No ${provider} rows found in this workbook for ${monthLabel(uploadMonth)}.`);
  }

  if (replaceExisting) {
    const existing = await base44.entities.PortfolioValuation.filter({ upload_month: uploadMonth, platform: provider }, '-created_date', 20000);
    for (const row of existing) {
      await base44.entities.PortfolioValuation.delete(row.id);
    }
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(row => base44.entities.PortfolioValuation.create(row)));
  }

  await base44.entities.MonthlyUpload.create({
    upload_month: uploadMonth,
    file_name: file.name,
    upload_date: new Date().toISOString(),
    total_rows: rows.length,
    rows_imported: rows.length,
    rows_skipped: 0,
    import_status: 'Imported',
    notes: `${provider} browser workbook import.`,
  });

  return {
    success: true,
    rows_imported: rows.length,
    clients_imported: new Set(rows.map(row => row.account_code || row.portfolio_name).filter(Boolean)).size,
    aum_imported: rows.reduce((sum, row) => sum + (Number(row.zar_value ?? row.month_end_market_value) || 0), 0),
    platform: provider,
  };
}
