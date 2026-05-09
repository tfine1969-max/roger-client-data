import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChangeCell from '@/components/shared/ChangeCell';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const { data: valuations = [], isLoading } = useQuery({
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
  const currencies = useMemo(() => [...new Set(valuations.map(v => v.currency).filter(Boolean))].sort(), [valuations]);

  const clients = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const prev = valuations.filter(v => v.upload_month === prevMonth);

    // Build prev map (ZAR)
    const prevMap = {};
    prev.forEach(r => { prevMap[`${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`] = zarVal(r); });

    // Group by account_code
    const map = {};
    current.forEach(r => {
      if (!r.account_code) return;
      if (!map[r.account_code]) map[r.account_code] = {
        account_code: r.account_code,
        identity_no: r.identity_no,
        portfolio_name: r.portfolio_name,
        platforms: new Set(),
        currencies: new Set(),
        investments: 0,
        totalValue: 0,
        prevValue: 0,
        rows: [],
      };
      const c = map[r.account_code];
      c.platforms.add(r.platform);
      c.currencies.add(r.currency);
      c.investments++;
      c.totalValue += zarVal(r);
      const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
      if (prevMap[k] !== undefined) c.prevValue += prevMap[k];
      c.rows.push(r);
    });

    return Object.values(map).map(c => ({
      ...c,
      platforms: [...c.platforms],
      currencies: [...c.currencies],
      changeValue: c.prevValue ? c.totalValue - c.prevValue : null,
      changePct: c.prevValue ? ((c.totalValue - c.prevValue) / c.prevValue) * 100 : null,
      isNew: !c.prevValue,
    })).sort((a, b) => (a.portfolio_name || '').localeCompare(b.portfolio_name || ''));
  }, [valuations, latestMonth, prevMonth]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchSearch = !q || c.portfolio_name?.toLowerCase().includes(q) || c.account_code?.includes(q) || c.identity_no?.includes(q);
      const matchPlatform = !filterPlatform || c.platforms.includes(filterPlatform);
      const matchCurrency = !filterCurrency || c.currencies.includes(filterCurrency);
      return matchSearch && matchPlatform && matchCurrency;
    });
  }, [clients, search, filterPlatform, filterCurrency]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} clients · {latestMonth ? <span>Viewing <MonthBadge month={latestMonth} /></span> : 'No data'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, account code or ID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Latest month</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCurrency} onValueChange={setFilterCurrency}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="All currencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All currencies</SelectItem>
            {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">ID Number</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platforms</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investments</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Value</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">MoM Change</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No clients found.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.account_code} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/clients/${c.account_code}`} className="font-medium text-foreground hover:text-primary transition-colors">{c.portfolio_name || '—'}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.account_code}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{c.identity_no || '—'}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.platforms.length}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.investments}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">R {fmtNum(c.totalValue)}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <ChangeCell value={c.changeValue} pct={c.changePct} isNew={c.isNew} />
                  </td>
                  <td className="px-4 py-3">
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
    </div>
  );
}