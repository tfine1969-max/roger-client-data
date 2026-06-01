import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';
import { feeOptionValues, summariseFees, withCalculatedFees } from '@/lib/fee-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { applyRulesToRows } from '@/lib/fund-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, ArrowLeft } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import ProviderLogo from '@/components/shared/ProviderLogo';
import FeeKpiRow from '@/components/fees/FeeKpiRow';
import FeeInvestmentTable from '@/components/fees/FeeInvestmentTable';
import FundBreakdown from '@/components/fees/FundBreakdown';
import FeeGapPanel from '@/components/fees/FeeGapPanel';
import RebateByFund from '@/components/fees/RebateByFund';

function groupFeeRows(rows, keyFn, seedFn) {
  const map = {};
  rows.forEach(row => {
    const key = keyFn(row);
    if (!map[key]) map[key] = seedFn(row, key);
    map[key].rebate += row.rebate_fee_monthly_amount_zar ?? 0;
    map[key].advisory += row.advisory_fee_monthly_amount_zar ?? 0;
    map[key].total += row.total_monthly_fee_zar ?? 0;
    map[key].aum += row.fee_base_zar ?? row.zar_value ?? row.month_end_market_value ?? 0;
    map[key].holdings += 1;
    if (row.account_code) map[key].clients.add(row.account_code);
    if (row.fee_required) map[key].missingFees += 1;
  });
  return Object.values(map).map(row => ({ ...row, clients: row.clients.size }));
}

