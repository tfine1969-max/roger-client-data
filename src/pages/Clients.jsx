import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { hasUnknownValue, clientKey, rowHasUnknown } from '@/lib/client-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [needsCorrectionOnly, setNeedsCorrectionOnly] = useState(false);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = filterMonth || months[0] || '';
  const platforms = useMemo(() => [...new Set(valuations.map(v => v.platform).filter(Boolean))].sort(), [valuations]);
  const currencies = useMemo(() => [...new Set(valuations.map(v => v.currency).filter(Boolean))].sort(), [valuations]);

  const clients = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const map = {};
    current.forEach(r => {
      const key = clientKey(r);
      if (!map[key]) {
        map[key] = {
          client_key: key,
          account_codes: new Set(),
          identity_no: r.identity_no,
          portfolio_name: r.portfolio_name,
          platforms: new Set(),
          currencies: new Set(),
          investments: 0,
          totalValue: 0,
          hasUnknown: false,
        };
      }
      const c = map[key];
      if (r.account_code) c.account_codes.add(r.account_code);
      if (!c.identity_no && r.identity_no) c.identity_no = r.identity_no;
      if (!c.portfolio_name && r.portfolio_name) c.portfolio_name = r.portfolio_name;
      c.platforms.add(r.platform);
      c.currencies.add(r.currency);
      c.investments += 1;
      c.totalValue += zarVal(r);
      c.hasUnknown = c.hasUnknown || rowHasUnknown(r);
    });

    return Object.values(map).map(c => ({
      ...c,
      account_codes: [...c.account_codes].sort(),
      platforms: [...c.platforms],
      currencies: [...c.currencies],
    })).sort((a, b) => (a.portfolio_name || '').localeCompare(b.portfolio_name || ''));
  }, [valuations, latestMonth]);

  const correctionCount = useMemo(() => clients.filter(c => c.hasUnknown).length, [clients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchSearch = !q ||
        c.portfolio_name?.toLowerCase().includes(q) ||
        c.account_codes.some(code => code?.toLowerCase().includes(q)) ||
        c.identity_no?.toLowerCase().includes(q);
      const matchPlatform = !filterPlatform || c.platforms.includes(filterPlatform);
      const matchCurrency = !filterCurrency || c.currencies.includes(filterCurrency);
      const matchCorrection = !needsCorrectionOnly || c.hasUnknown;
      return matchSearch && matchPlatform && matchCurrency && matchCorrection;
    });
  }, [clients, search, filterPlatform, filterCurrency, needsCorrectionOnly]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} clients · {latestMonth ? <span>Viewing <MonthBadge month={latestMonth} /></span> : 'No data'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, account code or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
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
        <Button
          type="button"
          variant={needsCorrectionOnly ? 'default' : 'outline'}
          className="h-9 gap-2"
          onClick={() => setNeedsCorrectionOnly(value => !value)}
        >
          <AlertTriangle className="w-4 h-4" />
          Needs correction
          {correctionCount > 0 && <span className={cn("rounded px-1.5 text-xs", needsCorrectionOnly ? "bg-white/20" : "bg-amber-50 text-amber-700")}>{correctionCount}</span>}
        </Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">ID Number</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platforms</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investments</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Value</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No clients found.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.client_key} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.hasUnknown && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                      <Link to={`/clients/${encodeURIComponent(c.client_key)}`} className="font-medium text-foreground hover:text-primary transition-colors">{c.portfolio_name || '-'}</Link>
                      {c.hasUnknown && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">Needs correction</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs font-mono">
                      {c.account_codes.map(code => (
                        <span key={code} className={cn("text-muted-foreground", hasUnknownValue(code) && "rounded bg-amber-50 px-1 py-0.5 text-amber-800 ring-1 ring-amber-200")}>{code}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.account_codes.length}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{c.identity_no || '-'}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.platforms.length}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.investments}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">R {fmtNum(c.totalValue)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/clients/${encodeURIComponent(c.client_key)}`}>
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
