import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Mail, Hash, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatsCard from '@/components/dashboard/StatsCard';
import InvestmentTable from '@/components/investments/InvestmentTable';
import AddInvestmentDialog from '@/components/investments/AddInvestmentDialog';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

export default function ClientDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState('');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const client = clients.find(c => c.id === id);

  const { data: allInvestments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list(),
  });

  const { data: allMonthlyValues = [] } = useQuery({
    queryKey: ['monthlyValues'],
    queryFn: () => base44.entities.MonthlyValue.list(),
  });

  const investments = useMemo(() => allInvestments.filter(i => i.client_id === id), [allInvestments, id]);
  const monthlyValues = useMemo(() => allMonthlyValues.filter(v => v.client_id === id), [allMonthlyValues, id]);

  // Available months for this client
  const availableMonths = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort((a, b) => b.localeCompare(a));
    return months;
  }, [monthlyValues]);

  const activeMonth = selectedMonth || availableMonths[0] || '';

  // Stats for selected month
  const stats = useMemo(() => {
    const activeValues = activeMonth
      ? monthlyValues.filter(v => v.month === activeMonth)
      : [];
    const total = activeValues.reduce((s, v) => s + (v.market_value || 0), 0);

    // Previous month
    const prevMonth = availableMonths[availableMonths.indexOf(activeMonth) + 1] || '';
    const prevValues = prevMonth ? monthlyValues.filter(v => v.month === prevMonth) : [];
    const prevTotal = prevValues.reduce((s, v) => s + (v.market_value || 0), 0);
    const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;

    return { total, change, investmentCount: investments.length };
  }, [monthlyValues, activeMonth, availableMonths, investments]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['investments'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyValues'] });
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
              <div className="flex flex-wrap items-center gap-4 mt-1">
                {client.account_code && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5" /> {client.account_code}
                  </span>
                )}
                {client.identity_no && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Hash className="w-3.5 h-3.5" /> {client.identity_no}
                  </span>
                )}
              </div>
            </div>
          </div>
          <AddInvestmentDialog clientId={id} onCreated={refresh} />
        </div>
      </div>

      {/* Month selector */}
      {availableMonths.length > 0 && (
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Viewing month:</p>
          <Select value={activeMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title={activeMonth ? `Total Value (${activeMonth})` : 'Total Value'}
          value={stats.total ? stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
          icon={DollarSign}
          trend={stats.change}
        />
        <StatsCard title="Investments" value={stats.investmentCount} icon={BarChart3} />
        <StatsCard title="Months on Record" value={availableMonths.length} icon={TrendingUp} />
      </div>

      {/* Investments Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Investments</h2>
        <InvestmentTable
          investments={investments}
          monthlyValues={monthlyValues}
          selectedMonth={activeMonth}
          onRefresh={refresh}
        />
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