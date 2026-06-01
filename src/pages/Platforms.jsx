import { useQuery } from '@tanstack/react-query';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { effectiveExchangeRate, getSortedMonths, fmtNum, fmtCcy, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import ProviderLogo from '@/components/shared/ProviderLogo';
import { monthlyClientData } from '@/data/monthlyClientData';
import { clientDisplayName, clientKey } from '@/lib/client-utils';

const PLATFORM_LABELS = {
  'julius-baer': 'Julius Baer',
  credo: 'Credo',
  gryphon: 'Gryphon',
  prime: 'Prime',
  northstar: 'Northstar',
  'northstar-fnb': 'FNB',
  'northstar-sanlam': 'Sanlam',
  peresec: 'Peresec',
  prescient: 'Prescient',
};

const PLATFORM_IDS = {
  'julius baer': 'julius-baer',
  credo: 'credo',
  gryphon: 'gryphon',
  prime: 'prime',
  'prime investments': 'prime',
  northstar: 'northstar',
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
const platformGroupId = (id) => String(id || '').startsWith('northstar') ? 'northstar' : id;
const rowPlatformId = (row) => platformGroupId(platformId(row?.platform));
const platformLabel = (id, fallback) => PLATFORM_LABELS[id] || fallback || id;
const controlForMonth = (month) => monthlyClientData.find(m => m.id === monthToControlId(month));
const compactKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const rateLabel = (rows) => {
  const nonZarRates = rows
    .filter(row => String(row.currency || '').toUpperCase() !== 'ZAR')
    .map(row => effectiveExchangeRate(row))
    .filter(rate => Number.isFinite(rate) && rate > 0);
  const uniqueRates = [...new Set(nonZarRates.map(rate => Number(rate).toFixed(4)))];
  if (uniqueRates.length === 0) return 'Rand base';
  if (uniqueRates.length === 1) return uniqueRates[0];
  return 'Mixed';
};
const originalValueLabel = (rows, totalOrig) => {
  const currencies = [...new Set(rows.map(row => String(row.currency || 'ZAR').toUpperCase()).filter(Boolean))];
  if (currencies.length === 1) return fmtCcy(totalOrig, currencies[0]);
  return fmtNum(totalOrig);
};
const addControlClientCounts = (row, clients = []) => {
  clients.forEach(client => {
    if (client.accountCode) row.clients.add(client.accountCode);
    client.holdings?.forEach(holding => {
      if (holding.investment) row.funds.add(holding.investment);
    });
  });
};

const addSourceLabel = (row, id) => {
  if (!row.sourceLabels) row.sourceLabels = new Set();
  const label = platformLabel(id, id);
  if (label && label !== row.platform) row.sourceLabels.add(label);
};

const rand = value => `R ${fmtNum(value)}`;

export default function Platforms() {
  const navigate = useNavigate();
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [providerView, setProviderView] = useState('clients');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = filterMonth || months[0] || '';

  const platformRows = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const currentControl = controlForMonth(latestMonth);
    const map = {};

    current.forEach(r => {
      const rawId = platformId(r.platform);
      const id = platformGroupId(rawId);
      const p = platformLabel(id, r.platform || 'Unknown');
      if (!map[id]) map[id] = { platformId: id, platform: p, totalZar: 0, clients: new Set(), funds: new Set(), sourceLabels: new Set() };
      addSourceLabel(map[id], rawId);
      map[id].totalZar += zarVal(r);
      if (r.account_code) map[id].clients.add(r.account_code);
      if (r.investment_name) map[id].funds.add(r.investment_name);
    });

    Object.entries(currentControl?.providerSourceTotals || {}).forEach(([rawId, total]) => {
      const id = platformGroupId(rawId);
      const p = platformLabel(id, total.providerName);
      if (!map[id]) map[id] = { platformId: id, platform: p, totalZar: 0, clients: new Set(), funds: new Set(), sourceLabels: new Set() };
      addSourceLabel(map[id], rawId);
      map[id].totalZar += total.zarTotal;
      addControlClientCounts(map[id], currentControl.clients?.filter(client => platformGroupId(client.providerId) === id));
    });

    return Object.values(map)
      .map(p => ({ ...p, clients: p.clients.size, funds: p.funds.size, sourceLabels: [...p.sourceLabels].sort() }))
      .sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth]);

  const fundRows = useMemo(() => {
    if (!selectedPlatform) return [];
    const current = valuations.filter(v => v.upload_month === latestMonth && rowPlatformId(v) === selectedPlatform);
    const map = {};

    current.forEach(r => {
      const k = `${r.investment_name}||${r.currency}`;
      if (!map[k]) map[k] = { investment_name: r.investment_name, currency: r.currency, rows: [], totalOrig: 0, totalZar: 0, clients: new Set() };
      map[k].rows.push(r);
      map[k].totalOrig += origVal(r);
      map[k].totalZar += zarVal(r);
      map[k].clients.add(r.account_code);
    });

    return Object.values(map).map(v => ({ ...v, clients: v.clients.size, rateDisplay: rateLabel(v.rows) })).sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth, selectedPlatform]);

  const clientRows = useMemo(() => {
    if (!selectedPlatform) return [];
    const current = valuations.filter(v => v.upload_month === latestMonth && rowPlatformId(v) === selectedPlatform);
    const map = {};

    current.forEach(row => {
      const key = clientKey(row);
      if (!map[key]) map[key] = { key, rows: [], totalOrig: 0, totalZar: 0, funds: new Set() };
      map[key].rows.push(row);
      map[key].totalOrig += origVal(row);
      map[key].totalZar += zarVal(row);
      if (row.investment_name) map[key].funds.add(compactKey(row.investment_name));
    });

    return Object.values(map)
      .map(group => ({
        ...group,
        name: clientDisplayName(group.rows),
        accountCode: group.rows.find(row => row.account_code)?.account_code || '',
        originalDisplay: originalValueLabel(group.rows, group.totalOrig),
        rateDisplay: rateLabel(group.rows),
        funds: group.funds.size,
      }))
      .sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth, selectedPlatform]);

  const sourceLabelRows = useMemo(() => {
    if (!selectedPlatform) return [];
    const current = valuations.filter(v => v.upload_month === latestMonth && rowPlatformId(v) === selectedPlatform);
    const map = {};

    current.forEach(row => {
      const rawId = platformId(row.platform);
      const label = platformLabel(rawId, row.platform || 'Unknown');
      if (!map[label]) map[label] = { label, totalZar: 0, clients: new Set(), funds: new Set() };
      map[label].totalZar += zarVal(row);
      if (row.account_code) map[label].clients.add(row.account_code);
      if (row.investment_name) map[label].funds.add(row.investment_name);
    });

    const currentControl = controlForMonth(latestMonth);
    Object.entries(currentControl?.providerSourceTotals || {})
      .filter(([rawId]) => platformGroupId(rawId) === selectedPlatform)
      .forEach(([rawId, total]) => {
        const label = platformLabel(rawId, total.providerName);
        if (!map[label]) map[label] = { label, totalZar: 0, clients: new Set(), funds: new Set() };
        map[label].totalZar += total.zarTotal;
        addControlClientCounts(map[label], currentControl.clients?.filter(client => client.providerId === rawId));
      });

    return Object.values(map)
      .map(row => ({ ...row, clients: row.clients.size, funds: row.funds.size }))
      .sort((a, b) => b.totalZar - a.totalZar);
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
    const selectedPlatformName = platformLabel(selectedPlatform, selectedPlatform);
    const platformTotal = sourceLabelRows.length
      ? sourceLabelRows.reduce((s, r) => s + r.totalZar, 0)
      : clientRows.reduce((s, r) => s + r.totalZar, 0);
    return (
      <div className="space-y-6">
        <div>
          <button onClick={() => { setSelectedPlatform(null); setProviderView('clients'); }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Platforms
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold">
                <ProviderLogo providerId={selectedPlatform} provider={selectedPlatformName} logoClassName="max-h-8 max-w-[120px]" logoBoxClassName="h-12 w-36" showName={false} />
                <span>{selectedPlatformName}</span>
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MonthBadge month={latestMonth} />
                <span>{clientRows.length} clients - {fundRows.length} funds - Total AUM: <strong className="text-foreground">{rand(platformTotal)}</strong></span>
              </div>
            </div>
            <MonthFilter />
          </div>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border bg-white text-sm">
          <button
            onClick={() => setProviderView('clients')}
            className={`px-4 py-2 font-medium transition-colors ${providerView === 'clients' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
          >
            Clients
          </button>
          <button
            onClick={() => setProviderView('funds')}
            className={`border-l px-4 py-2 font-medium transition-colors ${providerView === 'funds' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
          >
            Funds
          </button>
          {sourceLabelRows.length > 1 && (
            <button
              onClick={() => setProviderView('labels')}
              className={`border-l px-4 py-2 font-medium transition-colors ${providerView === 'labels' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              Labels
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            {providerView === 'clients' ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[46%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="w-[19%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (Orig. CCY)</th>
                  <th className="w-[15%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">FX Rate</th>
                  <th className="w-[20%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (R)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientRows.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No data.</td></tr>
                )}
                {clientRows.map((r) => (
                  <tr key={r.key} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/app/clients/${encodeURIComponent(r.key)}`)}>
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.accountCode} · {r.funds} fund{r.funds === 1 ? '' : 's'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-numbers whitespace-nowrap">{r.originalDisplay}</td>
                    <td className="px-4 py-3 text-right font-numbers text-muted-foreground whitespace-nowrap">{r.rateDisplay}</td>
                    <td className="px-4 py-3 text-right font-numbers font-semibold whitespace-nowrap">{rand(r.totalZar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 text-right font-numbers text-sm">
                    {(() => {
                      const usdTotal = clientRows.flatMap(r => r.rows).filter(r => r.currency === 'USD').reduce((s, r) => s + origVal(r), 0);
                      return usdTotal > 0 ? `USD ${fmtNum(usdTotal)}` : null;
                    })()}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-numbers">{rand(platformTotal)}</td>
                </tr>
              </tfoot>
            </table>
            ) : providerView === 'funds' ? (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[42%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investment Name</th>
                  <th className="w-[18%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (Orig. CCY)</th>
                  <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">FX Rate</th>
                  <th className="w-[18%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (R)</th>
                  <th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fundRows.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No data.</td></tr>
                )}
                {fundRows.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="truncate font-medium">{r.investment_name}</p>
                      <p className="text-xs text-muted-foreground">{r.currency}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-numbers whitespace-nowrap">{fmtCcy(r.totalOrig, r.currency)}</td>
                    <td className="px-4 py-3 text-right font-numbers text-muted-foreground whitespace-nowrap">{r.rateDisplay}</td>
                    <td className="px-4 py-3 text-right font-numbers font-semibold whitespace-nowrap">{rand(r.totalZar)}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{r.clients}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 text-right font-numbers text-sm">
                    {(() => {
                      const usdTotal = fundRows.filter(r => r.currency === 'USD').reduce((s, r) => s + r.totalOrig, 0);
                      return usdTotal > 0 ? `USD ${fmtNum(usdTotal)}` : null;
                    })()}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-numbers">{rand(platformTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            ) : (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[46%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</th>
                  <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Clients</th>
                  <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Funds</th>
                  <th className="w-[18%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">AUM</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sourceLabelRows.map(row => (
                  <tr key={row.label} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-3">
                        <ProviderLogo providerId="northstar" provider="Northstar" logoBoxClassName="h-9 w-24" logoClassName="max-h-6 max-w-[76px]" showName={false} />
                        <span className="font-medium">{row.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.clients}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.funds}</td>
                    <td className="px-4 py-3 text-right font-numbers font-semibold whitespace-nowrap">{rand(row.totalZar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                  <td />
                  <td />
                  <td className="px-4 py-3 text-right font-numbers">{rand(platformTotal)}</td>
                </tr>
              </tfoot>
            </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Private client reporting</p>
          <h1 className="mt-1 font-playfair text-4xl font-semibold tracking-normal text-slate-950">Platform Allocation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consolidated assets under management by provider</p>
        </div>
        <MonthFilter />
      </div>

      {latestMonth && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reporting Month</p>
            <p className="mt-3 font-playfair text-3xl font-semibold text-slate-950">{latestMonth ? new Date(+latestMonth.split('-')[0], +latestMonth.split('-')[1] - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) : '-'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Latest reconciled valuation month</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total AUM</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-base font-semibold text-accent">R</span>
              <span className="font-numbers text-3xl font-semibold tracking-normal text-slate-950">{fmtNum(totalAUM)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across all active platforms</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provider Mix</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-numbers text-3xl font-semibold text-slate-950">{platformRows.length}</span>
              <span className="text-sm font-medium text-muted-foreground">platforms</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Largest allocation: {largestPlatform?.platform || '-'}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Provider Allocation</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review each provider's share of the month-end book.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Provider</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">AUM</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Share</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Clients</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">Funds</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {platformRows.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No data.</td></tr>
              )}
              {platformRows.map(r => (
                <tr
                  key={r.platform}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                  onClick={() => {
                    if (r.platformId === 'prime') navigate('/app/providers/prime');
                    else {
                      setSelectedPlatform(r.platformId);
                      setProviderView('clients');
                    }
                  }}
                >
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-4">
                      <ProviderLogo provider={r.platform} providerId={r.platformId} logoBoxClassName="h-10 w-28 rounded-lg border-slate-200 bg-white" logoClassName="max-h-7 max-w-[92px]" showName={false} />
                      <div>
                        <span className="text-base font-semibold text-slate-950">{r.platform}</span>
                        {r.sourceLabels?.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{r.sourceLabels.join(' / ')}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="mr-2 text-xs font-semibold text-accent">R</span>
                    <span className="font-numbers text-base font-semibold text-slate-950">{fmtNum(r.totalZar)}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {totalAUM ? `${((r.totalZar / totalAUM) * 100).toFixed(1)}%` : '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-numbers text-slate-600">{r.clients}</td>
                  <td className="px-5 py-4 text-center font-numbers text-slate-600">{r.funds}</td>
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