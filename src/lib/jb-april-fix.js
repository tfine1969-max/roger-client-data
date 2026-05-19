/**
 * One-time correction for April 2026 Julius Baer data.
 * Matches DB rows to the control sheet by NAV value, then updates:
 *   - investment_name  (corrected to exact seed name so fee matching works)
 *   - zar_value / month_end_market_value  (authoritative April NAV)
 *   - rebate_fee_annual_percent / advisory_fee_annual_percent  (from control sheet)
 */

import { base44 } from '@/api/base44Client';

// Source of truth: Julius Baer Control Sheet April 2026
// rebate and advisory are annual percentages (0.5 = 0.5% p.a.)
const CONTROL_SHEET = [
  // De Mey, Armelle
  { client: 'De Mey, Armelle', investment: 'Julius Baer Trading Account',              nav: 272368.10,     rebate: 0,    advisory: 0.5  },
  { client: 'De Mey, Armelle', investment: 'Blackrock ICS US Dollar Liquidity Fund',   nav: 6949622.67,    rebate: 0,    advisory: 0.5  },
  { client: 'De Mey, Armelle', investment: 'Rubrics Enhanced Yield UCITS Fund',        nav: 7777346.56,    rebate: 0.25, advisory: 0.5  },
  { client: 'De Mey, Armelle', investment: 'Wealthworks Global Flexible Fund',         nav: 98711769.63,   rebate: 0.5,  advisory: 0.5  },
  { client: 'De Mey, Armelle', investment: 'Diversified Trading Fund B1',              nav: 5022712.72,    rebate: 0.5,  advisory: 0.5  },
  { client: 'De Mey, Armelle', investment: 'Xhaos Special Opportunities Fund',         nav: 2396436.65,    rebate: 0,    advisory: 0.5  },
  // De Mey, Katinga
  { client: 'De Mey, Katinga', investment: 'Julius Baer Trading Account',              nav: 9630540.124,   rebate: 0,    advisory: 0.5  },
  { client: 'De Mey, Katinga', investment: 'Blackrock ICS US Dollar Liquidity Fund',   nav: 9383722.784,   rebate: 0,    advisory: 0.5  },
  { client: 'De Mey, Katinga', investment: 'Rubrics Enhanced Yield UCITS Fund',        nav: 6787191.626,   rebate: 0.25, advisory: 0.5  },
  { client: 'De Mey, Katinga', investment: 'Wealthworks Global Flexible Fund',         nav: 2439485.406,   rebate: 0.5,  advisory: 0.5  },
  { client: 'De Mey, Katinga', investment: 'Xhaos Special Opportunities Fund',         nav: 5862726.981,   rebate: 0,    advisory: 0.5  },
  // Hoar, M Mr
  { client: 'Hoar, M Mr', investment: 'Julius Baer Trading Account',                  nav: 267720.98,     rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Dodge & Cox Worldwide Funds',                  nav: 285000.88,     rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Global X Copper Miners ETF',                   nav: 1128561.88,    rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Invesco Global Clean Energy ETF',              nav: 272116.45,     rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Wealthworks Global Flexible Fund',             nav: 22693220.30,   rebate: 0.5,  advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Diversified Trading Fund B1',                  nav: 3869422.13,    rebate: 0.5,  advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Xhaos Special Opportunities Fund',             nav: 2402493.00,    rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Gold',                                         nav: 632561.70,     rebate: 0,    advisory: 0.75 },
  { client: 'Hoar, M Mr', investment: 'Prescient China Balanced Fund',                nav: 1176559.73,    rebate: 0,    advisory: 0.75 },
  // Hughes, Carol Violet
  { client: 'Hughes, Carol Violet', investment: 'Julius Baer Trading Account',        nav: 44676.09,      rebate: 0,    advisory: 0.75 },
  { client: 'Hughes, Carol Violet', investment: 'Wealthworks Global Flexible Fund',   nav: 6104920.86,    rebate: 0.5,  advisory: 0.75 },
  // Keren, Avi & Glynis
  { client: 'Keren, Avi & Glynis', investment: 'Julius Baer Trading Account',         nav: 252420.72,     rebate: 0,    advisory: 0    },
  { client: 'Keren, Avi & Glynis', investment: 'Equities',                            nav: 15140361.43,   rebate: 0,    advisory: 0    },
  { client: 'Keren, Avi & Glynis', investment: 'Gold',                                nav: 665292.85,     rebate: 0,    advisory: 0    },
  // Marula Trading & Investments Limited
  { client: 'Marula Trading & Investments Limited', investment: 'Julius Baer Trading Account',              nav: 579262.44,   rebate: 0,    advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Blackrock ICS US Dollar Liquidity Fund',   nav: 224420.58,   rebate: 0,    advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Rubrics Enhanced Yield UCITS Fund',        nav: 0,           rebate: 0.25, advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Meituan',                                   nav: 93412.11,    rebate: 0,    advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Tencent Holdings Limited',                 nav: 5249565.91,  rebate: 0,    advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Alibaba Group Holding',                    nav: 2046560.66,  rebate: 0,    advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Wealthworks Global Flexible Fund',         nav: 27416571.37, rebate: 0.5,  advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Diversified Trading Fund B1',              nav: 11895414.68, rebate: 0.5,  advisory: 0.7 },
  { client: 'Marula Trading & Investments Limited', investment: 'Xhaos Special Opportunities Fund D',       nav: 24811668.69, rebate: 0,    advisory: 0.7 },
  // Terra-Mater Limited
  { client: 'Terra-Mater Limited', investment: 'Julius Baer Trading Account',         nav: 500596.97,     rebate: 0,    advisory: 0.7 },
  { client: 'Terra-Mater Limited', investment: 'Scottish Mortgage Investment Trust',  nav: 3409525.19,    rebate: 0,    advisory: 0.7 },
  { client: 'Terra-Mater Limited', investment: 'Wealthworks Global Flexible Fund',    nav: 20227580.17,   rebate: 0.5,  advisory: 0.7 },
  { client: 'Terra-Mater Limited', investment: 'Diversified Trading Fund B1',         nav: 12753000.92,   rebate: 0.5,  advisory: 0.7 },
  { client: 'Terra-Mater Limited', investment: 'Xhaos Special Opportunities Fund',    nav: 23938496.99,   rebate: 0,    advisory: 0.7 },
];

const BATCH = 20;
const NAV_TOLERANCE = 0.002; // 0.2% — allow for minor rounding differences

function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/class/g, '').replace(/[^a-z0-9]+/g, '');
}

