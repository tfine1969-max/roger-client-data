import { base44 } from '@/api/base44Client';

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
  const uploads = await base44.entities.MonthlyUpload.list('-upload_month', 200);
  const months = [...new Set(uploads.map(upload => upload.upload_month).filter(Boolean))];

  if (months.length === 0) {
    return base44.entities.PortfolioValuation.list('-upload_month', PAGE_LIMIT);
  }

  const monthRows = await Promise.all(
    months.map(month => base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', PAGE_LIMIT))
  );

  return uniqueById(monthRows.flat());
}
