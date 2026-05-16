export const DEFAULT_USD_ZAR_RATE = '16.776';

export const MONTHLY_USD_ZAR_RATES = {
  '2026-04': '16.776',
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

function monthEndDate(month) {
  const [year, monthNumber] = String(month || '').split('-').map(Number);
  if (!year || !monthNumber) return null;
  return new Date(Date.UTC(year, monthNumber, 0));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export async function fetchMonthEndUsdZarRate(month) {
  const monthEnd = monthEndDate(month);
  if (!monthEnd) throw new Error('Choose a valid month first.');

  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(monthEnd);
    date.setUTCDate(monthEnd.getUTCDate() - offset);
    const dateText = formatDate(date);
    const response = await fetch(`https://api.frankfurter.dev/v1/${dateText}?base=USD&symbols=ZAR`);
    if (!response.ok) continue;
    const data = await response.json();
    const rate = Number(data?.rates?.ZAR);
    if (Number.isFinite(rate) && rate > 0) {
      const value = rate.toFixed(4);
      saveUsdZarRateForMonth(month, value);
      return {
        rate: value,
        rateDate: data.date || dateText,
        requestedDate: formatDate(monthEnd),
        source: 'Frankfurter / ECB reference rates',
      };
    }
  }

  throw new Error('No USD/ZAR month-end rate was available from the live source.');
}
