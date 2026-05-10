import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';
import { Users, BarChart3, Receipt, ChevronRight, Upload as UploadIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { withCalculatedFees } from '@/lib/fee-utils';
import { clientKey } from '@/lib/client-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const feeRows = useMemo(
    () => valuations.map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)),
    [valuations, feeConfigs]
  );

  const months = useMemo(() => getSortedMonths(feeRows), [feeRows]);
  const latestMonth = months[0] || '';
  const prevMonth = months[1] || '';

  const stats = useMemo(() => {
    const current = feeRows.filter(v => v.upload_month === latestMonth);
    const prev = feeRows.filter(v => v.upload_month === prevMonth);

    // Group by client key (identity/portfolio name) like Clients page
    const clientMap = {};
    current.forEach(v => {
      const key = clientKey(v);
      if (!clientMap[key]) clientMap[key] = true;
    });
    const clientCount = Object.keys(clientMap).length;

    const totalAUM = current.reduce((s, v) => s + zarVal(v), 0);
    const prevAUM = prev.reduce((s, v) => s + zarVal(v), 0);
    const aumChange = prevAUM ? ((totalAUM - prevAUM) / prevAUM) * 100 : null;

    const totalFees = current.reduce((s, v) => s + (v.total_monthly_fee_zar ?? 0), 0);
    const prevFees = prev.reduce((s, v) => s + (v.total_monthly_fee_zar ?? 0), 0);
    const feeChange = prevFees ? ((totalFees - prevFees) / prevFees) * 100 : null;

    const feeRequired = current.filter(v => v.fee_required).length;
    const platforms = new Set(current.map(v => v.platform).filter(Boolean)).size;

    return { clients: clientCount, totalAUM, aumChange, totalFees, feeChange, feeRequired, platforms, investmentCount: current.length };
  }, [feeRows, latestMonth, prevMonth]);

  const topClients = useMemo(() => {
    const current = feeRows.filter(v => v.upload_month === latestMonth);
    const map = {};
    current.forEach(r => {
      if (!map[r.account_code]) map[r.account_code] = { name: r.portfolio_name, code: r.account_code, total: 0 };
      map[r.account_code].total += zarVal(r);
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [feeRows, latestMonth]);

  const chartData = useMemo(() => {
    return [...getSortedMonths(feeRows)].reverse().map(m => {
      const monthRows = feeRows.filter(v => v.upload_month === m);
      return {
        month: formatMonth(m),
        total: Math.round(monthRows.reduce((s, v) => s + (v.zar_value ?? v.original_currency_value ?? 0), 0)),
        fees: Math.round(monthRows.reduce((s, v) => s + (v.total_monthly_fee_zar ?? 0), 0)),
      };
    });
  }, [feeRows]);

  const hasData = feeRows.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UploadIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">No data yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload your first monthly spreadsheet to get started.</p>
        </div>
        <Link to="/upload"><Button>Upload Monthly Data</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            Latest data: {latestMonth ? <MonthBadge month={latestMonth} /> : '—'}
          </div>
        </div>
        <Link to="/upload"><Button size="sm" variant="outline" className="gap-2"><UploadIcon className="w-4 h-4" /> Upload Data</Button></Link>
      </div>

      {/* Three nav section cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Clients */}
        <Link to="/clients" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full mb-5">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">Clients</p>
            <p className="text-3xl font-bold text-foreground">{stats.clients}</p>
            <p className="text-sm text-muted-foreground mt-1">{stats.platforms} platform{stats.platforms !== 1 ? 's' : ''} · {stats.investmentCount} investments</p>
            <div className="mt-4 pt-4 border-t w-full">
              <p className="text-xs text-muted-foreground">View all clients</p>
              <p className="text-sm font-medium mt-0.5 text-muted-foreground">Clients overview →</p>
            </div>
          </div>
        </Link>

        {/* AUM */}
        <Link to="/platforms" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full mb-5">
              <div className="w-11 h-11 rounded-lg bg-accent/15 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">Total AUM</p>
            <p className="text-3xl font-bold text-foreground">R {fmtNum(stats.totalAUM)}</p>
            {stats.aumChange !== null && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {stats.aumChange >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-positive" />
                  : <TrendingDown className="w-3.5 h-3.5 text-negative" />}
                <span className={`text-sm font-medium ${stats.aumChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {stats.aumChange >= 0 ? '+' : ''}{stats.aumChange.toFixed(2)}% vs prior month
                </span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t w-full">
              <p className="text-xs text-muted-foreground">Across {stats.platforms} platform{stats.platforms !== 1 ? 's' : ''}</p>
              <p className="text-sm font-medium mt-0.5 text-muted-foreground">View by platform →</p>
            </div>
          </div>
        </Link>

        {/* Fees */}
        <Link to="/fees" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full mb-5">
              <div className="w-11 h-11 rounded-lg bg-chart-5/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-chart-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">Monthly Fees</p>
            <p className="text-3xl font-bold text-foreground">R {fmtNum(stats.totalFees)}</p>
            {stats.feeChange !== null && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {stats.feeChange >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-positive" />
                  : <TrendingDown className="w-3.5 h-3.5 text-negative" />}
                <span className={`text-sm font-medium ${stats.feeChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {stats.feeChange >= 0 ? '+' : ''}{stats.feeChange.toFixed(2)}% vs prior month
                </span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t w-full">
              {stats.feeRequired > 0
                ? <p className="text-xs text-amber-600 font-medium">⚠ {stats.feeRequired} investment{stats.feeRequired !== 1 ? 's' : ''} missing fee config</p>
                : <p className="text-xs text-positive font-medium">✓ All fee configs set</p>}
              <p className="text-sm font-medium mt-0.5 text-muted-foreground">Manage fees →</p>
            </div>
          </div>
        </Link>
      </div>

      {/* AUM Chart */}
      {chartData.length > 1 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-5">AUM & Fees — Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={20} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} width={60} />
              <Tooltip
                formatter={(v, name) => [`R ${fmtNum(v)}`, name === 'total' ? 'AUM' : 'Fees']}
                contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid hsl(214,18%,88%)' }}
              />
              <Bar dataKey="total" name="AUM" fill="hsl(220,45%,18%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fees" name="Fees" fill="hsl(43,55%,52%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top clients + Recent uploads side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {topClients.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top Clients by AUM</h2>
              <Link to="/clients"><Button variant="ghost" size="sm" className="text-xs h-7">View all</Button></Link>
            </div>
            <div className="divide-y">
              {topClients.map((c, i) => (
                <Link key={c.code} to={`/clients/${c.code}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold font-mono">R {fmtNum(c.total)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {uploads.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Uploads</h2>
              <Link to="/upload"><Button variant="ghost" size="sm" className="text-xs h-7">Upload new</Button></Link>
            </div>
            <div className="divide-y">
              {uploads.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium leading-tight">{u.file_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatMonth(u.upload_month)} · {u.total_rows} rows</p>
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
      </div>
    </div>
  );
}