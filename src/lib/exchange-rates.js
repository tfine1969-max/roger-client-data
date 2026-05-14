export const DEFAULT_USD_ZAR_RATE = '16.7766';

export const MONTHLY_USD_ZAR_RATES = {
  '2026-04': '16.7766',
};

const STORAGE_KEY = 'wealthworks_monthly_usd_zar_rates';

function storedRates() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getUsdZarRateForMonth(month) {
  return getConfiguredUsdZarRateForMonth(month) || DEFAULT_USD_ZAR_RATE;
}

export function getConfiguredUsdZarRateForMonth(month) {
  const key = String(month || '').trim();
  const rates = storedRates();
  return rates[key] || MONTHLY_USD_ZAR_RATES[key] || null;
}

export function saveUsdZarRateForMonth(month, rate) {
  if (typeof window === 'undefined') return;
  const key = String(month || '').trim();
  const value = String(rate || '').trim();
  if (!key || !value) return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...storedRates(),
    [key]: value,
  }));
}
