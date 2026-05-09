import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, BarChart3, DollarSign, Activity } from 'lucide-react';
import KpiCard from '@/components/shared/KpiCard';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import MonthBadge from '@/components/shared/MonthBadge';

export default function Dashboard() {
  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const { data: uploads = [] } = useQuery({
    queryKey: ['monthlyUploads'],
    queryFn: () => base44.entities.MonthlyUpload.list('-upload_month'),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = months[0] || '';
  const prevMonth = months[1] || '';

  const stats = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const prev = valuations.filter(v => v.upload_month === prevMonth);

    const clients = new Set(current.map(v => v.account_code)).size;
    const totalValue = current.reduce((s, v) => s + (v.month_end_market_value || 0), 0);

    // Build prev map
    const prevMap = {};
    prev.forEach(r => { prevMap[`${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`] = r.month_end_market_value || 0; });

    let totalChange = 0;
    let bestFund = null, bestChange = -Infinity;
    let worstFund = null, worstChange = Infinity;

    current.forEach(r => {
      const k = `${r.account_code}||${r.platform}||${r.investment_name}||${r.currency}`;
      if (prevMap[k] !== undefined) {
        const change = (r.month_end_market_value || 0) - prevMap[k];
        totalChange += change;
        if (change > bestChange) { bestChange = change; bestFund = r; }
        if (change < worstChange) { worstChange = change; worstFund = r; }
      }
    });

    const prevTotal = prev.reduce((s, v) => s + (v.month_end_market_value || 0), 0);
    const changePct = prevTotal ? (totalChange / prevTotal) * 100 : null;

    return { clients, totalValue, totalChange, changePct, bestFund, bestChange, worstFund, worstChange, investmentCount: current.length };
  }, [valuations, latestMonth, prevMonth]);

  // Monthly trend chart
  const chartData = useMemo(() => {
    const months = [...getSortedMonths(valuations)].reverse();
    return months.map(m => ({
      month: formatMonth(m),
      total: Math.round(valuations.filter(v => v.upload_month === m).reduce((s, v) => s + (v.month_end_market_value || 0), 0)),
    }));
  }, [valuations]);

  // Top clients by value
  const topClients = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const map = {};
    current.forEach(r => {
      if (!map[r.account_code]) map[r.account_code] = { name: r.portfolio_name, code: r.account_code, total: 0 };
      map[r.account_code].total += r.month_end_market_value || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [valuations, latestMonth]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Latest data:</p>
            {latestMonth ? <MonthBadge month={latestMonth} /> : <span className="text-sm text-muted-foreground">No data — upload a spreadsheet to begin.</span>}
          </div>
        </div>
        <Link to="/upload"><Button size="sm">Upload Monthly Data</Button></Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={stats.clients}
          icon={Users}
          accent
        />
        <KpiCard
          title={`Total AUM${latestMonth ? ` · ${formatMonth(latestMonth)}` : ''}`}
          value={latestMonth ? fmtNum(stats.totalValue) : '—'}
          change={stats.changePct}
          changeLabel="vs prior month"
          icon={DollarSign}
        />
        <KpiCard
          title="Underlying Investments"
          value={stats.investmentCount}
          subtitle={latestMonth ? formatMonth(latestMonth) : undefined}
          icon={BarChart3}
        />
        <KpiCard
          title="Month-on-Month Change"
          value={stats.totalChange !== 0 ? (stats.totalChange > 0 ? '+' : '') + fmtNum(stats.totalChange) : '—'}
          change={stats.changePct}
          icon={Activity}
        />
      </div>

      {/* Best/Worst */}
      {(stats.bestFund || stats.worstFund) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.bestFund && (
            <div className="bg-white border rounded-lg p-5">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-positive" /> Best Performing Fund
              </p>
              <p className="font-semibold text-sm text-foreground truncate">{stats.bestFund.investment_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.bestFund.platform} · {stats.bestFund.portfolio_name}</p>
              <p className="text-lg font-semibold text-positive mt-2">+{fmtNum(stats.bestChange)}</p>
            </div>
          )}
          {stats.worstFund && (
            <div className="bg-white border rounded-lg p-5">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-negative" /> Largest Decline
              </p>
              <p className="font-semibold text-sm text-foreground truncate">{stats.worstFund.investment_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.worstFund.platform} · {stats.worstFund.portfolio_name}</p>
              <p className="text-lg font-semibold text-negative mt-2">{fmtNum(stats.worstChange)}</p>
            </div>
          )}
        </div>
      )}

      {/* Monthly AUM Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Total AUM by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} width={60} />
                <Tooltip
                  formatter={v => [fmtNum(v), 'Total AUM']}
                  contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid hsl(214,18%,88%)' }}
                />
                <Bar dataKey="total" fill="hsl(220,45%,18%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top clients */}
      {topClients.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top Clients by AUM</h2>
            <Link to="/clients"><Button variant="ghost" size="sm" className="text-xs">View all</Button></Link>
          </div>
          <div className="divide-y">
            {topClients.map((c, i) => (
              <Link key={c.code} to={`/clients/${c.code}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold font-mono">{fmtNum(c.total)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent uploads */}
      {uploads.slice(0, 3).length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-foreground">Recent Uploads</h2>
          </div>
          <div className="divide-y">
            {uploads.slice(0, 3).map(u => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{u.file_name}</p>
                  <p className="text-xs text-muted-foreground">{u.upload_month} · {u.total_rows} rows · {u.uploaded_by}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  u.import_status === 'Imported' ? 'bg-green-50 text-green-700' :
                  u.import_status === 'Failed' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>{u.import_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No data yet. <Link to="/upload" className="text-primary underline underline-offset-2">Upload your first monthly spreadsheet</Link> to get started.</p>
        </div>
      )}
    </div>
  );
}