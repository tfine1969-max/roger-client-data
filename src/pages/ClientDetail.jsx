import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSortedMonths, fmtNum, formatMonth, clientMonthlyTotals, zarVal } from '@/lib/valuation-utils';
import { exportClientFundCSV } from '@/lib/export-utils';
import InvestmentTable from '@/components/client/InvestmentTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';


export default function ClientDetail() {
  const { accountCode } = useParams();
  const [selectedFund, setSelectedFund] = useState('');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const clientRows = useMemo(() => valuations.filter(v => v.account_code === accountCode), [valuations, accountCode]);

  const months = useMemo(() => getSortedMonths(clientRows), [clientRows]);
  const latestMonth = months[0] || '';

  const clientInfo = clientRows[0] || {};

  const currentRows = useMemo(() => clientRows.filter(v => v.upload_month === latestMonth), [clientRows, latestMonth]);

  const totalZar = useMemo(() => currentRows.reduce((s, r) => s + zarVal(r), 0), [currentRows]);

  // Monthly trend for portfolio
  const trendData = useMemo(() => clientMonthlyTotals(clientRows, accountCode), [clientRows, accountCode]);

  // Fund list for fund trend selector
  const funds = useMemo(() => {
    return [...new Set(clientRows.map(r => `${r.investment_name}||${r.platform}||${r.currency}`))].map(k => {
      const [investment_name, platform, currency] = k.split('||');
      return { key: k, investment_name, platform, currency };
    });
  }, [clientRows]);

  // Fund trend data
  const fundTrendData = useMemo(() => {
    if (!selectedFund) return [];
    const [investment_name, platform, currency] = selectedFund.split('||');
    const rows = clientRows.filter(r => r.investment_name === investment_name && r.platform === platform && r.currency === currency);
    return [...getSortedMonths(rows)].reverse().map(m => {
      const row = rows.find(r => r.upload_month === m);
      return {
        month: formatMonth(m),
        value: row?.month_end_market_value ?? 0,
        unit_price: row?.month_end_unit_price ?? 0,
      };
    });
  }, [selectedFund, clientRows]);

  const handleExport = () => {
    exportClientFundCSV(clientInfo.portfolio_name || accountCode, currentRows, latestMonth);
  };

  if (clientRows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No data found for account <strong>{accountCode}</strong>.</p>
        <Link to="/clients"><Button variant="link" className="mt-2">← Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{clientInfo.portfolio_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>Account: <strong className="text-foreground font-mono">{accountCode}</strong></span>
              {clientInfo.identity_no && <span>ID: <strong className="text-foreground">{clientInfo.identity_no}</strong></span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Investment table — months as columns */}
      <InvestmentTable clientRows={clientRows} months={months} />

      {/* Portfolio trend chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Portfolio Total Value — Monthly Trend</CardTitle>
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

      {/* Fund trend */}
      {funds.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Underlying Fund Trend</CardTitle>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select a fund to view trend…" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.investment_name} ({f.platform})</SelectItem>
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
                  <Line yAxisId="val" type="monotone" dataKey="value" name="Market Value" stroke="hsl(220,45%,18%)" strokeWidth={2} dot={{ r: 3 }} />
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
