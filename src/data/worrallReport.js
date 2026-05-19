// Worrall Family Investments — static monthly report data Jan–Apr 2026
// Sourced from the official WealthWorks Investment Statement spreadsheet.

export const FX_RATES = {
  '2026-01': 16.1329,
  '2026-02': 15.9394,
  '2026-03': 16.9391,
  '2026-04': 16.7766,
};

// ─── Marula Trading & Investments (Offshore – USD) ───────────────────────────

export const MARULA_FUNDS = [
  { key: 'jb_trading',   label: 'Julius Baer Trading Account' },
  { key: 'blackrock',    label: 'Blackrock ICS US Dollar Liquidity Fund' },
  { key: 'rubrics',      label: 'Rubrics Enhanced Yield UCITS Fund' },
  { key: 'meituan',      label: 'Meituan' },
  { key: 'tencent',      label: 'Tencent Holdings Limited' },
  { key: 'alibaba',      label: 'Alibaba Group Holding' },
  { key: 'ww_global',    label: 'Wealthworks Global Flexible Fund' },
  { key: 'diversified',  label: 'Diversified Trading Fund B1' },
  { key: 'xhaos',        label: 'Xhaos Special Opportunities Fund D' },
];

export const MARULA_HISTORY = {
  '2026-01': { jb_trading: 10504.29,  blackrock: 14793.02, rubrics: 45314.35, meituan: 6521.69,  tencent: 406598.90, alibaba: 156843.00, ww_global: 1639599.96, diversified: 646726.27, xhaos: 1442997.08 },
  '2026-02': { jb_trading: -4043.36,  blackrock: 14835.05, rubrics: 45775.29, meituan: 5436.16,  tencent: 347002.89, alibaba: 133301.75, ww_global: 1640696.88, diversified: 680386.68, xhaos: 1406463.04 },
  '2026-03': { jb_trading: 36907.49,  blackrock: 13337.33, rubrics: null,     meituan: 5543.92,  tencent: 323478.77, alibaba: 116050.50, ww_global: 1525918.90, diversified: 694489.92, xhaos: 1333199.58 },
  '2026-04': { jb_trading: 34528.00,  blackrock: 13377.00, rubrics: null,     meituan: 5568.00,  tencent: 312910.00, alibaba: 121989.00, ww_global: 1634215.00, diversified: 709048.00, xhaos: 1478945.00 },
};

// ─── Sweet Grass Trading (Local – ZAR) ───────────────────────────────────────

export const SWEET_GRASS_FUNDS = [
  { key: 'one36_global',  label: '36One BCI Global Equity Feeder Fund' },
  { key: 'catalyst',      label: 'Catalyst SCI Global Real Estate SCI Feeder' },
  { key: 'centaur',       label: 'Centaur Bci Flexible Fund (C)' },
  { key: 'clucasgray',    label: 'ClucasGray Prescient Equity Fund' },
  { key: 'coronation',    label: 'Coronation Global Emerging Markets Flexible' },
  { key: 'ww_managed',    label: 'Wealthworks Prime Managed Fund of Funds' },
];

export const SWEET_GRASS_HISTORY = {
  '2026-01': { one36_global: 4257579.22,  catalyst: 2625600.89, centaur: 648434.81,  clucasgray: 717536.16, coronation: 8122430.40,  ww_managed: 28529903.49 },
  '2026-02': { one36_global: 4107675.34,  catalyst: 2799328.99, centaur: 662827.98,  clucasgray: 754666.72, coronation: 7886604.41,  ww_managed: 28929412.79 },
  '2026-03': { one36_global: 3948069.74,  catalyst: 2730806.42, centaur: 616578.55,  clucasgray: 705179.25, coronation: 7491096.18,  ww_managed: 27235055.82 },
  '2026-04': { one36_global: 4351432.00,  catalyst: 2916919.52, centaur: 639602.76,  clucasgray: 722637.96, coronation: 7972295.26,  ww_managed: 27998522.10 },
};

// ─── Sweet Grass Trading Sub Account (Local – ZAR) ───────────────────────────

export const SWEET_GRASS_SUB_FUNDS = [
  { key: 'laurium',     label: 'Laurium Stable Prescient Fund (A2)' },
  { key: 'obsidian',    label: 'Obsidian SCI Balanced Fund (B1)' },
  { key: 'ww_fof',      label: 'Wealthworks Prime Managed FOF (A)' },
  { key: 'centaur',     label: 'Centaur Bci Flexible Fund (C)' },
  { key: 'one36',       label: '36One Bci Flexible Opportunity Fund (A)' },
  { key: 'fairtree',    label: 'Fairtree Equity Prescient (A1)' },
];

