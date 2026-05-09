import { useMemo } from 'react';
import { fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';

export default function InvestmentTable({ clientRows, months }) {
  const orderedMonths = useMemo(() => [...months].reverse(), [months]);

  const investments = useMemo(() => {
    const keys = new Set();
    clientRows.forEach(r => keys.add(`${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`));
    const latestMonth = months[0] || '';
    return [...keys].sort((a, b) => {
      const [aa, ap, ai, ac] = a.split('||');
      const [ba, bp, bi, bc] = b.split('||');
      const aVal = clientRows.find(r => r.upload_month === latestMonth && r.account_code === aa && r.platform === ap && r.investment_name === ai && r.currency === ac);
      const bVal = clientRows.find(r => r.upload_month === latestMonth && r.account_code === ba && r.platform === bp && r.investment_name === bi && r.currency === bc);
      return (zarVal(bVal) || 0) - (zarVal(aVal) || 0);
    }).map(k => {
      const [account_code, platform, investment_name, currency] = k.split('||');
      return { key: k, account_code, platform, investment_name, currency };
    });
  }, [clientRows, months]);

  const lookup = useMemo(() => {
    const map = {};
    clientRows.forEach(r => {
      const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
      if (!map[r.upload_month]) map[r.upload_month] = {};
      map[r.upload_month][k] = (map[r.upload_month][k] || 0) + zarVal(r);
    });
    return map;
  }, [clientRows]);

  const monthTotals = useMemo(() => {
    const totals = {};
    orderedMonths.forEach(m => {
      totals[m] = investments.reduce((sum, inv) => sum + (lookup[m]?.[inv.key] ?? 0), 0);
    });
    return totals;
  }, [orderedMonths, investments, lookup]);

  if (investments.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Underlying Components - Monthly Values (ZAR)</h2>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/40 min-w-[180px]">Investment</th>
                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Account</th>
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
                  <td className="px-4 py-2.5 font-medium sticky left-0 bg-white max-w-[220px] truncate">{inv.investment_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{inv.account_code}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.platform}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.currency}</td>
                  {orderedMonths.map(m => {
                    const val = lookup[m]?.[inv.key];
                    return (
                      <td key={m} className="px-4 py-2.5 font-mono text-right text-sm">
                        {val !== undefined ? fmtNum(val) : <span className="text-muted-foreground text-xs">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border font-semibold">
                <td className="px-4 py-2.5 text-xs uppercase tracking-wider sticky left-0 bg-muted/30" colSpan={4}>Total (ZAR)</td>
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
