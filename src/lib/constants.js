export const ADVISORS = {
  trevor:  { name: 'Trevor Fine',      title: 'Group MD',              email: 'trevor@wealthworks.co.za',  cc: 'gemma@wealthworks.co.za' },
  roger:   { name: 'Roger Eskinazi',   title: 'Partner, Cape Town',    email: 'roger@wealthworks.co.za',   cc: 'gemma@wealthworks.co.za' },
  malcolm: { name: 'Malcolm Munsamy',  title: 'Representative',        email: 'malcolm@wealthworks.co.za', cc: null }
};

export const REC_CATEGORIES = [
  'Life cover & disability',
  'Life cover only',
  'Disability / income protection',
  'Dread disease / critical illness',
  'Retirement annuity',
  'Investment',
  'Offshore investment',
  'Tax-free savings',
  'Business assurance',
  'Estate planning',
  'Education planning'
];

export const REC_PROVIDERS = [
  'BrightRock — needs-matched',
  'Discovery Life — integrated',
  'Sanlam Indie',
  'PPS — professional members',
  'Liberty',
  'Hollard',
  'Allan Gray RA',
  'Ninety One RA',
  'Sanlam RA via LISP',
  'WealthWorks Prime Managed',
  'Gryphon',
  'Julius Baer — offshore',
  'Credo — offshore'
];

export const RISK_PROFILES = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];
export const BUDGETS = ['Below R2,000', 'R2,001–R5,000', 'R5,001–R10,000', 'R10,001–R20,000', 'Above R20,000'];
export const HORIZONS = ['Under 3 years', '3–5 years', '5–10 years', '10–20 years', '20+ years'];

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