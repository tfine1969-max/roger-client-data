import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';
import ClientCard from '@/components/clients/ClientCard';
import AddClientDialog from '@/components/clients/AddClientDialog';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

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

  const clientStats = useMemo(() => {
    return clients
      .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
      .map(client => {
        const clientInvs = investments.filter(i => i.client_id === client.id);
        const totalCurrent = clientInvs.reduce((s, i) => s + (i.current_value || 0), 0);
        const totalInitial = clientInvs.reduce((s, i) => s + (i.initial_value || 0), 0);
        const gain = totalInitial ? ((totalCurrent - totalInitial) / totalInitial) * 100 : 0;
        return { client, totalValue: totalCurrent, investmentCount: clientInvs.length, gainPercent: gain };
      });
  }, [clients, investments, search]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} total clients</p>
        </div>
        <AddClientDialog onCreated={refresh} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {clientStats.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {search ? 'No clients match your search.' : 'No clients yet. Click "Add Client" to get started.'}
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
          />
        ))}
      </div>
    </div>
  );
}