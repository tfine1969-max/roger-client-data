import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';

function matchesProvider(row, provider) {
  const platform = String(row.platform || '').toLowerCase();
  const target = String(provider || '').toLowerCase();
  if (!target) return false;
  if (target === 'northstar') return platform.startsWith('northstar');
  return platform === target;
}

export default function ProviderUploadSummary({ provider, uploadMonth }) {
  const { data: monthRows = [] } = useQuery({
    queryKey: ['providerUploadSummary', provider, uploadMonth],
    queryFn: () => base44.entities.PortfolioValuation.filter({ upload_month: uploadMonth }, '-created_date', 5000),
    enabled: Boolean(uploadMonth && provider),
  });

  const summary = useMemo(() => {
    const rows = monthRows.filter(row => matchesProvider(row, provider));
    const aum = rows.reduce((sum, row) => sum + zarVal(row), 0);
    const clients = new Set(rows.map(row => row.client_id || row.account_code || row.portfolio_name).filter(Boolean)).size;
    return { aum, clients, rows: rows.length };
  }, [monthRows, provider]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Uploaded AUM
      </p>
      <p className="mt-1 font-numbers text-xl font-semibold text-slate-950">
        R {fmtNum(summary.aum)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {uploadMonth ? `${formatMonth(uploadMonth)} - ${summary.clients} clients - ${summary.rows} holdings` : 'Select a month to view provider total'}
      </p>
    </div>
  );
}
