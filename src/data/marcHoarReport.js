// Static monthly report data for Marc Hoar — sourced from the official WealthWorks
// Investment Summary report. Dec 2025 – Apr 2026 values are exact PDF figures.
// For months after Apr 2026, the report page derives values from portfolio valuations.

// Defines each fund row with a display label and lookup rules for live data
export const LOCAL_FUNDS = [
  {
    key: 'gryphon_div',
    label: 'Gryphon Dividend Income Fund',
    lookup: { platform: 'Gryphon', namePattern: /gryphon dividend income/i },
  },
  {
    key: 'ww_retirement',
    label: 'Wealthworks Managed Fund (Retirement Plan)',
    lookup: { accountCode: 'PRI201802280001', aggregateAll: true },
  },
  {
    key: 'ww_investment',
    label: 'Wealthworks Managed Fund (Investment Plan)',
    lookup: { accountCode: 'PRI201807090001', aggregateAll: true },
  },
  {
    key: 'fairtree',
    label: 'Fairtree Equity Prescient (A1)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /fairtree/i },
  },
  {
    key: 'clucasgray',
    label: 'ClucasGray Prescient Equity Fund (B1)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /clucas/i },
  },
  {
    key: 'laurium',
    label: 'Laurium Flexible Prescient Fund Fund (B4)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /laurium/i },
  },
  {
    key: 'ww_cautious',
    label: 'Wealthworks Cautious Fund',
    lookup: { accountCode: 'PRI202108240002', namePattern: /cautious/i },
  },
  {
    key: 'one36',
    label: '36One Bci Flexible Opportunity Fund (A)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /36\s*one/i },
  },
  {
    key: 'centaur',
    label: 'Centaur Bci Flexible Fund (C)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /centaur/i },
  },
  {
    key: 'obsidian',
    label: 'Obsidian SCI Equity Fund (B3)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /obsidian/i },
  },
  {
    key: 'coronation',
    label: 'Coronation Global Emerging Markets Flexible (P)',
    lookup: { accountCode: 'PRI202108240002', namePattern: /coronation/i },
  },
  {
    key: 'ww_managed',
    label: 'Wealthworks Managed Fund',
    lookup: { accountCode: 'PRI202108240002', namePattern: /managed\s*(fof|fund of funds|$)/i },
  },
];

// Offshore funds shown in USD. For live months the report displays ZAR from portfolio valuations.
export const OFFSHORE_FUNDS = [
  { key: 'jb_trading',      label: 'Julius Baer Trading Account' },
  { key: 'dodge_cox',       label: 'Dodge & Cox Worldwide Funds' },
  { key: 'global_copper',   label: 'Global X Copper Miners ETF' },
  { key: 'invesco_clean',   label: 'Invesco Global Clean Energy ETF' },
  { key: 'ww_global',       label: 'Wealthworks Global Flexible Fund' },
  { key: 'diversified',     label: 'Diversified Trading Fund B1' },
  { key: 'xhaos',           label: 'Xhaos Special Opportunities Fund' },
  { key: 'gold',            label: 'Gold' },
  { key: 'prescient_china', label: 'Prescient China Balanced Fund' },
];

// Historical ZAR values — Local portfolio
export const LOCAL_HISTORY = {
  '2025-12': {
    gryphon_div: 13260900, ww_retirement: 2306115, ww_investment: 6980623,
    fairtree: 1465695, clucasgray: 1413399, laurium: 1323232, ww_cautious: 8740750,
    one36: 1382127, centaur: 1706821, obsidian: 1437236, coronation: 1227553, ww_managed: 20810203,
  },
  '2026-01': {
    gryphon_div: 13208039, ww_retirement: 2391540, ww_investment: 7239194,
    fairtree: 1567800, clucasgray: 1483650, laurium: 1364808, ww_cautious: 8914120,
    one36: 1430622, centaur: 1717090, obsidian: 1494633, coronation: 1204592, ww_managed: 21586338,
  },
  '2026-02': {
    gryphon_div: 13252122, ww_retirement: 2781242, ww_investment: 7339843,
    fairtree: 1656282, clucasgray: 1560651, laurium: 1429386, ww_cautious: 11342752,
    one36: 1428499, centaur: 1755457, obsidian: 1571196, coronation: 1169788, ww_managed: 29023918,
  },
  '2026-03': {
    gryphon_div: 13306716, ww_retirement: 2618282, ww_investment: 6909336,
    fairtree: 1435830, clucasgray: 1458604, laurium: 1309746, ww_cautious: 10940336,
    one36: 1347569, centaur: 1633297, obsidian: 1444799, coronation: 1111347, ww_managed: 27329503,
  },
  '2026-04': {
    gryphon_div: 13351894, ww_retirement: 2703866, ww_investment: 7102252,
    fairtree: 1460575, clucasgray: 1494927, laurium: 1344239, ww_cautious: 11175409,
    one36: 1392235, centaur: 1694537, obsidian: 1500302, coronation: 1182910, ww_managed: 28099763,
  },
};

// Historical USD values — Offshore portfolio (Julius Baer)
export const OFFSHORE_HISTORY = {
  '2025-12': {
    jb_trading: 157073, dodge_cox: 16320, global_copper: 60663, invesco_clean: 12464,
    ww_global: 1199318, diversified: 209469, xhaos: 139783, gold: 35272, prescient_china: 66089,
  },
  '2026-01': {
    jb_trading: 21134, dodge_cox: 16871, global_copper: 71664, invesco_clean: 13636,
    ww_global: 1356484, diversified: 210372, xhaos: 139802, gold: 39601, prescient_china: 68218,
  },
  '2026-02': {
    jb_trading: 19923, dodge_cox: 17238, global_copper: 80867, invesco_clean: 14229,
    ww_global: 1357177, diversified: 221322, xhaos: 136235, gold: 43054, prescient_china: 68946,
  },
  '2026-03': {
    jb_trading: 17261, dodge_cox: 15682, global_copper: 64516, invesco_clean: 13896,
    ww_global: 1264128, diversified: 225909, xhaos: 129110, gold: 38296, prescient_china: 66062,
  },
  '2026-04': {
    jb_trading: 15958, dodge_cox: 16988, global_copper: 67270, invesco_clean: 16220,
    ww_global: 1352671, diversified: 230644, xhaos: 143205, gold: 37705, prescient_china: 70131,
  },
};

// Months that have exact static values — live portfolio valuations are not used for these
export const STATIC_MONTHS = new Set(Object.keys(LOCAL_HISTORY));

// The client identifier — matches clientKey() for "Hoar, M Mr"
export const MARC_HOAR_PORTFOLIO_NAMES = ['Hoar, M Mr', 'Mr Marc Anthony Hoar'];
export const MARC_HOAR_ACCOUNT_CODES = [
  'JULIUS BAER_HOAR_M_MR',
  'GRYPHON_HOAR_M_MR',
  'PRI201807090001',
  'PRI201802280001',
  'PRI202108240002',
];
