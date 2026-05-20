const MAPPING_KEY = 'fund_master_mappings_v1';
const EXTRA_MASTER_KEY = 'fund_master_extra_v1';

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function getFundMappings() {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getExtraMasterFunds() {
  try {
    return JSON.parse(localStorage.getItem(EXTRA_MASTER_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Resolve a provider instrument name to its canonical master fund name.
 * Falls back to the raw name if no mapping exists.
 */
export function resolveInvestmentName(platform, investmentName) {
  const mappings = getFundMappings();
  const key = `${clean(platform)}||${clean(investmentName)}`;
  return mappings[key] || investmentName;
}

/**
 * Apply fund name mappings to an array of holding objects.
 * Holdings with { investment, currency } shape (monthlyClientData format).
 * Holdings with the same resolved name + currency are merged (values summed).
 */
export function mergeHoldingsByMapping(holdings, platform) {
  const mappings = getFundMappings();
  const merged = {};

  for (const h of holdings) {
    const rawKey = `${clean(platform)}||${clean(h.investment)}`;
    const canonicalName = mappings[rawKey] || h.investment;
    const mergeKey = `${canonicalName}||${h.currency}`;

    if (!merged[mergeKey]) {
      merged[mergeKey] = { ...h, investment: canonicalName, _rawNames: [h.investment] };
    } else {
      merged[mergeKey].nativeValue = (merged[mergeKey].nativeValue || 0) + (h.nativeValue || 0);
      merged[mergeKey].zarValue = (merged[mergeKey].zarValue || 0) + (h.zarValue || 0);
      merged[mergeKey]._rawNames.push(h.investment);
    }
  }

  return Object.values(merged);
}

/**
 * Apply fund name mappings to rogerSourceRows-style rows (investment_name field).
 * Returns rows with investment_name replaced by the canonical master fund name.
 */
export function applyMappingsToRows(rows) {
  const mappings = getFundMappings();
  if (!Object.keys(mappings).length) return rows;
  return rows.map(row => {
    const key = `${clean(row.platform)}||${clean(row.investment_name)}`;
    const canonical = mappings[key];
    if (!canonical || canonical === row.investment_name) return row;
    return { ...row, investment_name: canonical };
  });
}

/**
 * Check whether any fund mappings are currently saved.
 */
export function hasFundMappings() {
  return Object.keys(getFundMappings()).length > 0;
}

/**
 * Apply FundMergeRule DB records to rows — same as applyMappingsToRows but
 * takes the rules array as an argument so callers can include it as a proper
 * React useMemo dependency (avoiding stale-closure issues with localStorage).
 */
export function applyRulesToRows(rows, rules = []) {
  if (!rules.length) return applyMappingsToRows(rows); // fall back to localStorage
  const map = {};
  rules.forEach(rule => {
    if (!rule.source_name || !rule.canonical_name || rule.platform === '__extra_master__') return;
    const key = `${clean(rule.platform || 'Unknown')}||${clean(rule.source_name)}`;
    map[key] = rule.canonical_name;
  });
  // Also merge in any localStorage mappings not yet in DB
  const local = getFundMappings();
  Object.entries(local).forEach(([k, v]) => { if (!map[k]) map[k] = v; });
  if (!Object.keys(map).length) return rows;
  return rows.map(row => {
    const key = `${clean(row.platform)}||${clean(row.investment_name)}`;
    const canonical = map[key];
    if (!canonical || canonical === row.investment_name) return row;
    return { ...row, investment_name: canonical };
  });
}
