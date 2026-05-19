import { base44 } from '@/api/base44Client';
import { rogerSourceRows } from '@/data/rogerSourceRows';

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
  return embeddedKeys.has(key);
}

// Returns raw rows only — fund-name mappings are applied at render time by each
// consumer (via applyMappingsToRows / resolveInvestmentName from fund-utils.js)
// so that localStorage changes take effect immediately without a cache bust.
export async function fetchAllPortfolioValuations() {
  // Embedded data (Jan-Mar 2026 plus any other months in rogerSourceRows) is always
  // included. DB rows are fetched directly from PortfolioValuation rather than going
  // through MonthlyUpload as an index — this ensures data imported before MonthlyUpload
  // records were created still appears.
  try {
    const dbRows = uniqueById(
      await base44.entities.PortfolioValuation.list('-upload_month', PAGE_LIMIT)
    ).filter(row => !dbRowSuperseded(row));

    return [...rogerSourceRows, ...dbRows];
  } catch (_err) {
    return rogerSourceRows;
  }
}
