import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';
import { ArrowLeft, Mail, Phone, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/dashboard/StatsCard';
import InvestmentTable from '@/components/investments/InvestmentTable';
import AddInvestmentDialog from '@/components/investments/AddInvestmentDialog';
import PortfolioChart from '@/components/dashboard/PortfolioChart';

export default function ClientDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const client = clients.find(c => c.id === id);

  const { data: allInvestments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list(),
  });

  const { data: allUpdates = [] } = useQuery({
    queryKey: ['valueUpdates'],
    queryFn: () => base44.entities.ValueUpdate.list(),
  });

  const investments = useMemo(() => allInvestments.filter(i => i.client_id === id), [allInvestments, id]);
  const valueUpdates = useMemo(() => allUpdates.filter(u => u.client_id === id), [allUpdates, id]);

  const stats = useMemo(() => {
    const totalCurrent = investments.reduce((s, i) => s + (i.current_value || 0), 0);
    const totalInitial = investments.reduce((s, i) => s + (i.initial_value || 0), 0);
    const totalGain = totalCurrent - totalInitial;
    const gainPercent = totalInitial ? (totalGain / totalInitial) * 100 : 0;
    return { totalCurrent, totalInitial, totalGain, gainPercent };
  }, [investments]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['investments'] });
    queryClient.invalidateQueries({ queryKey: ['valueUpdates'] });
  };

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Client not found.</p>
        <Link to="/clients"><Button variant="link">← Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{client.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                {client.email && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <AddInvestmentDialog clientId={id} onCreated={refresh} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Portfolio Value" value={`$${stats.totalCurrent.toLocaleString()}`} icon={DollarSign} trend={stats.gainPercent} />
        <StatsCard title="Total Invested" value={`$${stats.totalInitial.toLocaleString()}`} icon={TrendingUp} />
        <StatsCard title="Total Gain/Loss" value={`$${stats.totalGain.toLocaleString()}`} icon={TrendingUp} />
      </div>

      {/* Chart */}
      <PortfolioChart valueUpdates={valueUpdates} investments={investments} />

      {/* Investments Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Investments</h2>
        <InvestmentTable investments={investments} onUpdated={refresh} />
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="bg-card rounded-2xl border p-6">
          <h3 className="font-semibold mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
}