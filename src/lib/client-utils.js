export function normalizeClientText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function clientKey(row) {
  const identity = String(row?.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (identity) return `id-${identity}`;
  const name = normalizeClientText(row?.portfolio_name || '').replace(/[^a-z0-9]+/g, '');
  return name ? `name-${name}` : `account-${row?.account_code || 'unknown'}`;
}

export function clientDisplayName(rows = []) {
  return rows.find(row => row.portfolio_name)?.portfolio_name || 'Unknown Client';
}

export function hasUnknownValue(value) {
  return String(value ?? '').toLowerCase().includes('unknown');
}

export function rowHasUnknown(row) {
  return [
    row?.account_code,
    row?.identity_no,
    row?.portfolio_name,
    row?.platform,
    row?.investment_name,
    row?.currency,
  ].some(hasUnknownValue);
}
