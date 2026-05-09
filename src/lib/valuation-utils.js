/**
 * Given all PortfolioValuation records, compute per-investment month-on-month changes.
 * Returns a map: unique_key (without month) -> { current, prev, changeValue, changePct, isNew }
 */
export function computeChanges(valuations, currentMonth, prevMonth) {
  const result = {};
  const currentRows = valuations.filter(v => v.upload_month === currentMonth);
  const prevRows = valuations.filter(v => v.upload_month === prevMonth);

  const prevMap = {};
  prevRows.forEach(r => {
    const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
    prevMap[k] = r;
  });

  currentRows.forEach(r => {
    const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
    const prev = prevMap[k];
    const curr = r.month_end_market_value ?? 0;
    const prevVal = prev ? (prev.month_end_market_value ?? 0) : null;
    const changeValue = prevVal !== null ? curr - prevVal : null;
    const changePct = prevVal ? (changeValue / prevVal) * 100 : null;
    result[k] = { current: r, prevValue: prevVal, changeValue, changePct, isNew: prevVal === null };
  });

  return result;
}

/**
 * Get sorted unique months from valuations array (descending).
 */
export function getSortedMonths(valuations) {
  return [...new Set(valuations.map(v => v.upload_month))].sort((a, b) => b.localeCompare(a));
}

/**
 * Format YYYY-MM as "Jan 2026"
 */
export function formatMonth(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
}

/**
 * Format number as locale string with 2 decimals
 */
export function fmtNum(v, decimals = 2) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

/**
 * Summarise valuations for a single client by month
 */
export function clientMonthlyTotals(valuations, accountCode) {
  const clientRows = valuations.filter(v => v.account_code === accountCode);
  const months = getSortedMonths(clientRows);
  return months.map(month => ({
    month,
    total: clientRows.filter(v => v.upload_month === month).reduce((s, v) => s + (v.month_end_market_value || 0), 0),
  })).reverse(); // chronological for chart
}