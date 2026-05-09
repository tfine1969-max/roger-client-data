import { useMemo } from 'react';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';

function getQuarter(monthStr) {
  const m = parseInt(monthStr.split('-')[1], 10);
  return `Q${Math.ceil(m / 3)} ${monthStr.split('-')[0]}`;
}

export default function FeePlatformBreakdown({ valuations }) {
  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const orderedMonths = useMemo(() => [...months].reverse(), [months]);

  const platforms = useMemo(() => [...new Set(valuations.map(v => v.platform).filter(Boolean))].sort(), [valuations]);

  // Monthly fees per platform
  const monthlyByPlatform = useMemo(() => {
    const map = {};
    valuations.forEach(r => {
      const p = r.platform || 'Unknown';
      const m = r.upload_month;
      if (!map[p]) map[p] = {};
      if (!map[p][m]) map[p][m] = { rebate: 0, advisory: 0, total: 0 };
      map[p][m].rebate += r.rebate_fee_monthly_amount_zar ?? 0;
      map[p][m].advisory += r.advisory_fee_monthly_amount_zar ?? 0;
      map[p][m].total += r.total_monthly_fee_zar ?? 0;
    });
    return map;
  }, [valuations]);

  // Quarterly totals per platform
  const quarterlyByPlatform = useMemo(() => {
    const map = {};
    valuations.forEach(r => {
      const p = r.platform || 'Unknown';
      const q = getQuarter(r.upload_month);
      if (!map[p]) map[p] = {};
      if (!map[p][q]) map[p][q] = { rebate: 0, advisory: 0, total: 0 };
      map[p][q].rebate += r.rebate_fee_monthly_amount_zar ?? 0;
      map[p][q].advisory += r.advisory_fee_monthly_amount_zar ?? 0;
      map[p][q].total += r.total_monthly_fee_zar ?? 0;
    });
    return map;
  }, [valuations]);

  const quarters = useMemo(() => {
    const qs = new Set(orderedMonths.map(getQuarter));
    return [...qs];
  }, [orderedMonths]);

  if (platforms.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No data.</div>;

  return (
    <div className="space-y-8">
      {/* Monthly breakdown */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Monthly Fees by Platform (R)</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/40 min-w-[140px]">Platform</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Fee Type</th>
                  {orderedMonths.map(m => (
                    <th key={m} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">
                      {formatMonth(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {platforms.map((p, pi) => (
                  <>
                    <tr key={`${p}-rebate`} className={pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                      <td className={`px-4 py-2 font-semibold text-sm sticky left-0 ${pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`} rowSpan={3}>{p}</td>
                      <td className="px-3 py-2 text-xs text-chart-2">Rebate</td>
                      {orderedMonths.map(m => (
                        <td key={m} className="px-4 py-2 font-mono text-right text-xs">
                          {monthlyByPlatform[p]?.[m] ? fmtNum(monthlyByPlatform[p][m].rebate) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr key={`${p}-advisory`} className={pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                      <td className="px-3 py-2 text-xs text-chart-1">Advisory</td>
                      {orderedMonths.map(m => (
                        <td key={m} className="px-4 py-2 font-mono text-right text-xs">
                          {monthlyByPlatform[p]?.[m] ? fmtNum(monthlyByPlatform[p][m].advisory) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr key={`${p}-total`} className={`border-b-2 ${pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      <td className="px-3 py-2 text-xs font-semibold">Total</td>
                      {orderedMonths.map(m => (
                        <td key={m} className="px-4 py-2 font-mono text-right text-xs font-semibold">
                          {monthlyByPlatform[p]?.[m] ? fmtNum(monthlyByPlatform[p][m].total) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quarterly breakdown */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quarterly Fees by Platform (R)</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[140px]">Platform</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Type</th>
                  {quarters.map(q => (
                    <th key={q} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">
                      {q}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {platforms.map((p, pi) => (
                  <>
                    <tr key={`${p}-q-rebate`} className={pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                      <td className={`px-4 py-2 font-semibold text-sm`} rowSpan={3}>{p}</td>
                      <td className="px-3 py-2 text-xs text-chart-2">Rebate</td>
                      {quarters.map(q => (
                        <td key={q} className="px-4 py-2 font-mono text-right text-xs">
                          {quarterlyByPlatform[p]?.[q] ? fmtNum(quarterlyByPlatform[p][q].rebate) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr key={`${p}-q-advisory`} className={pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                      <td className="px-3 py-2 text-xs text-chart-1">Advisory</td>
                      {quarters.map(q => (
                        <td key={q} className="px-4 py-2 font-mono text-right text-xs">
                          {quarterlyByPlatform[p]?.[q] ? fmtNum(quarterlyByPlatform[p][q].advisory) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                    <tr key={`${p}-q-total`} className={`border-b-2 ${pi % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      <td className="px-3 py-2 text-xs font-semibold">Total</td>
                      {quarters.map(q => (
                        <td key={q} className="px-4 py-2 font-mono text-right text-xs font-semibold">
                          {quarterlyByPlatform[p]?.[q] ? fmtNum(quarterlyByPlatform[p][q].total) : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}