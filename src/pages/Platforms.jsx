import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, fmtCcy, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ArrowLeft } from 'lucide-react';
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

  const platformRows = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const currentControl = controlForMonth(latestMonth);
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

    return Object.values(map)
      .map(p => ({ ...p, clients: p.clients.size, funds: p.funds.size }))
      .sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth]);

  const fundRows = useMemo(() => {
    if (!selectedPlatform) return [];
    const current = valuations.filter(v => v.upload_month === latestMonth && v.platform === selectedPlatform);
    const map = {};

    current.forEach(r => {
      const k = `${r.investment_name}||${r.currency}`;
      if (!map[k]) map[k] = { investment_name: r.investment_name, currency: r.currency, totalOrig: 0, totalZar: 0, clients: new Set() };
      map[k].totalOrig += origVal(r);
      map[k].totalZar += zarVal(r);
      map[k].clients.add(r.account_code);
    });

    return Object.values(map).map(v => ({ ...v, clients: v.clients.size })).sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth, selectedPlatform]);

  const totalAUM = useMemo(() => platformRows.reduce((s, r) => s + r.totalZar, 0), [platformRows]);
  const largestPlatform = platformRows[0];

  const MonthFilter = () => (
    <Select value={filterMonth} onValueChange={setFilterMonth}>
      <SelectTrigger className="h-10 w-48 bg-white">
        <SelectValue placeholder="Latest month" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>Latest month</SelectItem>
        {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  if (selectedPlatform) {
    const platformTotal = fundRows.reduce((s, r) => s + r.totalZar, 0);
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => setSelectedPlatform(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Platforms
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                <ProviderLogo provider={selectedPlatform} logoClassName="max-h-8 max-w-[120px]" logoBoxClassName="h-12 w-36" />
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MonthBadge month={latestMonth} />
                <span>{fundRows.length} funds - Total AUM: <strong className="text-foreground">ZAR {fmtNum(platformTotal)}</strong></span>
              </div>
            </div>
            <MonthFilter />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Investment Name', 'Currency', 'Value (Orig. CCY)', 'Value (ZAR)', 'Clients'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {fundRows.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No data.</td></tr>
                )}
                {fundRows.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{r.investment_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.currency}</td>
                    <td className="px-4 py-3 font-numbers text-sm">{fmtCcy(r.totalOrig, r.currency)}</td>
                    <td className="px-4 py-3 font-numbers font-semibold">ZAR {fmtNum(r.totalZar)}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{r.clients}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={3}>Total</td>
                  <td className="px-4 py-3 font-numbers">ZAR {fmtNum(platformTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Platforms</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Total assets under management by platform</p>
        </div>
        <MonthFilter />
      </div>

      {latestMonth && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reporting Month</p>
            <div className="mt-2"><MonthBadge month={latestMonth} /></div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total AUM</p>
            <p className="mt-1 font-numbers text-2xl font-semibold">ZAR {fmtNum(totalAUM)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platforms</p>
            <p className="mt-1 text-2xl font-semibold">{platformRows.length}</p>
            {largestPlatform && <p className="mt-1 text-xs text-muted-foreground">Largest: {largestPlatform.platform}</p>}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Provider</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">AUM (ZAR)</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Share</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Clients</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Funds</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {platformRows.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No data.</td></tr>
              )}
              {platformRows.map(r => (
                <tr key={r.platform} className="group cursor-pointer transition-colors hover:bg-muted/20" onClick={() => setSelectedPlatform(r.platform)}>
                  <td className="px-5 py-4 text-center">
                   <div className="inline-flex flex-col items-center gap-1.5">
                     <ProviderLogo provider={r.platform} providerId={r.platformId} logoBoxClassName="h-12 w-36" logoClassName="max-h-8 max-w-[120px]" showName={false} />
                     <span className="text-sm font-semibold text-foreground">{r.platform}</span>
                   </div>
                  </td>
                  <td className="px-5 py-4 text-center font-numbers text-lg font-semibold whitespace-nowrap">ZAR {fmtNum(r.totalZar)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {totalAUM ? `${((r.totalZar / totalAUM) * 100).toFixed(1)}%` : '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{r.clients}</td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{r.funds}</td>
                  <td className="px-5 py-4">
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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