export default function Fees() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [providerView, setProviderView] = useState('clients');
  const [topView, setTopView] = useState('providers');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const { data: fundMergeRules = [] } = useQuery({
    queryKey: ['fundMergeRules'],
    queryFn: () => base44.entities.FundMergeRule.list('source_name', 5000),
    staleTime: 5 * 60 * 1000,
  });

  const feeRows = useMemo(
    () => applyRulesToRows(valuations, fundMergeRules).map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)),
    [valuations, feeConfigs, fundMergeRules]
  );

  const months = useMemo(() => getSortedMonths(feeRows), [feeRows]);
  const latestMonth = selectedMonth || months[0] || '';
  const monthRows = useMemo(() => feeRows.filter(v => v.upload_month === latestMonth), [feeRows, latestMonth]);
  // Raw (pre-rule) month rows — needed so RebateByFund can create rules against original source names
  const rawMonthRows = useMemo(
    () => valuations.filter(v => v.upload_month === latestMonth).map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)),
    [valuations, latestMonth, feeConfigs]
  );
  const totals = useMemo(() => summariseFees(monthRows), [monthRows]);
  const feeRequiredCount = useMemo(() => monthRows.filter(r => r.fee_required).length, [monthRows]);
  const feeOptions = useMemo(() => feeOptionValues(feeMappingRows), []);

  const providerRows = useMemo(() => groupFeeRows(
    monthRows,
    row => row.platform || 'Unknown',
    (row, key) => ({ provider: key, rebate: 0, advisory: 0, total: 0, aum: 0, holdings: 0, clients: new Set(), missingFees: 0 })
  ).sort((a, b) => b.total - a.total), [monthRows]);

  const activeProvider = selectedProvider;
  const providerMonthRows = useMemo(
    () => monthRows.filter(row => row.platform === activeProvider),
    [monthRows, activeProvider]
  );

  const providerHistory = useMemo(() => {
    const rows = feeRows.filter(row => row.platform === activeProvider);
    return groupFeeRows(
      rows,
      row => row.upload_month,
      (row, key) => ({ month: key, rebate: 0, advisory: 0, total: 0, aum: 0, holdings: 0, clients: new Set(), missingFees: 0 })
    ).sort((a, b) => b.month.localeCompare(a.month));
  }, [feeRows, activeProvider]);

  const clientRows = useMemo(() => groupFeeRows(
    providerMonthRows,
    row => row.account_code || row.portfolio_name || 'Unknown',
    (row, key) => ({ accountCode: key, client: row.portfolio_name || 'Unknown', rebate: 0, advisory: 0, total: 0, aum: 0, holdings: 0, clients: new Set(), missingFees: 0 })
  ).sort((a, b) => b.total - a.total), [providerMonthRows]);

  const activeProviderTotals = useMemo(() => summariseFees(providerMonthRows), [providerMonthRows]);
  const invoiceRows = useMemo(
    () => clientRows.filter(row => Math.abs(row.advisory) > 0.005).sort((a, b) => a.client.localeCompare(b.client)),
    [clientRows]
  );

  const detailRows = useMemo(() => {
    const q = search.toLowerCase();
    return providerMonthRows.filter(row => {
      const matchClient = !selectedClient || row.account_code === selectedClient || row.portfolio_name === selectedClient;
      const matchSearch = !q || row.portfolio_name?.toLowerCase().includes(q) || row.investment_name?.toLowerCase().includes(q) || row.account_code?.includes(q);
      return matchClient && matchSearch;
    });
  }, [providerMonthRows, selectedClient, search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['feeConfigs'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fee Management</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>Viewing</span>
            {latestMonth ? <MonthBadge month={latestMonth} /> : <span>No data</span>}
            <span>·</span>
            <span>fees calculated from mapped annual rates divided by 12</span>
          </div>
        </div>
        <Select value={latestMonth} onValueChange={(month) => { setSelectedMonth(month); setSelectedProvider(''); setSelectedClient(''); setSearch(''); setTopView('providers'); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <FeeKpiRow
        totalRebateZar={totals.totalRebateZar}
        totalAdvisoryZar={totals.totalAdvisoryZar}
        totalFeeZar={totals.totalFeeZar}
        feeRequiredCount={feeRequiredCount}
      />

      <FeeGapPanel
        monthRows={monthRows}
        allMonthRows={feeRows}
        currentMonth={latestMonth}
        months={months}
      />

      {!activeProvider && (
        <>
        <div className="flex gap-2 bg-white border rounded-lg p-3">
          {[['providers', 'By Provider'], ['funds', 'By Fund (Rebate Breakdown)']].map(([view, label]) => (
            <button
              key={view}
              onClick={() => setTopView(view)}
              className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${topView === view ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground hover:bg-muted/40'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {topView === 'funds' && <RebateByFund monthRows={monthRows} rawMonthRows={rawMonthRows} fundMergeRules={fundMergeRules} />}

        {topView === 'providers' && <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Provider Fees This Month</h2>
              <p className="text-xs text-muted-foreground mt-1">Click a provider to review monthly totals, history, and client fee detail.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Provider','AUM (ZAR)','Clients','Holdings','Monthly Rebate','Monthly Advisory','Total Monthly',''].map(header => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {providerRows.map(row => (
                  <tr
                    key={row.provider}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => { setSelectedProvider(row.provider); setSelectedClient(''); setProviderView('clients'); setSearch(''); }}
                  >
                    <td className="px-4 py-3">
                      <ProviderLogo provider={row.provider} />
                    </td>
                    <td className="px-4 py-3 font-mono text-right">R {fmtNum(row.aum)}</td>
                    <td className="px-4 py-3 text-right">{row.clients}</td>
                    <td className="px-4 py-3 text-right">{row.holdings}</td>
                    <td className="px-4 py-3 font-mono text-right text-chart-2">R {fmtNum(row.rebate)}</td>
                    <td className="px-4 py-3 font-mono text-right text-chart-1">R {fmtNum(row.advisory)}</td>
                    <td className="px-4 py-3 font-mono text-right font-bold">R {fmtNum(row.total)}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}
        </>
      )}


      {activeProvider && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedProvider(''); setSelectedClient(''); setSearch(''); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Provider overview
            </button>
            <h2 className="text-xl font-semibold">
              <ProviderLogo provider={activeProvider} logoClassName="max-h-8 max-w-[110px]" />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Historical Monthly Fees</p>
              <button
                className="mt-3 w-full text-left rounded-md border px-3 py-2 hover:bg-muted/30 transition-colors"
                onClick={() => setProviderView('history')}
              >
                <span className="block text-sm font-medium">View monthly breakdown</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Rebate, advisory, and total by month</span>
              </button>
            </div>

            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-chart-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Monthly Rebate</p>
              <p className="mt-3 font-mono text-xl font-bold whitespace-nowrap">R {fmtNum(activeProviderTotals.totalRebateZar)}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeProvider}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-chart-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Monthly Advisory</p>
              <p className="mt-3 font-mono text-xl font-bold whitespace-nowrap">R {fmtNum(activeProviderTotals.totalAdvisoryZar)}</p>
              <p className="text-xs text-muted-foreground mt-1">Invoice amount before VAT</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-chart-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Monthly Fee</p>
              <p className="mt-3 font-mono text-xl font-bold whitespace-nowrap">R {fmtNum(activeProviderTotals.totalFeeZar)}</p>
              <p className="text-xs text-muted-foreground mt-1">{clientRows.length} clients</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 bg-white border rounded-lg p-3">
            {[
              ['clients', 'Client summary'],
              ['history', 'Monthly history'],
              ['invoice', 'Advisory invoice'],
              ['investments', 'Investment detail'],
              ['funds', 'Investment funds'],
              ['rebate-funds', 'Rebate by fund'],
            ].map(([view, label]) => (
              <button
                key={view}
                onClick={() => { setProviderView(view); setSelectedClient(''); setSearch(''); }}
                className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${providerView === view ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground hover:bg-muted/40'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {providerView === 'clients' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Client Fee Summary for {formatMonth(latestMonth)}</p>
              <p className="text-xs text-muted-foreground mt-1">Rebate and advisory are separated per client for the selected provider.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-32">AUM</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-16">Holdings</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-24">Rebate</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-24">Advisory</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                   {clientRows.map(row => (
                     <tr key={row.accountCode} className={`hover:bg-muted/20 cursor-pointer ${selectedClient === row.accountCode ? 'bg-muted/30' : ''}`} onClick={() => setSelectedClient(selectedClient === row.accountCode ? '' : row.accountCode)}>
                       <td className="px-4 py-3 min-w-[220px]">
                         <p className="font-medium leading-tight">{row.client}</p>
                         <p className="text-xs text-muted-foreground font-mono mt-1">{row.accountCode}</p>
                       </td>
                       <td className="px-4 py-3 font-mono text-right whitespace-nowrap min-w-32">R {fmtNum(row.aum)}</td>
                       <td className="px-4 py-3 text-right whitespace-nowrap min-w-16">{row.holdings}</td>
                       <td className="px-4 py-3 font-mono text-right text-chart-2 whitespace-nowrap min-w-24">R {fmtNum(row.rebate)}</td>
                       <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap min-w-24">R {fmtNum(row.advisory)}</td>
                       <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap min-w-24">R {fmtNum(row.total)}</td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot>
                   <tr className="bg-muted/30 border-t-2 font-semibold">
                     <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                     <td className="min-w-32" />
                     <td className="px-4 py-3 text-right min-w-16">{clientRows.reduce((s, row) => s + row.holdings, 0)}</td>
                     <td className="px-4 py-3 font-mono text-right text-chart-2 whitespace-nowrap min-w-24">R {fmtNum(activeProviderTotals.totalRebateZar)}</td>
                     <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap min-w-24">R {fmtNum(activeProviderTotals.totalAdvisoryZar)}</td>
                     <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap min-w-24">R {fmtNum(activeProviderTotals.totalFeeZar)}</td>
                   </tr>
                 </tfoot>
              </table>
            </div>
          </div>
          )}

          {providerView === 'history' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{activeProvider} Monthly Fee History</p>
              <p className="text-xs text-muted-foreground mt-1">Historical totals split between rebate, advisory, and total monthly fee.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-32">Rebate</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-32">Advisory</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-32">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-16">Clients</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-20">Holdings</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {providerHistory.map(row => (
                    <tr key={row.month} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap min-w-20">{formatMonth(row.month)}</td>
                      <td className="px-4 py-2.5 font-mono text-right text-chart-2 whitespace-nowrap min-w-32">R {fmtNum(row.rebate)}</td>
                      <td className="px-4 py-2.5 font-mono text-right text-chart-1 whitespace-nowrap min-w-32">R {fmtNum(row.advisory)}</td>
                      <td className="px-4 py-2.5 font-mono text-right font-bold whitespace-nowrap min-w-32">R {fmtNum(row.total)}</td>
                      <td className="px-4 py-2.5 text-right min-w-16">{row.clients}</td>
                      <td className="px-4 py-2.5 text-right min-w-20">{row.holdings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {providerView === 'invoice' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{activeProvider} Advisory Invoice Schedule</p>
              <p className="text-xs text-muted-foreground mt-1">Use this table for the monthly provider invoice. It lists advisory fees only, per client.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Client','Account','Month','Monthly Advisory Fee'].map(header => (
                      <th key={header} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoiceRows.map(row => (
                    <tr key={`${row.accountCode}-invoice`} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium min-w-48">{row.client}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground min-w-24">{row.accountCode}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap min-w-20">{formatMonth(latestMonth)}</td>
                      <td className="px-4 py-2.5 font-mono text-right font-semibold whitespace-nowrap min-w-32">R {fmtNum(row.advisory)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t-2 font-semibold">
                    <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={3}>Invoice Total</td>
                    <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap">R {fmtNum(activeProviderTotals.totalAdvisoryZar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          )}

          {providerView === 'investments' && (
          <>
          <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search selected provider holdings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            {selectedClient && (
              <button className="text-sm px-3 py-1.5 rounded-md border bg-muted/40 hover:bg-muted" onClick={() => setSelectedClient('')}>
                Clear client filter
              </button>
            )}
          </div>

          <FeeInvestmentTable rows={detailRows} feeOptions={feeOptions} onFeeUpdated={refresh} />
          </>
          )}

          {providerView === 'funds' && (
          <FundBreakdown monthRows={providerMonthRows} />
          )}

          {providerView === 'rebate-funds' && (
          <RebateByFund
            monthRows={providerMonthRows}
            rawMonthRows={valuations.filter(v => v.upload_month === latestMonth && v.platform === activeProvider).map(row => withCalculatedFees(row, feeMappingRows, feeConfigs))}
            fundMergeRules={fundMergeRules}
          />
          )}
        </div>
      )}
    </div>
  );
}