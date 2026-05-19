import { base44 } from '@/api/base44Client';
import { rogerSourceRows, rogerSourceTotals } from '@/data/rogerSourceRows';

const PAGE_LIMIT = 5000;

function uniqueById(rows) {
  const seen = new Set();
  return rows.filter(row => {
    if (!row?.id) return true;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

// Build a set of (upload_month||platform_lower||account_code) keys from embedded rows.
// Any DB row matching an embedded key is superseded and excluded to prevent double-counting.
const embeddedKeys = new Set(
  rogerSourceRows.map(r =>
    `${r.upload_month}||${String(r.platform || '').toLowerCase().trim()}||${String(r.account_code || '').toLowerCase().trim()}`
  )
);

function dbRowSuperseded(row) {
  const key = `${row.upload_month}||${String(row.platform || '').toLowerCase().trim()}||${String(row.account_code || '').toLowerCase().trim()}`;
  if (embeddedKeys.has(key)) return true;
  // Catch the incorrectly aggregated April 2026 Prime row for Marc Hoar (~R59M total).
  // The correct per-fund data is in the embedded rogerSourceRows.
  const val = row.zar_value || row.month_end_market_value || 0;
  if (
    row.upload_month === '2026-04' &&
    String(row.platform || '').toLowerCase() === 'prime' &&
    val > 50_000_000
  ) return true;
  return false;
}

// Returns raw rows only — fund-name mappings are applied at render time by each
// consumer (via applyMappingsToRows / resolveInvestmentName from fund-utils.js)
// so that localStorage changes take effect immediately without a cache bust.
export async function fetchAllPortfolioValuations() {
  // Jan-Mar 2026 data is always served from the embedded file — never the DB.
  // This prevents the data from disappearing when Base44 resets the database on deployment.
  const embeddedMonths = new Set(Object.keys(rogerSourceTotals));

  const uploads = await base44.entities.MonthlyUpload.list('-upload_month', 200);
  const dbMonths = [
    ...new Set(uploads.map(upload => upload.upload_month).filter(m => m && !embeddedMonths.has(m))),
  ];

  if (dbMonths.length === 0) return rogerSourceRows;

  const dbRows = uniqueById(
    (await Promise.all(
      dbMonths.map(month =>
        base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', PAGE_LIMIT)
      )
    )).flat()
  ).filter(row => !dbRowSuperseded(row));

  return [...rogerSourceRows, ...dbRows];
}
