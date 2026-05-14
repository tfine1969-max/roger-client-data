import { useMemo } from 'react';
import { fmtNum, formatMonth, zarVal, origVal } from '@/lib/valuation-utils';
import { hasUnknownValue } from '@/lib/client-utils';
import { cn } from '@/lib/utils';

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
    }).sort((a, b) => a.split('||')[2].localeCompare(b.split('||')[2])).map(k => {
      const [account_code, platform, investment_name, currency] = k.split('||');
      return { key: k, account_code, platform, investment_name, currency };
    });
  }, [clientRows, months]);

  const lookup = useMemo(() => {
    const map = {};
    clientRows.forEach(r => {
      const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
      if (!map[r.upload_month]) map[r.upload_month] = {};
      if (!map[r.upload_month][k]) map[r.upload_month][k] = { zar: 0, orig: 0 };
      map[r.upload_month][k].zar += zarVal(r);
      map[r.upload_month][k].orig += origVal(r);
    });
    return map;
  }, [clientRows]);

  const monthTotals = useMemo(() => {
    const totals = {};
    orderedMonths.forEach(m => {
      totals[m] = {
        zar: investments.reduce((sum, inv) => sum + (lookup[m]?.[inv.key]?.zar ?? 0), 0),
        orig: investments.reduce((sum, inv) => sum + (lookup[m]?.[inv.key]?.orig ?? 0), 0),
      };
    });
    return totals;
  }, [orderedMonths, investments, lookup]);

  if (investments.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Underlying Components - Monthly Values</h2>
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
                  <th key={m} colSpan={2} className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[260px] border-l border-border/40">
                    {formatMonth(m)}
                  </th>
                ))}
              </tr>
              <tr className="border-b bg-muted/20">
                <th colSpan={4} />
                {orderedMonths.map(m => (
                  <>
                    <th key={`${m}-orig`} className="text-right px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap border-l border-border/40 min-w-[120px]">Orig. CCY</th>
                    <th key={`${m}-zar`} className="text-right px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[130px]">ZAR</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {investments.map(inv => (
                <tr key={inv.key} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium sticky left-0 bg-white max-w-[220px] truncate">{inv.investment_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                    <span className={cn(hasUnknownValue(inv.account_code) && "rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 ring-1 ring-amber-200")}>{inv.account_code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.platform}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.currency}</td>
                  {orderedMonths.map(m => {
                    const val = lookup[m]?.[inv.key];
                    return (
                      <>
                        <td key={`${m}-usd`} className="px-4 py-2.5 text-right text-sm font-numbers text-muted-foreground border-l border-border/40">
                          {val !== undefined ? fmtNum(val.orig) : <span className="text-muted-foreground text-xs">-</span>}
                        </td>
                        <td key={`${m}-zar`} className="px-4 py-2.5 text-right text-sm font-numbers text-foreground">
                          {val !== undefined ? fmtNum(val.zar) : <span className="text-muted-foreground text-xs">-</span>}
                        </td>
                      </>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border font-semibold">
                <td className="px-4 py-2.5 text-xs uppercase tracking-wider sticky left-0 bg-muted/30" colSpan={4}>Total</td>
                {orderedMonths.map(m => (
                  <>
                    <td key={`${m}-usd`} className="px-4 py-2.5 text-right font-numbers text-muted-foreground border-l border-border/40">
                      {fmtNum(monthTotals[m]?.orig || 0)}
                    </td>
                    <td key={`${m}-zar`} className="px-4 py-2.5 text-right font-numbers text-foreground">
                      {fmtNum(monthTotals[m]?.zar || 0)}
                    </td>
                  </>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
