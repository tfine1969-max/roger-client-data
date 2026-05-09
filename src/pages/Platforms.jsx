import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, fmtCcy, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import ChangeCell from '@/components/shared/ChangeCell';
import MonthBadge from '@/components/shared/MonthBadge';
import ProviderLogo from '@/components/shared/ProviderLogo';
import { monthlyClientData } from '@/data/monthlyClientData';

const PLATFORM_LABELS = {
  'julius-baer': 'Julius Baer',
  credo: 'Credo',
  gryphon: 'Gryphon',
  prime: 'Prime',
  'northstar-fnb': 'Northstar FNB',
  'northstar-sanlam': 'Northstar Sanlam',
  peresec: 'Peresec',
  prescient: 'Prescient',
};

const PLATFORM_IDS = {
  'julius baer': 'julius-baer',
  credo: 'credo',
  gryphon: 'gryphon',
  prime: 'prime',
  'prime investments': 'prime',
  'northstar fnb': 'northstar-fnb',
  'northstar sanlam': 'northstar-sanlam',
  peresec: 'peresec',
  prescient: 'prescient',
};

const monthToControlId = (month) => {
  if (!month) return '';
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  const shortMonth = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  return `${shortMonth}-${year}`;
};

const platformId = (platform) => PLATFORM_IDS[String(platform || '').trim().toLowerCase()] || String(platform || 'unknown').trim().toLowerCase().replace(/\s+/g, '-');
const platformLabel = (id, fallback) => PLATFORM_LABELS[id] || fallback || id;
const controlForMonth = (month) => monthlyClientData.find(m => m.id === monthToControlId(month));
const addControlClientCounts = (row, clients = []) => {
  clients.forEach(client => {
    if (client.accountCode) row.clients.add(client.accountCode);
    client.holdings?.forEach(holding => {
      if (holding.investment) row.funds.add(holding.investment);
    });
  });
};

