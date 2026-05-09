import { origVal, zarVal } from '@/lib/valuation-utils';

/**
 * Fee calculation utilities for PortfolioValuation records.
 * All fee percentages are stored as annual percentages (e.g. 0.5 = 0.5% p.a.)
 */

/**
 * Calculate all fee fields for a single valuation row given annual percentages.
 */
export function calcFees(origValue, zarValue, rebateAnnualPct, advisoryAnnualPct) {
  const rebate = rebateAnnualPct ?? 0;
  const advisory = advisoryAnnualPct ?? 0;

  const rebateMonthlyPct = rebate / 12;
  const advisoryMonthlyPct = advisory / 12;

  const rebateOrigCcy = origValue * (rebate / 100) / 12;
  const advisoryOrigCcy = origValue * (advisory / 100) / 12;
  const rebateZar = zarValue * (rebate / 100) / 12;
  const advisoryZar = zarValue * (advisory / 100) / 12;

  return {
    rebate_fee_annual_percent: rebate,
    advisory_fee_annual_percent: advisory,
    rebate_fee_monthly_percent: rebateMonthlyPct,
    advisory_fee_monthly_percent: advisoryMonthlyPct,
    rebate_fee_monthly_amount_original_currency: rebateOrigCcy,
    advisory_fee_monthly_amount_original_currency: advisoryOrigCcy,
    rebate_fee_monthly_amount_zar: rebateZar,
    advisory_fee_monthly_amount_zar: advisoryZar,
    total_monthly_fee_original_currency: rebateOrigCcy + advisoryOrigCcy,
    total_monthly_fee_zar: rebateZar + advisoryZar,
  };
}

/**
 * Build a fee lookup map from FeeConfig records.
 * Key: account_code||platform||investment_name
 */
export function buildFeeMap(feeConfigs) {
  const map = {};
  feeConfigs.forEach(fc => {
    const key = feeKey(fc.account_code, fc.platform, fc.investment_name);
    map[key] = fc;
  });
  return map;
}

export function feeKey(accountCode, platform, investmentName) {
  return `${accountCode}||${platform}||${investmentName}`;
}

export function normalizeFeeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function compactFeeText(value) {
  return normalizeFeeText(value).replace(/[^a-z0-9]+/g, '');
}

function clientMatchScore(mappingClient, rowClient) {
  const mappingKey = compactFeeText(mappingClient);
  const rowKey = compactFeeText(rowClient);
  if (!mappingKey || !rowKey) return 0;
  if (mappingKey === rowKey) return 100;
  if (mappingKey.includes(rowKey) || rowKey.includes(mappingKey)) return 85;

  const mappingTokens = normalizeFeeText(mappingClient).split(' ').filter(Boolean);
  const rowTokens = normalizeFeeText(rowClient).split(' ').filter(Boolean);
  const [mappingSurname, mappingFirst] = mappingTokens;
  const [rowSurname, rowFirst] = rowTokens;
  if (mappingSurname && rowSurname && mappingSurname === rowSurname) {
    if (mappingFirst && rowFirst && mappingFirst[0] === rowFirst[0]) return 75;
    return 55;
  }

  const overlap = mappingTokens.filter(token => rowTokens.includes(token)).length;
  return overlap ? Math.min(50, overlap * 20) : 0;
}

