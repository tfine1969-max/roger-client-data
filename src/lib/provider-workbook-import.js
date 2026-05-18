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
  if (text.includes('peresec')) return 'Peresec';
  if (text.includes('prescient')) return 'Prescient';
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
    const existing = await base44.entities.PortfolioValuation.filter({ upload_month: uploadMonth, platform: provider }, '-created_date', 5000);
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