export default function Platforms() {
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(null);

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

  // Aggregate by platform
  const platformRows = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const prev = valuations.filter(v => v.upload_month === prevMonth);
    const currentControl = controlForMonth(latestMonth);
    const prevControl = controlForMonth(prevMonth);

    const prevZarMap = {};
    prev.forEach(r => {
      const id = platformId(r.platform);
      prevZarMap[id] = (prevZarMap[id] || 0) + zarVal(r);
    });
    Object.entries(prevControl?.providerSourceTotals || {}).forEach(([id, total]) => {
      prevZarMap[id] = total.zarTotal;
    });

    const map = {};
    current.forEach(r => {
      const id = platformId(r.platform);
      const p = platformLabel(id, r.platform || 'Unknown');
      if (!map[id]) map[id] = { platformId: id, platform: p, totalZar: 0, clients: new Set(), funds: new Set() };
      map[id].totalZar += zarVal(r);
      if (r.account_code) map[id].clients.add(r.account_code);
      if (r.investment_name) map[id].funds.add(r.investment_name);
    });

    Object.entries(currentControl?.providerSourceTotals || {}).forEach(([id, total]) => {
      const p = platformLabel(id, total.providerName);
      if (!map[id]) map[id] = { platformId: id, platform: p, totalZar: 0, clients: new Set(), funds: new Set() };
      map[id].totalZar = total.zarTotal;
      addControlClientCounts(map[id], currentControl.clients?.filter(client => client.providerId === id));
    });

    return Object.values(map).map(p => {
      const prevZar = prevZarMap[p.platformId] ?? null;
      const changeZar = prevZar !== null ? p.totalZar - prevZar : null;
      const changeZarPct = prevZar ? (changeZar / prevZar) * 100 : null;
      return { ...p, clients: p.clients.size, funds: p.funds.size, prevZar, changeZar, changeZarPct, isNew: prevZar === null };
    }).sort((a, b) => a.platform.localeCompare(b.platform));
  }, [valuations, latestMonth, prevMonth]);

  // Fund detail for selected platform
  const fundRows = useMemo(() => {
    if (!selectedPlatform) return [];
    const current = valuations.filter(v => v.upload_month === latestMonth && v.platform === selectedPlatform);
    const prev = valuations.filter(v => v.upload_month === prevMonth && v.platform === selectedPlatform);

    const prevZarMap = {};
    prev.forEach(r => { const k = `${r.investment_name}||${r.currency}`; prevZarMap[k] = (prevZarMap[k] || 0) + zarVal(r); });

    const map = {};
    current.forEach(r => {
      const k = `${r.investment_name}||${r.currency}`;
      if (!map[k]) map[k] = { investment_name: r.investment_name, currency: r.currency, totalOrig: 0, totalZar: 0, clients: new Set() };
      map[k].totalOrig += origVal(r);
      map[k].totalZar += zarVal(r);
      map[k].clients.add(r.account_code);
    });

    return Object.entries(map).map(([k, v]) => {
      const prevZar = prevZarMap[k] ?? null;
      const changeZar = prevZar !== null ? v.totalZar - prevZar : null;
      const changeZarPct = prevZar ? (changeZar / prevZar) * 100 : null;
      return { ...v, clients: v.clients.size, prevZar, changeZar, changeZarPct, isNew: prevZar === null };
    }).sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth, prevMonth, selectedPlatform]);

  const totalAUM = useMemo(() => platformRows.reduce((s, r) => s + r.totalZar, 0), [platformRows]);

  const MonthFilter = () => (
    <Select value={filterMonth} onValueChange={setFilterMonth}>
      <SelectTrigger className="w-40 h-9">
        <SelectValue placeholder="Latest month" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>Latest month</SelectItem>
        {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  // ── Drill-down view ──────────────────────────────────────────────────────────
  if (selectedPlatform) {
    const platformTotal = fundRows.reduce((s, r) => s + r.totalZar, 0);
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSelectedPlatform(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Platforms
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                <ProviderLogo provider={selectedPlatform} logoClassName="max-h-8 max-w-[120px]" />
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MonthBadge month={latestMonth} />
                <span>{fundRows.length} funds · Total AUM: <strong className="text-foreground">ZAR {fmtNum(platformTotal)}</strong></span>
              </div>
            </div>
            <MonthFilter />
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Investment Name', 'Currency', 'Value (Orig. CCY)', 'Value (ZAR)', 'Clients', 'ZAR MoM Change'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {fundRows.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No data.</td></tr>
                )}
                {fundRows.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{r.investment_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.currency}</td>
                    <td className="px-4 py-2.5 font-mono text-sm">{fmtCcy(r.totalOrig, r.currency)}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold">ZAR {fmtNum(r.totalZar)}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{r.clients}</td>
                    <td className="px-4 py-2.5"><ChangeCell value={r.changeZar} pct={r.changeZarPct} isNew={r.isNew} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t-2 font-semibold">
                  <td className="px-4 py-2.5 text-xs uppercase tracking-wider" colSpan={3}>Total</td>
                  <td className="px-4 py-2.5 font-mono">ZAR {fmtNum(platformTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Platform summary view ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platforms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Total assets under management by platform</p>
        </div>
        <MonthFilter />
      </div>

      {latestMonth && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MonthBadge month={latestMonth} />
          <span>{platformRows.length} platforms · Total AUM (ZAR): <strong className="text-foreground">ZAR {fmtNum(totalAUM)}</strong></span>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Platform', 'Total AUM (ZAR)', 'Clients', 'Funds', 'MoM Change', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {platformRows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No data.</td></tr>
              )}
              {platformRows.map(r => (
                <tr key={r.platform} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedPlatform(r.platform)}>
                  <td className="px-4 py-3 text-primary">
                    <ProviderLogo provider={r.platform} providerId={r.platformId} />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">ZAR {fmtNum(r.totalZar)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{r.clients}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{r.funds}</td>
                  <td className="px-4 py-3"><ChangeCell value={r.changeZar} pct={r.changeZarPct} isNew={r.isNew} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
