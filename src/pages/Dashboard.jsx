import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import ClientCard from '@/components/clients/ClientCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list(),
  });

  const { data: valueUpdates = [] } = useQuery({
    queryKey: ['valueUpdates'],
    queryFn: () => base44.entities.ValueUpdate.list(),
  });

  const stats = useMemo(() => {
    const totalCurrent = investments.reduce((s, i) => s + (i.current_value || 0), 0);
    const totalInitial = investments.reduce((s, i) => s + (i.initial_value || 0), 0);
    const totalGain = totalCurrent - totalInitial;
    const gainPercent = totalInitial ? (totalGain / totalInitial) * 100 : 0;
    return { totalCurrent, totalInitial, totalGain, gainPercent, clientCount: clients.length, investmentCount: investments.length };
  }, [clients, investments]);

  // Per-client stats for top clients
  const clientStats = useMemo(() => {
    return clients.slice(0, 5).map(client => {
      const clientInvs = investments.filter(i => i.client_id === client.id);
      const totalCurrent = clientInvs.reduce((s, i) => s + (i.current_value || 0), 0);
      const totalInitial = clientInvs.reduce((s, i) => s + (i.initial_value || 0), 0);
      const gain = totalInitial ? ((totalCurrent - totalInitial) / totalInitial) * 100 : 0;
      return { client, totalValue: totalCurrent, investmentCount: clientInvs.length, gainPercent: gain };
    });
  }, [clients, investments]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all client investments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Portfolio" value={`$${stats.totalCurrent.toLocaleString()}`} icon={DollarSign} trend={stats.gainPercent} />
        <StatsCard title="Total Gain/Loss" value={`$${stats.totalGain.toLocaleString()}`} icon={TrendingUp} />
        <StatsCard title="Clients" value={stats.clientCount} icon={Users} subtitle={`${stats.investmentCount} investments`} />
        <StatsCard title="Investments" value={stats.investmentCount} icon={BarChart3} />
      </div>

      {/* Chart */}
      <PortfolioChart valueUpdates={valueUpdates} investments={investments} />

      {/* Recent Clients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Clients</h2>
          <Link to="/clients">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {clientStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No clients yet. Add your first client to get started.</p>
          )}
          {clientStats.map(({ client, totalValue, investmentCount, gainPercent }) => (
            <ClientCard
              key={client.id}
              client={client}
              totalValue={totalValue}
              investmentCount={investmentCount}
              gainPercent={gainPercent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}