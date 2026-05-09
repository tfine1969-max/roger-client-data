import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { clientDisplayName, clientKey } from '@/lib/client-utils';
import { feeOptionValues, withCalculatedFees } from '@/lib/fee-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { exportClientFundCSV } from '@/lib/export-utils';
import InvestmentTable from '@/components/client/InvestmentTable';
import FeeInvestmentTable from '@/components/fees/FeeInvestmentTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ClientDetail() {
  const { accountCode } = useParams();
  const queryClient = useQueryClient();
  const [selectedFund, setSelectedFund] = useState('');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const decodedKey = decodeURIComponent(accountCode || '');
  const clientRows = useMemo(() => valuations.filter(v => v.account_code === decodedKey || clientKey(v) === decodedKey), [valuations, decodedKey]);
  const months = useMemo(() => getSortedMonths(clientRows), [clientRows]);
  const latestMonth = months[0] || '';
  const currentRows = useMemo(() => clientRows.filter(v => v.upload_month === latestMonth), [clientRows, latestMonth]);
  const currentFeeRows = useMemo(
    () => currentRows.map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)),
    [currentRows, feeConfigs]
  );

  const clientName = clientDisplayName(clientRows);
  const accountCodes = useMemo(() => [...new Set(clientRows.map(r => r.account_code).filter(Boolean))].sort(), [clientRows]);
  const identityNo = clientRows.find(r => r.identity_no)?.identity_no;
  const totalZar = useMemo(() => currentRows.reduce((s, r) => s + zarVal(r), 0), [currentRows]);
  const platforms = useMemo(() => [...new Set(currentRows.map(r => r.platform).filter(Boolean))].sort(), [currentRows]);

  const trendData = useMemo(() => {
    return months.map(month => ({
      month,
      total: clientRows.filter(v => v.upload_month === month).reduce((s, v) => s + zarVal(v), 0),
    })).reverse();
  }, [clientRows, months]);

  const funds = useMemo(() => {
    return [...new Set(clientRows.map(r => `${r.account_code}||${r.investment_name}||${r.platform}||${r.currency}`))].map(k => {
      const [account_code, investment_name, platform, currency] = k.split('||');
      return { key: k, account_code, investment_name, platform, currency };
    });
  }, [clientRows]);

  const fundTrendData = useMemo(() => {
    if (!selectedFund) return [];
    const [account_code, investment_name, platform, currency] = selectedFund.split('||');
    const rows = clientRows.filter(r => r.account_code === account_code && r.investment_name === investment_name && r.platform === platform && r.currency === currency);
    return [...getSortedMonths(rows)].reverse().map(m => {
      const row = rows.find(r => r.upload_month === m);
      return {
        month: formatMonth(m),
        value: row ? zarVal(row) : 0,
        unit_price: row?.month_end_unit_price ?? 0,
      };
    });
  }, [selectedFund, clientRows]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['feeConfigs'] });
  };

  const handleExport = () => {
    exportClientFundCSV(clientName, currentRows, latestMonth);
  };

  if (clientRows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No data found for client <strong>{decodedKey}</strong>.</p>
        <Link to="/clients"><Button variant="link" className="mt-2">Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{clientName}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>Accounts: <strong className="text-foreground font-mono">{accountCodes.join(', ')}</strong></span>
              {identityNo && <span>ID: <strong className="text-foreground">{identityNo}</strong></span>}
              <span>Platforms: <strong className="text-foreground">{platforms.length}</strong></span>
              <span>Total: <strong className="text-foreground font-mono">R {fmtNum(totalZar)}</strong></span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <InvestmentTable clientRows={clientRows} months={months} />

      <div>
        <h2 className="text-base font-semibold mb-3">Current Month Components and Fees</h2>
        <FeeInvestmentTable rows={currentFeeRows} feeOptions={feeOptionValues(feeMappingRows)} onFeeUpdated={refresh} />
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Combined Client Value - Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tickFormatter={m => formatMonth(m)} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(2)}M`} width={65} />
                <Tooltip
                  formatter={v => [fmtNum(v), 'Total Value']}
                  contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid hsl(214,18%,88%)' }}
                  labelFormatter={m => formatMonth(m)}
                />
                <Line type="monotone" dataKey="total" stroke="hsl(220,45%,18%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(220,45%,18%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {funds.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Underlying Component Trend</CardTitle>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select a component to view trend..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.investment_name} ({f.account_code}, {f.platform})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {selectedFund && fundTrendData.length > 0 && (
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={fundTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="val" orientation="left" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={55} />
                  <YAxis yAxisId="price" orientation="right" fontSize={11} tickLine={false} axisLine={false} width={55} />
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="val" type="monotone" dataKey="value" name="ZAR Value" stroke="hsl(220,45%,18%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="price" type="monotone" dataKey="unit_price" name="Unit Price" stroke="hsl(43,55%,52%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
