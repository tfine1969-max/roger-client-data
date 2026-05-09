/**
 * Given all PortfolioValuation records, compute per-investment month-on-month changes.
 * Returns a map: unique_key -> { current, prevValue, prevZarValue, changeValue, changePct, zarChangeValue, zarChangePct, isNew }
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
    const curr = origVal(r);
    const currZar = zarVal(r);
    const prevVal = prev ? origVal(prev) : null;
    const prevZar = prev ? zarVal(prev) : null;
    const changeValue = prevVal !== null ? curr - prevVal : null;
    const changePct = prevVal ? (changeValue / prevVal) * 100 : null;
    const zarChangeValue = prevZar !== null ? currZar - prevZar : null;
    const zarChangePct = prevZar ? (zarChangeValue / prevZar) * 100 : null;
    result[k] = { current: r, prevValue: prevVal, prevZarValue: prevZar, changeValue, changePct, zarChangeValue, zarChangePct, isNew: prevVal === null };
  });

  return result;
}

/**
 * Get the original currency value from a row (prefers original_currency_value, falls back to month_end_market_value)
 */
export function origVal(row) {
  if (!row) return 0;
  return row.original_currency_value ?? row.month_end_market_value ?? 0;
}

/**
 * Get the ZAR value from a row (prefers zar_value, falls back to month_end_market_value)
 */
export function zarVal(row) {
  if (!row) return 0;
  const value = row.original_currency_value ?? row.month_end_market_value ?? 0;
  const currency = String(row.currency || '').toUpperCase();
  const rate = row.exchange_rate_to_zar;
  if (currency && currency !== 'ZAR' && rate) {
    const storedZar = row.zar_value;
    if (storedZar === null || storedZar === undefined || Math.abs(storedZar - value) < 0.01) {
      return value * rate;
    }
  }
  if (row.zar_value !== null && row.zar_value !== undefined) return row.zar_value;
  if (currency && currency !== 'ZAR' && rate) return value * rate;
  return value;
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
 * Format number with currency prefix e.g. "USD 178,149.00"
 */
export function fmtCcy(v, currency, decimals = 2) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const num = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
  return currency ? `${currency} ${num}` : num;
}

/**
 * Summarise valuations for a single client by month — uses ZAR values for totals
 */
export function clientMonthlyTotals(valuations, accountCode) {
  const clientRows = valuations.filter(v => v.account_code === accountCode);
  const months = getSortedMonths(clientRows);
  return months.map(month => ({
    month,
    total: clientRows.filter(v => v.upload_month === month).reduce((s, v) => s + zarVal(v), 0),
  })).reverse(); // chronological for chart
}