export const SWEET_GRASS_SUB_HISTORY = {
  '2026-01': { laurium: 481366.58,  obsidian: null,       ww_fof: 2768442.47, centaur: 463330.55, one36: 322989.61, fairtree: null       },
  '2026-02': { laurium: 493841.79,  obsidian: null,       ww_fof: 2807084.31, centaur: 473593.88, one36: 322449.26, fairtree: null       },
  '2026-03': { laurium: 469175.68,  obsidian: 488114.97,  ww_fof: 2642574.91, centaur: 440531.31, one36: 304108.13, fairtree: 481439.80  },
  '2026-04': { laurium: 478250.61,  obsidian: 503361.83,  ww_fof: 2716560.01, centaur: 456965.98, one36: 314130.96, fairtree: 489650.59  },
};

// ─── Isla Worrall (Local – ZAR) ──────────────────────────────────────────────

export const ISLA_FUNDS = [
  { key: 'ww_managed', label: 'Wealthworks Prime Managed Fund of Funds' },
];

export const ISLA_HISTORY = {
  '2026-01': { ww_managed: 2750486.82 },
  '2026-02': { ww_managed: 2790730.96 },
  '2026-03': { ww_managed: 2628737.92 },
  '2026-04': { ww_managed: 2704150.09 },
};

// ─── Charlie Worrall (Local – ZAR) ───────────────────────────────────────────

export const CHARLIE_FUNDS = [
  { key: 'ww_managed', label: 'Wealthworks Prime Managed Fund of Funds' },
];

export const CHARLIE_HISTORY = {
  '2026-01': { ww_managed: 1131172.47 },
  '2026-02': { ww_managed: 1147723.38 },
  '2026-03': { ww_managed: 1081101.70 },
  '2026-04': { ww_managed: 1112115.91 },
};

// ─── Total Portfolio summary ──────────────────────────────────────────────────

export const TOTAL_HISTORY = {
  '2026-01': {
    offshore_usd: 4369898.56, offshore_zar: 70499136.48,
    local_zar: 48937614.18,   local_usd: 3033404.67,
    total_zar: 119436750.66,  total_usd: 7403303.23,
    children_isla: 2750486.82, children_charlie: 1131172.47, children_total: 3881659.29,
  },
  '2026-02': {
    offshore_usd: 4269854.38, offshore_zar: 68058916.90,
    local_zar: 49237485.47,   local_usd: 3089042.59,
    total_zar: 117296402.37,  total_usd: 7358896.97,
    children_isla: 2790730.96, children_charlie: 1147723.38, children_total: 3938454.34,
  },
  '2026-03': {
    offshore_usd: 4048926.41, offshore_zar: 68585169.35,
    local_zar: 47552730.76,   local_usd: 2807276.11,
    total_zar: 116137900.11,  total_usd: 6856202.52,
    children_isla: 2628737.92, children_charlie: 1081101.70, children_total: 3709839.62,
  },
  '2026-04': {
    offshore_usd: 4310580.00, offshore_zar: 72316876.43,
    local_zar: 49560329.58,   local_usd: 2954134.30,
    total_zar: 121877206.01,  total_usd: 7264714.30,
    children_isla: 2704150.09, children_charlie: 1112115.91, children_total: 3816266.00,
  },
};

// Months for which we have exact static figures
export const STATIC_MONTHS = new Set(Object.keys(TOTAL_HISTORY));

// Portfolio name patterns used to match live upload data for each entity
export const ENTITY_LOOKUP = {
  marula: { portfolioPatterns: [/marula/i], platform: 'Julius Baer' },
  sweet_grass: { portfolioPatterns: [/sweet\s*grass/i], excludePatterns: [/sub/i], platform: 'Prime' },
  sweet_grass_sub: { portfolioPatterns: [/sweet\s*grass.*sub|sub.*sweet\s*grass/i], platform: 'Prime' },
  isla: { portfolioPatterns: [/isla\s*worrall/i], platform: 'Prime' },
  charlie: { portfolioPatterns: [/charlie\s*worrall/i], platform: 'Prime' },
};
