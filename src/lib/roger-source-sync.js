import { base44 } from '@/api/base44Client';
import { rogerSourceRows, rogerSourceTotals } from '@/data/rogerSourceRows';

const BATCH_SIZE = 25;

export async function syncRogerSourceRows({ months = Object.keys(rogerSourceTotals) } = {}) {
  const targetMonths = [...new Set(months)].filter(Boolean);
  const rows = rogerSourceRows.filter(row => targetMonths.includes(row.upload_month));

  for (const month of targetMonths) {
    const existing = await base44.entities.PortfolioValuation.filter({ upload_month: month }, '-created_date', 20000);
    for (let i = 0; i < existing.length; i += BATCH_SIZE) {
      const batch = existing.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(row => base44.entities.PortfolioValuation.delete(row.id)));
    }
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(row => base44.entities.PortfolioValuation.create(row)));
  }

  for (const month of targetMonths) {
    const monthRows = rows.filter(row => row.upload_month === month);
    await base44.entities.MonthlyUpload.create({
      upload_month: month,
      file_name: 'Roger Data - Jan to March.xlsx',
      upload_date: new Date().toISOString(),
      total_rows: monthRows.length,
      rows_imported: monthRows.length,
      rows_skipped: 0,
      import_status: 'Imported',
      notes: `Roger source repair import. AUM: ${(rogerSourceTotals[month] || 0).toFixed(2)}.`,
    });
  }

  return {
    months: targetMonths,
    rows_imported: rows.length,
    clients_imported: new Set(rows.map(row => row.account_code || row.portfolio_name).filter(Boolean)).size,
    aum_imported: rows.reduce((sum, row) => sum + (Number(row.zar_value) || 0), 0),
    totals: rogerSourceTotals,
  };
}