export function findFeeMappingForRow(row, feeMappings = []) {
  const providerKey = compactFeeText(row.platform);
  const investmentKey = compactFeeText(row.investment_name);
  const candidates = feeMappings.filter(mapping => {
    const mappingProvider = compactFeeText(mapping.provider);
    const mappingInvestment = mapping.investmentKey || compactFeeText(mapping.investment);
    const providerMatches = mappingProvider === providerKey || providerKey.includes(mappingProvider) || mappingProvider.includes(providerKey);
    const investmentMatches = mappingInvestment === investmentKey || investmentKey.includes(mappingInvestment) || mappingInvestment.includes(investmentKey);
    return providerMatches && investmentMatches;
  });

  if (candidates.length === 0) {
    const equityFallbacks = feeMappings.filter(mapping => {
      const mappingProvider = compactFeeText(mapping.provider);
      const providerMatches = mappingProvider === providerKey || providerKey.includes(mappingProvider) || mappingProvider.includes(providerKey);
      return providerMatches && (mapping.investmentKey || compactFeeText(mapping.investment)) === 'equities';
    });
    const equityMatch = equityFallbacks
      .map(mapping => ({ ...mapping, matchScore: clientMatchScore(mapping.client, row.portfolio_name || ''), fee_mapping_fallback: 'Equities' }))
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    return equityMatch?.matchScore > 0 ? equityMatch : null;
  }
  if (candidates.length === 1) return { ...candidates[0], matchScore: 100 };

  const rowClient = row.portfolio_name || '';
  const ranked = candidates
    .map(mapping => ({ ...mapping, matchScore: clientMatchScore(mapping.client, rowClient) }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return ranked[0].matchScore > 0 ? ranked[0] : ranked[0];
}

export function findEffectiveFeeConfig(row, feeConfigs = []) {
  const matches = feeConfigs.filter(config => (
    config.account_code === row.account_code &&
    config.platform === row.platform &&
    config.investment_name === row.investment_name &&
    (!config.effective_from_month || config.effective_from_month <= row.upload_month)
  ));
  return matches.sort((a, b) => String(b.effective_from_month || '').localeCompare(String(a.effective_from_month || '')))[0] || null;
}

export function withCalculatedFees(row, feeMappings = [], feeConfigs = []) {
  const config = findEffectiveFeeConfig(row, feeConfigs);
  const mapping = !config ? findFeeMappingForRow(row, feeMappings) : null;
  const hasStoredRate = row.rebate_fee_annual_percent != null || row.advisory_fee_annual_percent != null;
  const source = config || mapping || (hasStoredRate ? row : null);
  const rebate = source?.rebate_fee_annual_percent ?? source?.rebateAnnualPercent ?? 0;
  const advisory = source?.advisory_fee_annual_percent ?? source?.advisoryAnnualPercent ?? 0;

  return {
    ...row,
    ...calcFees(origVal(row), zarVal(row), rebate, advisory),
    fee_required: !source,
    fee_source: config ? 'override' : mapping ? 'mapping' : hasStoredRate ? 'stored' : 'missing',
    fee_mapping_client: mapping?.client,
    fee_mapping_match_score: mapping?.matchScore ?? null,
  };
}

export function feeOptionValues(rows = []) {
  const values = new Set([0, 0.25, 0.4, 0.5, 0.55, 0.65, 0.7, 0.75, 0.79]);
  rows.forEach(row => {
    if (row.rebateAnnualPercent != null) values.add(row.rebateAnnualPercent);
    if (row.advisoryAnnualPercent != null) values.add(row.advisoryAnnualPercent);
  });
  return [...values].sort((a, b) => a - b);
}

/**
 * Apply fee config to a valuation row.
 * Returns a partial update object with all fee fields.
 */
export function applyFeeToRow(row, rebateAnnualPct, advisoryAnnualPct) {
  return {
    ...calcFees(origVal(row), zarVal(row), rebateAnnualPct ?? 0, advisoryAnnualPct ?? 0),
    fee_required: false,
  };
}

/**
 * Summarise fee totals for a set of valuation rows.
 */
export function summariseFees(rows) {
  return rows.reduce((acc, r) => {
    acc.totalRebateZar += r.rebate_fee_monthly_amount_zar ?? 0;
    acc.totalAdvisoryZar += r.advisory_fee_monthly_amount_zar ?? 0;
    acc.totalFeeZar += r.total_monthly_fee_zar ?? 0;
    acc.totalRebateOrig += r.rebate_fee_monthly_amount_original_currency ?? 0;
    acc.totalAdvisoryOrig += r.advisory_fee_monthly_amount_original_currency ?? 0;
    acc.totalFeeOrig += r.total_monthly_fee_original_currency ?? 0;
    return acc;
  }, {
    totalRebateZar: 0, totalAdvisoryZar: 0, totalFeeZar: 0,
    totalRebateOrig: 0, totalAdvisoryOrig: 0, totalFeeOrig: 0,
  });
}
