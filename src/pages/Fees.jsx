import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, formatMonth } from '@/lib/valuation-utils';
import { summariseFees } from '@/lib/fee-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, AlertTriangle } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import FeeKpiRow from '@/components/fees/FeeKpiRow';
import FeeInvestmentTable from '@/components/fees/FeeInvestmentTable';
import FeeByGroup from '@/components/fees/FeeByGroup';
import ClientFeeSummary from '@/components/fees/ClientFeeSummary';
import FeePlatformBreakdown from '@/components/fees/FeePlatformBreakdown';

export default function Fees() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = selectedMonth || months[0] || '';
  const platforms = useMemo(() => [...new Set(valuations.map(v => v.platform).filter(Boolean))].sort(), [valuations]);

  const monthRows = useMemo(() => valuations.filter(v => v.upload_month === latestMonth), [valuations, latestMonth]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return monthRows.filter(r => {
      const matchSearch = !q || r.portfolio_name?.toLowerCase().includes(q) || r.investment_name?.toLowerCase().includes(q) || r.account_code?.includes(q);
      const matchPlatform = !filterPlatform || r.platform === filterPlatform;
      const matchFlagged = !showFlaggedOnly || r.fee_required;
      return matchSearch && matchPlatform && matchFlagged;
    });
  }, [monthRows, search, filterPlatform, showFlaggedOnly]);

  const totals = useMemo(() => summariseFees(monthRows), [monthRows]);
  const feeRequiredCount = useMemo(() => monthRows.filter(r => r.fee_required).length, [monthRows]);

  // By-platform breakdown
  const byPlatform = useMemo(() => {
    const map = {};
    monthRows.forEach(r => {
      const k = r.platform || 'Unknown';
      if (!map[k]) map[k] = { platform: k, totalFeeZar: 0, totalRebateZar: 0, totalAdvisoryZar: 0 };
      map[k].totalFeeZar += r.total_monthly_fee_zar ?? 0;
      map[k].totalRebateZar += r.rebate_fee_monthly_amount_zar ?? 0;
      map[k].totalAdvisoryZar += r.advisory_fee_monthly_amount_zar ?? 0;
    });
    return Object.values(map);
  }, [monthRows]);

  // By-investment breakdown
  const byInvestment = useMemo(() => {
    const map = {};
    monthRows.forEach(r => {
      const k = r.investment_name;
      if (!map[k]) map[k] = { investment: k, totalFeeZar: 0 };
      map[k].totalFeeZar += r.total_monthly_fee_zar ?? 0;
    });
    return Object.values(map);
  }, [monthRows]);

  // By-currency breakdown
  const byCurrency = useMemo(() => {
    const map = {};
    monthRows.forEach(r => {
      const k = r.currency || 'Unknown';
      if (!map[k]) map[k] = { currency: k, totalFeeZar: 0 };
      map[k].totalFeeZar += r.total_monthly_fee_zar ?? 0;
    });
    return Object.values(map);
  }, [monthRows]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fee Management</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>Viewing</span>
            {latestMonth ? <MonthBadge month={latestMonth} /> : <span>No data</span>}
          </div>
        </div>
        {feeRequiredCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4" />
            {feeRequiredCount} investments need fees set
          </div>
        )}
      </div>

      {/* Month selector */}
      <Select value={latestMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
        </SelectContent>
      </Select>

      <FeeKpiRow
        totalRebateZar={totals.totalRebateZar}
        totalAdvisoryZar={totals.totalAdvisoryZar}
        totalFeeZar={totals.totalFeeZar}
        feeRequiredCount={feeRequiredCount}
      />

      <Tabs defaultValue="investments">
        <TabsList>
          <TabsTrigger value="investments">Investment Detail</TabsTrigger>
          <TabsTrigger value="clients">By Client</TabsTrigger>
          <TabsTrigger value="platforms">By Platform</TabsTrigger>
          <TabsTrigger value="charts">By Group</TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search client or investment…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All platforms</SelectItem>
                {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowFlaggedOnly(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${showFlaggedOnly ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white border-border text-muted-foreground hover:bg-muted/40'}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Fee Required only
            </button>
          </div>
          <FeeInvestmentTable rows={filteredRows} onFeeUpdated={refresh} />
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <ClientFeeSummary rows={monthRows} />
        </TabsContent>

        <TabsContent value="platforms" className="mt-4">
          <FeePlatformBreakdown valuations={valuations} />
        </TabsContent>

        <TabsContent value="charts" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FeeByGroup title="Monthly Fees by Platform (ZAR)" data={byPlatform} labelKey="platform" />
            <FeeByGroup title="Monthly Fees by Currency (ZAR)" data={byCurrency} labelKey="currency" />
          </div>
          <FeeByGroup title="Monthly Fees by Investment (Top 12, ZAR)" data={byInvestment} labelKey="investment" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
