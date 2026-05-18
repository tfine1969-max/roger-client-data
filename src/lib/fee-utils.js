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
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, ' ')
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
  const rowInitialKey = clientInitialAlias(rowTokens);
  if (rowInitialKey && mappingTokens.includes(rowInitialKey)) return 92;
  const [mappingSurname, mappingFirst] = mappingTokens;
  const [rowSurname, rowFirst] = rowTokens;
  if (mappingSurname && rowSurname && mappingSurname === rowSurname) {
    if (mappingFirst && rowFirst && mappingFirst[0] === rowFirst[0]) return 75;
    return 55;
  }

  const overlap = mappingTokens.filter(token => rowTokens.includes(token)).length;
  return overlap ? Math.min(50, overlap * 20) : 0;
}

function clientInitialAlias(tokens) {
  if (tokens.length < 3) return '';
  const surnameParticles = new Set(['de', 'du', 'da', 'van', 'von', 'der', 'den', 'la', 'le']);
  const surnameStart = surnameParticles.has(tokens[tokens.length - 2]) ? tokens.length - 2 : tokens.length - 1;
  const surname = tokens.slice(surnameStart).join('');
  const initials = tokens.slice(0, surnameStart).map(token => token[0]).join('');
  return surname && initials.length > 1 ? `${surname}${initials}` : '';
}

function navMatchScore(mapping, row) {
  const mappedNav = mapping?.navByMonth?.[row.upload_month];
  const rowNav = zarVal(row);
  if (!mappedNav || !rowNav) return 0;

  const denominator = Math.max(Math.abs(mappedNav), Math.abs(rowNav));
  if (!denominator) return 0;
  const variance = Math.abs(mappedNav - rowNav) / denominator;

  if (variance <= 0.0001) return 100;
  if (variance <= 0.001) return 95;
  if (variance <= 0.005) return 85;
  if (variance <= 0.01) return 70;
  if (variance <= 0.03) return 50;
  if (variance <= 0.05) return 30;
  return 0;
}

function providerMatchesMapping(mapping, row) {
  const providerKey = compactFeeText(row.platform);
  const mappingProvider = compactFeeText(mapping.provider);
  return mappingProvider === providerKey || providerKey.includes(mappingProvider) || mappingProvider.includes(providerKey);
}

function investmentMatchesMapping(mapping, row) {
  const investmentKey = compactFeeText(row.investment_name);
  const mappingInvestment = mapping.investmentKey || compactFeeText(mapping.investment);
  return mappingInvestment === investmentKey || investmentKey.includes(mappingInvestment) || mappingInvestment.includes(investmentKey);
}

function findSeededFeeRatesForRow(row, feeMappings = []) {
  const providerRows = feeMappings.filter(mapping => providerMatchesMapping(mapping, row));

  const rebateMatch = providerRows
    .filter(mapping => investmentMatchesMapping(mapping, row) && mapping.rebateAnnualPercent != null)
    .map(mapping => ({
      mapping,
      score: Math.max(
        mapping.investmentKey === compactFeeText(row.investment_name) ? 100 : 80,
        clientMatchScore(mapping.client, row.portfolio_name || '')
      ),
    }))
    .sort((a, b) => b.score - a.score)[0]?.mapping;

  const advisoryMatch = providerRows
    .filter(mapping => mapping.advisoryAnnualPercent != null)
    .map(mapping => ({
      mapping,
      score: clientMatchScore(mapping.client, row.portfolio_name || ''),
    }))
    .filter(item => item.score >= 55)
    .sort((a, b) => b.score - a.score)[0]?.mapping;

  return {
    rebate: rebateMatch?.rebateAnnualPercent,
    advisory: advisoryMatch?.advisoryAnnualPercent,
    rebateMatched: rebateMatch?.rebateAnnualPercent != null,
    advisoryMatched: advisoryMatch?.advisoryAnnualPercent != null,
    rebateMapping: rebateMatch,
    advisoryMapping: advisoryMatch,
  };
}

function rankFeeMapping(mapping, row, fallback) {
  const clientScore = clientMatchScore(mapping.client, row.portfolio_name || '');
  const navScore = navMatchScore(mapping, row);
  return {
    ...mapping,
    matchScore: Math.max(clientScore, navScore),
    clientMatchScore: clientScore,
    navMatchScore: navScore,
    ...(fallback ? { fee_mapping_fallback: fallback } : {}),
  };
}

