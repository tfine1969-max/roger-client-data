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

/**
 * Apply fee config to a valuation row.
 * Returns a partial update object with all fee fields.
 */
export function applyFeeToRow(row, rebateAnnualPct, advisoryAnnualPct) {
  const origValue = row.original_currency_value ?? row.month_end_market_value ?? 0;
  const zarValue = row.zar_value ?? row.month_end_market_value ?? 0;
  return {
    ...calcFees(origValue, zarValue, rebateAnnualPct ?? 0, advisoryAnnualPct ?? 0),
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