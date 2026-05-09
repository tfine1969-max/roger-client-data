import { useMemo } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';

export default function InvestmentTable({ clientRows, months }) {
  // Show months in chronological order (oldest → newest)
  const orderedMonths = useMemo(() => [...months].reverse(), [months]);

  // Build unique investment keys: platform || investment_name || currency
  const investments = useMemo(() => {
    const keys = new Set();
    clientRows.forEach(r => keys.add(`${r.platform}||${r.investment_name}||${r.currency}`));
    // Sort by latest month value descending
    const latestMonth = months[0] || '';
    return [...keys].sort((a, b) => {
      const [ap, ai, ac] = a.split('||');
      const [bp, bi, bc] = b.split('||');
      const aVal = clientRows.find(r => r.upload_month === latestMonth && r.platform === ap && r.investment_name === ai && r.currency === ac);
      const bVal = clientRows.find(r => r.upload_month === latestMonth && r.platform === bp && r.investment_name === bi && r.currency === bc);
      return (zarVal(bVal) || 0) - (zarVal(aVal) || 0);
    }).map(k => {
      const [platform, investment_name, currency] = k.split('||');
      return { key: k, platform, investment_name, currency };
    });
  }, [clientRows, months]);

  // Build lookup: month -> investment_key -> zarVal
  const lookup = useMemo(() => {
    const map = {};
    clientRows.forEach(r => {
      const k = `${r.platform}||${r.investment_name}||${r.currency}`;
      if (!map[r.upload_month]) map[r.upload_month] = {};
      map[r.upload_month][k] = zarVal(r);
    });
    return map;
  }, [clientRows]);

  // Monthly totals
  const monthTotals = useMemo(() => {
    const t = {};
    orderedMonths.forEach(m => {
      t[m] = investments.reduce((s, inv) => s + (lookup[m]?.[inv.key] ?? 0), 0);
    });
    return t;
  }, [orderedMonths, investments, lookup]);

  if (investments.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Underlying Investments — Monthly Values (ZAR)</h2>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/40 min-w-[200px]">Investment</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Platform</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">CCY</th>
                {orderedMonths.map(m => (
                  <th key={m} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[130px]">
                    {formatMonth(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {investments.map(inv => (
                <tr key={inv.key} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium sticky left-0 bg-white max-w-[200px] truncate">{inv.investment_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.platform}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.currency}</td>
                  {orderedMonths.map(m => {
                    const val = lookup[m]?.[inv.key];
                    return (
                      <td key={m} className="px-4 py-2.5 font-mono text-right text-sm">
                        {val !== undefined ? fmtNum(val) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border font-semibold">
                <td className="px-4 py-2.5 text-xs uppercase tracking-wider sticky left-0 bg-muted/30" colSpan={3}>Total (ZAR)</td>
                {orderedMonths.map(m => (
                  <td key={m} className="px-4 py-2.5 font-mono text-right">
                    {fmtNum(monthTotals[m] || 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}