export function findFeeMappingForRow(row, feeMappings = []) {
  const providerKey = compactFeeText(row.platform);
  const investmentKey = compactFeeText(row.investment_name);
  const providerMatches = mapping => providerMatchesMapping(mapping, row);
  const candidates = feeMappings.filter(mapping => {
    const mappingInvestment = mapping.investmentKey || compactFeeText(mapping.investment);
    const investmentMatches = mappingInvestment === investmentKey || investmentKey.includes(mappingInvestment) || mappingInvestment.includes(investmentKey);
    return providerMatches(mapping) && investmentMatches;
  });

  if (candidates.length === 0) {
    const clientFallback = feeMappings
      .filter(providerMatches)
      .map(mapping => rankFeeMapping(mapping, row, 'Client/provider'))
      .filter(mapping => mapping.clientMatchScore >= 75)
      .sort((a, b) => b.clientMatchScore - a.clientMatchScore || b.navMatchScore - a.navMatchScore)[0];
    if (clientFallback) return clientFallback;

    const equityFallbacks = feeMappings.filter(mapping => {
      return providerMatches(mapping) && (mapping.investmentKey || compactFeeText(mapping.investment)) === 'equities';
    });
    const equityMatch = equityFallbacks
      .map(mapping => rankFeeMapping(mapping, row, 'Equities'))
      .sort((a, b) => b.matchScore - a.matchScore)[0];
    return equityMatch?.matchScore > 0 ? equityMatch : null;
  }
  if (candidates.length === 1) return { ...candidates[0], matchScore: 100 };

  const ranked = candidates
    .map(mapping => rankFeeMapping(mapping, row))
    .sort((a, b) => b.matchScore - a.matchScore);

  return ranked[0]?.matchScore > 0 ? ranked[0] : null;
}

export function findEffectiveFeeConfig(row, feeConfigs = []) {
  const matches = feeConfigs.filter(config => (
    config.account_code === row.account_code &&
    config.platform === row.platform &&
    config.investment_name === row.investment_name &&
    config.effective_from_month &&
    config.effective_from_month <= row.upload_month
  ));
  return matches.sort((a, b) => String(b.effective_from_month || '').localeCompare(String(a.effective_from_month || '')))[0] || null;
}

export function withCalculatedFees(row, feeMappings = [], feeConfigs = []) {
  const config = findEffectiveFeeConfig(row, feeConfigs);
  const seeded = findSeededFeeRatesForRow(row, feeMappings);
  const mapping = findFeeMappingForRow(row, feeMappings);
  const hasStoredRate = row.rebate_fee_annual_percent != null || row.advisory_fee_annual_percent != null;
  const seedMatched = seeded.rebateMatched || seeded.advisoryMatched;
  const source = (seedMatched ? seeded : null) || config || mapping || (hasStoredRate ? row : null);
  const rebate = seeded.rebateMatched
      ? seeded.rebate
      : config
        ? (config.rebate_fee_annual_percent ?? 0)
        : mapping?.rebateAnnualPercent ?? row.rebate_fee_annual_percent ?? 0;
  const advisory = seeded.advisoryMatched
      ? seeded.advisory
      : config
        ? (config.advisory_fee_annual_percent ?? 0)
        : mapping?.advisoryAnnualPercent ?? row.advisory_fee_annual_percent ?? 0;
  const feeBaseZar = zarVal(row);

  // fee_required = true when there's no source at all, OR when a config exists
  // but advisory_fee_annual_percent has never been explicitly set (null = not yet touched).
  // Explicitly setting 0 is valid and clears the flag.
  const advisoryNeverSet = config
    ? !seeded.advisoryMatched && config.advisory_fee_annual_percent == null
    : !seeded.advisoryMatched && !mapping && !hasStoredRate;
  const feeRequired = !source || advisoryNeverSet;

  return {
    ...row,
    ...calcFees(origVal(row), feeBaseZar, rebate, advisory),
    fee_base_zar: feeBaseZar,
    fee_base_source: 'valuation',
    fee_required: feeRequired,
    fee_source: seedMatched ? 'seeded' : config ? 'override' : mapping ? 'mapping' : hasStoredRate ? 'stored' : 'missing',
    fee_mapping_client: seeded.advisoryMapping?.client || mapping?.client,
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
