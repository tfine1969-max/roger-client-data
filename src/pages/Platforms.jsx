import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import ChangeCell from '@/components/shared/ChangeCell';
import MonthBadge from '@/components/shared/MonthBadge';
import { exportFullMonthlyCSV } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Platforms() {
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = filterMonth || months[0] || '';
  const prevMonth = useMemo(() => {
    const idx = months.indexOf(latestMonth);
    return months[idx + 1] || '';
  }, [months, latestMonth]);

  const platforms = useMemo(() => [...new Set(valuations.map(v => v.platform).filter(Boolean))].sort(), [valuations]);

  const fundRows = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const prev = valuations.filter(v => v.upload_month === prevMonth);

    const prevMap = {};
    prev.forEach(r => { prevMap[`${r.platform}||${r.investment_name}||${r.currency}`] = (prevMap[`${r.platform}||${r.investment_name}||${r.currency}`] || 0) + (r.month_end_market_value || 0); });

    // Aggregate by platform + investment + currency
    const map = {};
    current.forEach(r => {
      const k = `${r.platform}||${r.investment_name}||${r.currency}`;
      if (!map[k]) map[k] = { platform: r.platform, investment_name: r.investment_name, currency: r.currency, totalValue: 0, clients: new Set() };
      map[k].totalValue += r.month_end_market_value || 0;
      map[k].clients.add(r.account_code);
    });

    return Object.entries(map).map(([k, v]) => {
      const prevVal = prevMap[k] ?? null;
      const changeVal = prevVal !== null ? v.totalValue - prevVal : null;
      const changePct = prevVal ? (changeVal / prevVal) * 100 : null;
      return { ...v, clients: v.clients.size, prevVal, changeVal, changePct, isNew: prevVal === null };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [valuations, latestMonth, prevMonth]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fundRows.filter(r => {
      const matchSearch = !q || r.investment_name?.toLowerCase().includes(q) || r.platform?.toLowerCase().includes(q);
      const matchPlatform = !filterPlatform || r.platform === filterPlatform;
      return matchSearch && matchPlatform;
    });
  }, [fundRows, search, filterPlatform]);

  const totalAUM = useMemo(() => filtered.reduce((s, r) => s + r.totalValue, 0), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platforms &amp; Funds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aggregated view across all clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportFullMonthlyCSV(filtered, latestMonth)} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by fund or platform…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Latest month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Latest month</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {latestMonth && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MonthBadge month={latestMonth} />
          <span>{filtered.length} funds · Total AUM: <strong className="text-foreground">{fmtNum(totalAUM)}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Platform', 'Investment Name', 'Currency', 'Total Market Value', 'Clients', 'MoM Change'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No data.</td></tr>
              )}
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs font-medium">{r.platform}</td>
                  <td className="px-4 py-2.5 font-medium">{r.investment_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.currency}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">{fmtNum(r.totalValue)}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{r.clients}</td>
                  <td className="px-4 py-2.5">
                    <ChangeCell value={r.changeVal} pct={r.changePct} isNew={r.isNew} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}