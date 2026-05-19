import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Users, Building2, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { feeSeedRows } from '@/data/feeSeedRows';

const PROVIDER_ORDER = [
  'Julius Baer', 'Credo', 'Gryphon', 'Prime', 'Prescient',
  'Northstar', 'Northstar FNB', 'Northstar Sanlam', 'Peresec',
];

function pct(val) {
  if (!val) return '0.00%';
  return `${Number(val).toFixed(2)}%`;
}

function fmtRate(val) {
  if (!val) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium text-foreground">{pct(val)}</span>;
}

function buildTree(rows) {
  const clients = {};
  rows.forEach(row => {
    if (!clients[row.client]) {
      clients[row.client] = { name: row.client, providers: {} };
    }
    const client = clients[row.client];
    const pKey = row.provider;
    if (!client.providers[pKey]) {
      client.providers[pKey] = {
        name: row.provider,
        advisoryAnnualPercent: row.advisoryAnnualPercent,
        instruments: [],
      };
    }
    const provider = client.providers[pKey];
    // Use max advisory fee if multiple instruments have different values
    if (row.advisoryAnnualPercent > provider.advisoryAnnualPercent) {
      provider.advisoryAnnualPercent = row.advisoryAnnualPercent;
    }
    provider.instruments.push({
      name: row.investment,
      class: row.investmentClass,
      rebate: row.rebateAnnualPercent,
      advisory: row.advisoryAnnualPercent,
    });
  });

  return Object.values(clients)
    .map(client => ({
      ...client,
      providers: Object.values(client.providers).sort((a, b) => {
        const ai = PROVIDER_ORDER.indexOf(a.name);
        const bi = PROVIDER_ORDER.indexOf(b.name);
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return a.name.localeCompare(b.name);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function FeeSeeding() {
  const [search, setSearch] = useState('');
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedProviders, setExpandedProviders] = useState({});

  const tree = useMemo(() => buildTree(feeSeedRows), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    return tree
      .map(client => {
        if (client.name.toLowerCase().includes(q)) return client;
        const providers = client.providers
          .map(p => {
            if (p.name.toLowerCase().includes(q)) return p;
            const instruments = p.instruments.filter(i =>
              i.name.toLowerCase().includes(q)
            );
            return instruments.length ? { ...p, instruments } : null;
          })
          .filter(Boolean);
        return providers.length ? { ...client, providers } : null;
      })
      .filter(Boolean);
  }, [tree, search]);

  const toggleClient = (name) =>
    setExpandedClients(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleProvider = (key) =>
    setExpandedProviders(prev => ({ ...prev, [key]: !prev[key] }));

  const clientCount = tree.length;
  const providerCount = [...new Set(feeSeedRows.map(r => r.provider))].length;
  const instrumentCount = [...new Set(feeSeedRows.map(r => r.investment))].length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fee Seeding</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Client → Provider (advisory fee) → Instrument (rebate). All rates are annual percentages.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clients</p>
            <p className="text-2xl font-semibold">{clientCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Providers</p>
            <p className="text-2xl font-semibold">{providerCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instruments</p>
            <p className="text-2xl font-semibold">{instrumentCount}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients, providers, instruments…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="border-b bg-muted/40 grid grid-cols-[1fr_120px_120px] px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client / Provider / Instrument</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Rebate p.a.</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Advisory p.a.</span>
        </div>

        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No results.</div>
          )}
          {filtered.map(client => {
            const isOpen = !!expandedClients[client.name];
            return (
              <div key={client.name}>
                {/* Client row */}
                <button
                  onClick={() => toggleClient(client.name)}
                  className="w-full grid grid-cols-[1fr_120px_120px] items-center px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {client.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      {client.providers.length} provider{client.providers.length !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <span />
                  <span />
                </button>

                {isOpen && client.providers.map(provider => {
                  const provKey = `${client.name}||${provider.name}`;
                  const isProvOpen = !!expandedProviders[provKey];
                  return (
                    <div key={provKey}>
                      {/* Provider row */}
                      <button
                        onClick={() => toggleProvider(provKey)}
                        className="w-full grid grid-cols-[1fr_120px_120px] items-center pl-8 pr-4 py-2 hover:bg-muted/20 transition-colors text-left border-t border-muted/50"
                      >
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          {isProvOpen
                            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {provider.name}
                          <span className="text-xs text-muted-foreground">
                            {provider.instruments.length} instrument{provider.instruments.length !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className="text-right text-xs text-muted-foreground pr-1">—</span>
                        <span className="text-right text-sm">
                          {fmtRate(provider.advisoryAnnualPercent)}
                        </span>
                      </button>

                      {/* Instrument rows */}
                      {isProvOpen && provider.instruments.map((inst, idx) => (
                        <div
                          key={`${provKey}||${inst.name}||${idx}`}
                          className="grid grid-cols-[1fr_120px_120px] items-center pl-14 pr-4 py-1.5 border-t border-muted/30 bg-muted/5"
                        >
                          <span className="text-xs text-foreground leading-snug">
                            {inst.name}
                            {inst.class && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">({inst.class})</span>
                            )}
                          </span>
                          <span className="text-right text-xs">
                            {fmtRate(inst.rebate)}
                          </span>
                          <span className="text-right text-xs text-muted-foreground">
                            {pct(inst.advisory)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
