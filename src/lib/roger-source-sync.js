import { base44 } from '@/api/base44Client';
import { rogerSourceTotals } from '@/data/rogerSourceRows';

const BATCH_SIZE = 25;

// Jan-Mar 2026 is served exclusively from the embedded rogerSourceRows file.
// These months must NEVER exist in the database — this function removes them.
export async function purgeEmbeddedMonthsFromDB({ months = Object.keys(rogerSourceTotals) } = {}) {
  const targetMonths = [...new Set(months)].filter(Boolean);
  let portfolioRowsDeleted = 0;

  for (const month of targetMonths) {
    const pvRows = await base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', 20000);
    for (let i = 0; i < pvRows.length; i += BATCH_SIZE) {
      await Promise.all(pvRows.slice(i, i + BATCH_SIZE).map(r => base44.entities.PortfolioValuation.delete(r.id)));
    }
    portfolioRowsDeleted += pvRows.length;
  }

  const allUploads = await base44.entities.MonthlyUpload.list('-upload_date', 500);
  const uploadsToDelete = allUploads.filter(u => targetMonths.includes(u.upload_month));
  for (let i = 0; i < uploadsToDelete.length; i += BATCH_SIZE) {
    await Promise.all(uploadsToDelete.slice(i, i + BATCH_SIZE).map(r => base44.entities.MonthlyUpload.delete(r.id)));
  }

  return { months: targetMonths, portfolioRowsDeleted, uploadRecordsDeleted: uploadsToDelete.length };
}
