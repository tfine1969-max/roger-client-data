import { useMemo, useState } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

function summariseFund(rows) {
  let rebate = 0, advisory = 0, total = 0, aum = 0;
  const clients = new Set();
  const platforms = new Set();
  rows.forEach(r => {
    rebate += r.rebate_fee_monthly_amount_zar ?? 0;
    advisory += r.advisory_fee_monthly_amount_zar ?? 0;
    total += r.total_monthly_fee_zar ?? 0;
    aum += r.fee_base_zar ?? r.zar_value ?? r.month_end_market_value ?? 0;
    if (r.account_code) clients.add(r.account_code);
    if (r.platform) platforms.add(r.platform);
  });
  return { rebate, advisory, total, aum, clients: clients.size, platforms: [...platforms] };
}

export default function RebateByFund({ monthRows }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rebate');
  const [sortDir, setSortDir] = useState('desc');

  const fundRows = useMemo(() => {
    const map = {};
    monthRows.forEach(r => {
      const fund = r.investment_name || 'Unknown';
      if (!map[fund]) map[fund] = [];
      map[fund].push(r);
    });
    return Object.entries(map).map(([fund, rows]) => ({
      fund,
      ...summariseFund(rows),
    }));
  }, [monthRows]);

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? fundRows.filter(r => r.fund.toLowerCase().includes(q))
      : fundRows;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [fundRows, search, sortBy, sortDir]);

  const totals = useMemo(() => sorted.reduce(
    (acc, r) => ({ rebate: acc.rebate + r.rebate, advisory: acc.advisory + r.advisory, total: acc.total + r.total, aum: acc.aum + r.aum }),
    { rebate: 0, advisory: 0, total: 0, aum: 0 }
  ), [sorted]);

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  }

  const thClass = "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Rebate by Investment Fund</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total monthly rebate earned per fund across all providers · {fundRows.length} funds
          </p>
        </div>
        <div className="relative min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search fund name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className={`${thClass} text-left`} onClick={() => handleSort('fund')}>
                Fund <SortIcon col="fund" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('aum')}>
                AUM (ZAR) <SortIcon col="aum" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('clients')}>
                Clients <SortIcon col="clients" />
              </th>
              <th className={`${thClass} text-left hidden md:table-cell`}>
                Platforms
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('rebate')}>
                Monthly Rebate <SortIcon col="rebate" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('advisory')}>
                Monthly Advisory <SortIcon col="advisory" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('total')}>
                Total Monthly <SortIcon col="total" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No funds found.</td>
              </tr>
            )}
            {sorted.map(row => (
              <tr key={row.fund} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium max-w-xs">
                  <span className="block truncate" title={row.fund}>{row.fund}</span>
                </td>
                <td className="px-4 py-3 font-mono text-right whitespace-nowrap text-muted-foreground">
                  R {fmtNum(row.aum)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{row.clients}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {row.platforms.map(p => (
                      <span key={p} className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-right text-chart-2 font-semibold whitespace-nowrap">
                  R {fmtNum(row.rebate)}
                </td>
                <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap">
                  R {fmtNum(row.advisory)}
                </td>
                <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap">
                  R {fmtNum(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-4 py-3 text-xs uppercase tracking-wider">
                Total ({sorted.length} fund{sorted.length !== 1 ? 's' : ''})
              </td>
              <td className="px-4 py-3 font-mono text-right whitespace-nowrap text-muted-foreground">
                R {fmtNum(totals.aum)}
              </td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3 font-mono text-right text-chart-2 whitespace-nowrap">
                R {fmtNum(totals.rebate)}
              </td>
              <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap">
                R {fmtNum(totals.advisory)}
              </td>
              <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap">
                R {fmtNum(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}