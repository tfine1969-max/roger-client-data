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

export async function fetchAllPortfolioValuations() {
  // Jan-Mar 2026 data is always served from the embedded file — never the DB.
  // This prevents the data from disappearing when Base44 resets the database on deployment.
  const embeddedMonths = new Set(Object.keys(rogerSourceTotals));

  const uploads = await base44.entities.MonthlyUpload.list('-upload_month', 200);
  const dbMonths = [
    ...new Set(uploads.map(upload => upload.upload_month).filter(m => m && !embeddedMonths.has(m))),
  ];

  if (dbMonths.length === 0) {
    return rogerSourceRows;
  }

  const monthRows = await Promise.all(
    dbMonths.map(month => base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', PAGE_LIMIT))
  );

  return [...rogerSourceRows, ...uniqueById(monthRows.flat())];
}
