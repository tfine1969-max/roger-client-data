import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSortedMonths, fmtNum, fmtCcy, formatMonth, clientMonthlyTotals, origVal, zarVal } from '@/lib/valuation-utils';
import { exportClientFundCSV } from '@/lib/export-utils';
import KpiCard from '@/components/shared/KpiCard';
import ChangeCell from '@/components/shared/ChangeCell';
import MonthBadge from '@/components/shared/MonthBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';

export default function ClientDetail() {
  const { accountCode } = useParams();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFund, setSelectedFund] = useState('');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const clientRows = useMemo(() => valuations.filter(v => v.account_code === accountCode), [valuations, accountCode]);

  const months = useMemo(() => getSortedMonths(clientRows), [clientRows]);
  const latestMonth = selectedMonth || months[0] || '';
  const prevMonth = useMemo(() => {
    const idx = months.indexOf(latestMonth);
    return months[idx + 1] || '';
  }, [months, latestMonth]);

  const clientInfo = clientRows[0] || {};

  const currentRows = useMemo(() => clientRows.filter(v => v.upload_month === latestMonth), [clientRows, latestMonth]);
  const prevRows = useMemo(() => clientRows.filter(v => v.upload_month === prevMonth), [clientRows, prevMonth]);

  // Build prev map
  const prevMap = useMemo(() => {
    const m = {};
    prevRows.forEach(r => { m[`${r.platform}||${r.investment_name}||${r.currency}`] = r; });
    return m;
  }, [prevRows]);

  const totalZar = useMemo(() => currentRows.reduce((s, r) => s + zarVal(r), 0), [currentRows]);
  const prevTotalZar = useMemo(() => prevRows.reduce((s, r) => s + zarVal(r), 0), [prevRows]);
  const changeValue = prevTotalZar ? totalZar - prevTotalZar : null;
  const changePct = prevTotalZar ? ((totalZar - prevTotalZar) / prevTotalZar) * 100 : null;
  // Keep for display
  const totalValue = totalZar;
  const prevTotalValue = prevTotalZar;

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

      {/* Month selector */}
      {months.length > 0 && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Viewing month:</p>
          <Select value={latestMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          {prevMonth && <span className="text-xs text-muted-foreground">vs {formatMonth(prevMonth)}</span>}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title={`Total Value (ZAR) · ${formatMonth(latestMonth)}`}
          value={`ZAR ${fmtNum(totalZar)}`}
          icon={DollarSign}
          accent
        />
        <KpiCard
          title={prevMonth ? `Prev Month (ZAR) · ${formatMonth(prevMonth)}` : 'Previous Month'}
          value={prevTotalZar ? `ZAR ${fmtNum(prevTotalZar)}` : '—'}
          icon={BarChart3}
        />
        <KpiCard
          title="Month-on-Month Change"
          value={changeValue !== null ? (changeValue >= 0 ? '+' : '') + fmtNum(changeValue) : 'New'}
          change={changePct}
          icon={TrendingUp}
        />
      </div>

      {/* Investment table */}
      <div>
        <h2 className="text-base font-semibold mb-3">Underlying Investments — {formatMonth(latestMonth)}</h2>
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {[
                    'Platform', 'Investment Name', 'Currency',
                    'Value (Orig. CCY)', 'Rate to ZAR', 'Value (ZAR)',
                    'Prev ZAR Value', 'ZAR Change', 'ZAR Change %',
                    'Prev Orig. Value', 'Orig. Change', 'Orig. Change %'
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentRows.map((r, i) => {
                  const key = `${r.platform}||${r.investment_name}||${r.currency}`;
                  const prev = prevMap[key];
                  const prevOrig = prev ? origVal(prev) : null;
                  const prevZar = prev ? zarVal(prev) : null;
                  const currOrig = origVal(r);
                  const currZar = zarVal(r);
                  const zarChange = prevZar !== null ? currZar - prevZar : null;
                  const zarChangePct = prevZar ? (zarChange / prevZar) * 100 : null;
                  const origChange = prevOrig !== null ? currOrig - prevOrig : null;
                  const origChangePct = prevOrig ? (origChange / prevOrig) * 100 : null;
                  const isNew = prevOrig === null;

                  const PctBadge = ({ pct }) => pct !== null ? (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pct >= 0 ? 'bg-positive text-positive' : 'bg-negative text-negative'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  ) : isNew ? <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">New</span> : <span className="text-muted-foreground">—</span>;

                  return (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.platform}</td>
                      <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{r.investment_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.currency}</td>
                      <td className="px-3 py-2.5 font-mono text-right">{fmtCcy(currOrig, r.currency)}</td>
                      <td className="px-3 py-2.5 font-mono text-right text-muted-foreground text-xs">
                        {r.currency === 'ZAR' ? '1.0000' : (r.exchange_rate_to_zar ? fmtNum(r.exchange_rate_to_zar, 4) : '—')}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-right">ZAR {fmtNum(currZar)}</td>
                      <td className="px-3 py-2.5 font-mono text-right text-muted-foreground">{prevZar !== null ? `ZAR ${fmtNum(prevZar)}` : '—'}</td>
                      <td className="px-3 py-2.5 text-right"><ChangeCell value={zarChange} pct={null} isNew={isNew} /></td>
                      <td className="px-3 py-2.5 text-right"><PctBadge pct={zarChangePct} /></td>
                      <td className="px-3 py-2.5 font-mono text-right text-muted-foreground">{prevOrig !== null ? fmtCcy(prevOrig, r.currency) : '—'}</td>
                      <td className="px-3 py-2.5 text-right"><ChangeCell value={origChange} pct={null} isNew={isNew} /></td>
                      <td className="px-3 py-2.5 text-right"><PctBadge pct={origChangePct} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border font-semibold">
                  <td className="px-3 py-2.5 text-xs uppercase tracking-wider" colSpan={3}>Total</td>
                  <td className="px-3 py-2.5 font-mono text-right text-muted-foreground text-xs" colSpan={2}></td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-right">ZAR {fmtNum(totalZar)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-muted-foreground">{prevTotalZar ? `ZAR ${fmtNum(prevTotalZar)}` : '—'}</td>
                  <td className="px-3 py-2.5 text-right"><ChangeCell value={changeValue} pct={null} isNew={!prevTotalZar} /></td>
                  <td className="px-3 py-2.5 text-right">
                    {changePct !== null ? (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${changePct >= 0 ? 'bg-positive text-positive' : 'bg-negative text-negative'}`}>
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

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