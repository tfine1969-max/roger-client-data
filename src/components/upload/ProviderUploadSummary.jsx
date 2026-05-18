import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fmtNum, formatMonth, getSortedMonths, zarVal } from '@/lib/valuation-utils';

function matchesProvider(row, provider) {
  const platform = String(row.platform || '').toLowerCase();
  const target = String(provider || '').toLowerCase();
  if (!target) return false;
  if (target === 'northstar') return platform.startsWith('northstar');
  return platform === target;
}

export default function ProviderUploadSummary({ provider, uploadMonth }) {
  const { data: rows = [] } = useQuery({
    queryKey: ['providerUploadSummary', provider, uploadMonth],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
    enabled: Boolean(provider),
  });

  const summary = useMemo(() => {
    const providerRows = rows.filter(row => matchesProvider(row, provider));
    const month = uploadMonth || getSortedMonths(providerRows)[0] || '';
    const monthRows = providerRows.filter(row => row.upload_month === month);
    const aum = monthRows.reduce((sum, row) => sum + zarVal(row), 0);
    const clients = new Set(monthRows.map(row => row.client_id || row.account_code || row.portfolio_name).filter(Boolean)).size;
    return { aum, clients, rows: monthRows.length, month };
  }, [rows, provider, uploadMonth]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Uploaded AUM
      </p>
      <p className="mt-1 font-numbers text-xl font-semibold text-slate-950">
        R {fmtNum(summary.aum)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {summary.month ? `${formatMonth(summary.month)} - ${summary.clients} clients - ${summary.rows} holdings` : 'No uploaded data for this provider yet'}
      </p>
    </div>
  );
}
