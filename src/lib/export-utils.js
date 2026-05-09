import { fmtNum, formatMonth } from './valuation-utils';

/**
 * Export data as CSV and trigger browser download.
 */
export function downloadCSV(filename, headers, rows) {
  const escape = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export client fund table as CSV
 */
export function exportClientFundCSV(client, investments, month) {
  const headers = ['Platform', 'Investment Name', 'Currency', 'Market Value', 'Units', 'Unit Price'];
  const rows = investments.map(r => [
    r.platform,
    r.investment_name,
    r.currency,
    r.month_end_market_value,
    r.number_of_units,
    r.month_end_unit_price,
  ]);
  downloadCSV(`${client}_${month}_funds.csv`, headers, rows);
}

/**
 * Export full monthly valuation as CSV
 */
export function exportFullMonthlyCSV(valuations, month) {
  const headers = [
    'Portfolio ID', 'Account Code', 'Identity No', 'Portfolio Name',
    'Platform', 'Investment Name', 'Currency',
    'Market Value', 'Units', 'Unit Price'
  ];
  const rows = valuations.map(r => [
    r.portfolio_id, r.account_code, r.identity_no, r.portfolio_name,
    r.platform, r.investment_name, r.currency,
    r.month_end_market_value, r.number_of_units, r.month_end_unit_price,
  ]);
  downloadCSV(`Monthly_Valuation_${month}.csv`, headers, rows);
}