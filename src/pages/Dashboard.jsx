import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import ClientCard from '@/components/clients/ClientCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list(),
  });

  const { data: monthlyValues = [] } = useQuery({
    queryKey: ['monthlyValues'],
    queryFn: () => base44.entities.MonthlyValue.list(),
  });

  // Find the latest month across all data
  const latestMonth = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort((a, b) => b.localeCompare(a));
    return months[0] || '';
  }, [monthlyValues]);

  const prevMonth = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort((a, b) => b.localeCompare(a));
    return months[1] || '';
  }, [monthlyValues]);

  const stats = useMemo(() => {
    const latestVals = monthlyValues.filter(v => v.month === latestMonth);
    const prevVals = monthlyValues.filter(v => v.month === prevMonth);
    const total = latestVals.reduce((s, v) => s + (v.market_value || 0), 0);
    const prevTotal = prevVals.reduce((s, v) => s + (v.market_value || 0), 0);
    const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;
    return { total, change };
  }, [monthlyValues, latestMonth, prevMonth]);

  // Per-client stats using latest month
  const clientStats = useMemo(() => {
    return clients.slice(0, 8).map(client => {
      const clientInvs = investments.filter(i => i.client_id === client.id);
      const invIds = new Set(clientInvs.map(i => i.id));
      const latestVals = monthlyValues.filter(v => invIds.has(v.investment_id) && v.month === latestMonth);
      const prevVals = monthlyValues.filter(v => invIds.has(v.investment_id) && v.month === prevMonth);
      const total = latestVals.reduce((s, v) => s + (v.market_value || 0), 0);
      const prevTotal = prevVals.reduce((s, v) => s + (v.market_value || 0), 0);
      const gain = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;
      return { client, totalValue: total, investmentCount: clientInvs.length, gainPercent: gain };
    });
  }, [clients, investments, monthlyValues, latestMonth, prevMonth]);

  // Monthly trend chart data
  const chartData = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort();
    return months.map(month => ({
      month,
      total: Math.round(monthlyValues.filter(v => v.month === month).reduce((s, v) => s + (v.market_value || 0), 0)),
    }));
  }, [monthlyValues]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {latestMonth ? `Latest data: ${latestMonth}` : 'No data imported yet'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={`Total AUM${latestMonth ? ` (${latestMonth})` : ''}`}
          value={stats.total ? stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
          icon={DollarSign}
          trend={stats.change}
        />
        <StatsCard title="Clients" value={clients.length} icon={Users} />
        <StatsCard title="Investments" value={investments.length} icon={BarChart3} />
        <StatsCard title="Months on Record" value={[...new Set(monthlyValues.map(v => v.month))].length} icon={TrendingUp} />
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Total AUM by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={v => [v.toLocaleString(), 'Total Value']} contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                <Bar dataKey="total" fill="hsl(222, 47%, 18%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Clients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Clients</h2>
          <Link to="/clients"><Button variant="outline" size="sm">View All</Button></Link>
        </div>
        <div className="space-y-3">
          {clientStats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No data yet. Go to <Link to="/import" className="underline text-foreground">Import</Link> to upload your spreadsheet.</p>
            </div>
          )}
          {clientStats.map(({ client, totalValue, investmentCount, gainPercent }) => (
            <ClientCard key={client.id} client={client} totalValue={totalValue} investmentCount={investmentCount} gainPercent={gainPercent} latestMonth={latestMonth} />
          ))}
        </div>
      </div>
    </div>
  );
}