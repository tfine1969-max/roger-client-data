export const masterFundList = [
  // Wealthworks
  'Wealthworks Global Flexible Fund',
  'Wealthworks Prime Managed Fund of Funds',
  'Wealthworks Prime Cautious Fund of Funds',
  // Gryphon
  'Gryphon Dividend Income Fund',
  // Julius Baer / Credo
  'Blackrock ICS US Dollar Liquidity Fund',
  'Diversified Trading Fund',
  'Dodge & Cox Worldwide Funds',
  'Global X Copper Miners ETF',
  'Julius Baer Cash Account',
  'Julius Baer Trading Account',
  'Prescient China Balanced Fund',
  'Rubrics Enhanced Yield UCITS Fund',
  'Scottish Mortgage Investment Trust',
  'Xhaos Special Opportunities Fund',
  // Credo
  'Credo Cash Account',
  'Credo Trading Account',
  // SA funds
  '36ONE Flexible',
  '36ONE Global Equity Feeder',
  'Catalyst Global Real Estate',
  'Centaur BCI Flexible',
  'ClucasGray Prescient Equity',
  'Coronation Global Emerging Markets',
  'Fairtree Prescient Equity',
  'Laurium Flexible Prescient',
  'Laurium Stable Prescient Fund (A2)',
  'Obsidian SCI Balanced Fund (B1)',
  'Obsidian SCI Equity',
  'Prescient Income Provider (A2)',
  // Northstar
  'FNB Securities (Northstar)',
  'Sanlam (Northstar)',
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
  'Meituan',
  'Nomura Global High Conviction Fund',
  'Royal Mint Physical Gold',
  'RSA Government Bond',
  'Tencent Holdings Limited',
  'Volkswagen AG',
  // Cash
  'Cash',
  'Settlement Cash (Global)',
];

const seen = new Set();
export const masterFundListUnique = masterFundList.filter(f => {
  if (seen.has(f)) return false;
  seen.add(f);
  return true;
});