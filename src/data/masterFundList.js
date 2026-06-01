export const masterFundList = [
  // Wealthworks funds
  'Wealthworks Global Flexible Fund',
  'Wealthworks Prime Managed Fund of Funds',
  'Wealthworks Prime Cautious Fund of Funds',
  // Prime SA funds
  '36ONE Flexible',
  '36ONE Global Equity Feeder',
  'Centaur BCI Flexible',
  'Catalyst Global Real Estate',
  'ClucasGray Prescient Equity',
  'Coronation Global Emerging Markets',
  'Fairtree Prescient Equity',
  'Laurium Flexible Prescient',
  'Laurium Stable Prescient Fund (A2)',
  'Obsidian SCI Equity',
  'Prescient Income Provider (A2)',
  // Gryphon
  'Gryphon Dividend Income Fund',
  // Julius Baer funds & holdings
  'Blackrock ICS US Dollar Liquidity Fund',
  'Diversified Trading Fund',
  'Dodge & Cox Worldwide Funds',
  'Global X Copper Miners ETF',
  'Julius Baer Cash Account',
  'Julius Baer Trading Account',
  'Meituan',
  'Prescient China Balanced Fund',
  'Rubrics Enhanced Yield UCITS Fund',
  'Scottish Mortgage Investment Trust',
  'Xhaos Special Opportunities Fund',
  // Credo
  'Credo Cash Account',
  'Credo Trading Account',
  // Northstar
  'FNB Securities (Northstar)',
  'Sanlam (Northstar)',
  // Prescient
  'Prescient China Balanced Fund',
  // Peresec
  'Peresec Trading Account',
  // Equities & ETFs
  'Alibaba Group Holding',
  'Amplify Transformational Data Sharing ETF',
  'Anglogold Ashanti PLC',
  'Apple Inc',
  'BBVA Global Markets',
  'Defiance Quantum ETF',
  'Digihost Technology Inc',
  'Equities',
  'Fundsmith Equity Fund',
  'Gold',
  'Harmony Capital Limited Special Situations Class',
  'Harmony Gold Mining Co LTD',
  'HG Capital Trust',
  'Invesco Global Clean Energy ETF',
  'Invesco Nasdaq 100 ETF',
  'Invesco S&P 500 Momentum ETF',
  'Invesco Solar ETF',
  'iShares Bitcoin Trust ETF',
  'iShares Global 100 ETF',
  'iShares Global Tech ETF',
  'iShares Physical Gold ETF',
  'Jinkosolar Holding Co Ltd',
  'Kraneshares CSI China Internet ETF',
  'Matrix SCI Stable Income Fund B1',
  'Nomura Global High Conviction Fund',
  'Obsidian SCI Balanced Fund (B1)',
  'Royal Mint Physical Gold',
  'RSA Government Bond',
  'Tencent Holdings Limited',
  'Volkswagen AG',
  // Cash / settlement
  'Cash',
  'Settlement Cash (Global)',
  'Global cash Settlement - Prime',
  'Inflow cash (Global) - Prime',
];

// Deduplicate
const seen = new Set();
export const masterFundListUnique = masterFundList.filter(f => {
  if (seen.has(f)) return false;
  seen.add(f);
  return true;
});