function navOf(row) {
  return Number(row.zar_value ?? row.month_end_market_value ?? 0) || 0;
}

function navScore(dbNav, csNav) {
  if (!dbNav || !csNav) return 0;
  const variance = Math.abs(dbNav - csNav) / Math.max(Math.abs(dbNav), Math.abs(csNav));
  return variance <= NAV_TOLERANCE ? (1 - variance / NAV_TOLERANCE) : 0;
}

function nameScore(dbValue, csValue) {
  const d = normalizeKey(dbValue);
  const c = normalizeKey(csValue);
  if (!d || !c) return 0;
  if (d === c) return 1;
  if (d.includes(c) || c.includes(d)) return 0.8;
  return 0;
}

function calcFeeFields(nav, rebate, advisory) {
  const rebateOrig = nav * (rebate / 100) / 12;
  const advisoryOrig = nav * (advisory / 100) / 12;
  return {
    rebate_fee_annual_percent: rebate,
    advisory_fee_annual_percent: advisory,
    rebate_fee_monthly_percent: rebate / 12,
    advisory_fee_monthly_percent: advisory / 12,
    rebate_fee_monthly_amount_zar: rebateOrig,
    advisory_fee_monthly_amount_zar: advisoryOrig,
    rebate_fee_monthly_amount_original_currency: rebateOrig,
    advisory_fee_monthly_amount_original_currency: advisoryOrig,
    total_monthly_fee_zar: rebateOrig + advisoryOrig,
    total_monthly_fee_original_currency: rebateOrig + advisoryOrig,
    fee_required: false,
    fee_base_zar: nav,
    fee_base_source: 'valuation',
  };
}

/**
 * Preview which updates will be applied (dry run).
 * Returns { matched, unmatched, log }
 */
export async function previewJbAprilFix(uploadMonth = '2026-04') {
  const allRows = await base44.entities.PortfolioValuation.filter(
    { upload_month: uploadMonth }, '-created_date', 20000
  );
  const jbRows = allRows.filter(r => String(r.platform || '').toLowerCase().includes('julius'));

  const used = new Set();
  const matched = [];
  const unmatched = [];

  for (const cs of CONTROL_SHEET) {
    // Skip rows with no meaningful NAV to match on
    if (cs.nav === null || isNaN(cs.nav)) {
      unmatched.push({ cs, reason: 'no NAV in control sheet' });
      continue;
    }

    let bestRow = null;
    let bestScore = 0;

    for (const row of jbRows) {
      if (used.has(row.id)) continue;
      const nav = navOf(row);
      const ns = navScore(nav, cs.nav);
      const clientS = nameScore(row.portfolio_name, cs.client);
      const investS = nameScore(row.investment_name, cs.investment);
      // NAV alone is enough if strong; otherwise require name signals
      const score = ns > 0.5 ? ns + clientS * 0.2 : (clientS + investS) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }

    if (bestRow && bestScore > 0.3) {
      used.add(bestRow.id);
      matched.push({ cs, row: bestRow, score: bestScore });
    } else {
      unmatched.push({ cs, reason: 'no DB row found' });
    }
  }

  return { matched, unmatched, totalJbRows: jbRows.length };
}

/**
 * Apply corrections: update investment_name, NAV, and fee fields for matched rows.
 */
export async function applyJbAprilFix(uploadMonth = '2026-04') {
  const { matched, unmatched, totalJbRows } = await previewJbAprilFix(uploadMonth);

  const updates = matched.map(({ cs, row }) => ({
    id: row.id,
    update: {
      investment_name: cs.investment,
      zar_value: cs.nav,
      month_end_market_value: cs.nav,
      portfolio_name: cs.client,
      ...calcFeeFields(cs.nav, cs.rebate, cs.advisory),
    },
  }));

  for (let i = 0; i < updates.length; i += BATCH) {
    await Promise.all(
      updates.slice(i, i + BATCH).map(({ id, update }) =>
        base44.entities.PortfolioValuation.update(id, update)
      )
    );
  }

  return {
    updated: updates.length,
    unmatched: unmatched.length,
    totalJbRows,
    unmatchedDetails: unmatched,
  };
}
