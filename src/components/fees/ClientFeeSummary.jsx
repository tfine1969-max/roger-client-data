import { useMemo } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function ClientFeeSummary({ rows }) {
  const clients = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const k = r.account_code;
      if (!map[k]) map[k] = { account_code: k, portfolio_name: r.portfolio_name, rebate: 0, advisory: 0, total: 0 };
      map[k].rebate += r.rebate_fee_monthly_amount_zar ?? 0;
      map[k].advisory += r.advisory_fee_monthly_amount_zar ?? 0;
      map[k].total += r.total_monthly_fee_zar ?? 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">Client Fee Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Client','Monthly Rebate (ZAR)','Monthly Advisory (ZAR)','Total Monthly (ZAR)','Ann. Advisory (ZAR)','Ann. Rebate (ZAR)',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => (
              <tr key={c.account_code} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{c.portfolio_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.account_code}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-right text-xs text-chart-2">{fmtNum(c.rebate)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-xs text-chart-1">{fmtNum(c.advisory)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-sm font-semibold">{fmtNum(c.total)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-xs text-muted-foreground">{fmtNum(c.advisory * 12)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-xs text-muted-foreground">{fmtNum(c.rebate * 12)}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/clients/${c.account_code}`}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}