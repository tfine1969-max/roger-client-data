import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import ClientCard from '@/components/clients/ClientCard';
import AddClientDialog from '@/components/clients/AddClientDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  const latestMonth = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort((a, b) => b.localeCompare(a));
    return months[0] || '';
  }, [monthlyValues]);

  const prevMonth = useMemo(() => {
    const months = [...new Set(monthlyValues.map(v => v.month))].sort((a, b) => b.localeCompare(a));
    return months[1] || '';
  }, [monthlyValues]);

  const clientStats = useMemo(() => {
    return clients
      .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.account_code?.includes(search) || c.identity_no?.includes(search))
      .map(client => {
        const clientInvs = investments.filter(i => i.client_id === client.id);
        const invIds = new Set(clientInvs.map(i => i.id));
        const latestVals = monthlyValues.filter(v => invIds.has(v.investment_id) && v.month === latestMonth);
        const prevVals = monthlyValues.filter(v => invIds.has(v.investment_id) && v.month === prevMonth);
        const total = latestVals.reduce((s, v) => s + (v.market_value || 0), 0);
        const prevTotal = prevVals.reduce((s, v) => s + (v.market_value || 0), 0);
        const gain = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;
        return { client, totalValue: total, investmentCount: clientInvs.length, gainPercent: gain };
      });
  }, [clients, investments, monthlyValues, search, latestMonth, prevMonth]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['clients'] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} total clients</p>
        </div>
        <AddClientDialog onCreated={refresh} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, account code or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {clientStats.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              {search ? 'No clients match your search.' : 'No clients yet. Import a spreadsheet or add manually.'}
            </p>
          </div>
        )}
        {clientStats.map(({ client, totalValue, investmentCount, gainPercent }) => (
          <ClientCard
            key={client.id}
            client={client}
            totalValue={totalValue}
            investmentCount={investmentCount}
            gainPercent={gainPercent}
            latestMonth={latestMonth}
          />
        ))}
      </div>
    </div>
  );
}