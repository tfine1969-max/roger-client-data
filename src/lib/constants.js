export const ADVISORS = {
  trevor:  { name: 'Trevor Fine',      title: 'Group MD',              email: 'trevor@wealthworks.co.za',  cc: 'gemma@wealthworks.co.za' },
  roger:   { name: 'Roger Eskinazi',   title: 'Partner, Cape Town',    email: 'roger@wealthworks.co.za',   cc: 'gemma@wealthworks.co.za' },
  malcolm: { name: 'Malcolm Munsamy',  title: 'Representative',        email: 'malcolm@wealthworks.co.za', cc: null }
};

export const NEEDS_OPTIONS = [
  { id: 'investment', label: 'Investment' },
  { id: 'risk_cover', label: 'Risk Cover' },
];

export const RISK_COVER_TYPES = [
  { id: 'life_cover', label: 'Life Cover' },
  { id: 'dread_disease', label: 'Dread Disease' },
  { id: 'lump_sum_disability', label: 'Lump Sum Disability' },
  { id: 'income_disability', label: 'Income Disability' },
];

export const RISK_COVER_PROVIDERS = [
  'PPS',
  'Momentum',
  'Discovery Life',
  'Hollard',
  'BrightRock',
];

export const INVESTMENT_PROVIDERS_LOCAL = [
  'Glacier Local',
  'Prime Investments',
  'Momentum Wealth',
  'Allan Gray',
];

export const INVESTMENT_PROVIDERS_OFFSHORE = [
  'Glacier Offshore',
  'Momentum Wealth International',
  'Credo',
  'Julius Baer',
];

export const OFFSHORE_CURRENCIES = ['USD', 'GBP', 'EUR', 'CHF'];

export const RISK_PROFILES = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];
export const BUDGETS = ['Below R2,000', 'R2,001–R5,000', 'R5,001–R10,000', 'R10,001–R20,000', 'Above R20,000'];
export const HORIZONS = ['Under 3 years', '3–5 years', '5–10 years', '10–20 years', '20+ years'];

// Legacy — kept for backward compatibility
export const REC_CATEGORIES = ['Investment', 'Offshore investment', 'Risk cover', 'Retirement annuity', 'Tax-free savings'];
export const REC_PROVIDERS = [...INVESTMENT_PROVIDERS_LOCAL, ...INVESTMENT_PROVIDERS_OFFSHORE, ...RISK_COVER_PROVIDERS];

export function generateRef() {
  return 'WW-P-2026-' + Math.floor(3000 + Math.random() * 999);
}

export function parseRandValue(s) {
  if (!s) return 0;
  const m = s.replace(/\s/g, '').match(/R([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, '')) : 0;
}

export function formatRand(num) {
  if (!num || num === 0) return '—';
  return 'R' + num.toLocaleString('en-ZA') + ' / month';
}