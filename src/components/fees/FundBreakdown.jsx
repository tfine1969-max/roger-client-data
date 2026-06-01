import { useState, useMemo } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function FundBreakdown({ monthRows }) {
  const [view, setView] = useState('funds'); // 'clients' or 'funds'
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'size'
  const [expandedItem, setExpandedItem] = useState(null);

  // Group by fund — rows are already canonicalized by the parent via applyRulesToRows
  const fundData = useMemo(() => {
    const map = {};
    monthRows.forEach(row => {
      const fundKey = row.investment_name || 'Unknown';
      if (!map[fundKey]) {
        map[fundKey] = {
          name: fundKey,
          totalZar: 0,
          clients: new Set(),
          holdings: 0,
        };
      }
      map[fundKey].totalZar += row.zar_value || 0;
      map[fundKey].clients.add(row.account_code || row.portfolio_name || 'Unknown');
      map[fundKey].holdings += 1;
    });

    return Object.values(map)
      .map(f => ({ ...f, clients: Array.from(f.clients).sort() }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalZar - a.totalZar;
      });
  }, [monthRows, sortBy]);

  // Group by client
  const clientData = useMemo(() => {
    const map = {};
    monthRows.forEach(row => {
      const clientKey = row.account_code || row.portfolio_name || 'Unknown';
      if (!map[clientKey]) {
        map[clientKey] = {
          name: clientKey,
          totalZar: 0,
          funds: new Set(),
          holdings: 0,
        };
      }
      map[clientKey].totalZar += row.zar_value || 0;
      map[clientKey].funds.add(row.investment_name);
      map[clientKey].holdings += 1;
    });

    return Object.values(map)
      .map(c => ({ ...c, funds: Array.from(c.funds).sort() }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalZar - a.totalZar;
      });
  }, [monthRows, sortBy]);

  const data = view === 'funds' ? fundData : clientData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === 'clients' ? 'default' : 'outline'}
            onClick={() => { setView('clients'); setExpandedItem(null); }}
            className="h-8"
          >
            Clients
          </Button>
          <Button
            size="sm"
            variant={view === 'funds' ? 'default' : 'outline'}
            onClick={() => { setView('funds'); setExpandedItem(null); }}
            className="h-8"
          >
            Funds
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sort by:</p>
          <Button
            size="sm"
            variant={sortBy === 'name' ? 'default' : 'outline'}
            onClick={() => setSortBy('name')}
            className="h-7"
          >
            Name
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'size' ? 'default' : 'outline'}
            onClick={() => setSortBy('size')}
            className="h-7"
          >
            Size
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[240px]">{view === 'funds' ? 'Fund' : 'Client'}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">Curr</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">Value (Orig)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[80px]">Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">Value (ZAR)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[60px]">{view === 'funds' ? 'Clients' : 'Funds'}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[80px]">Holdings</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item) => {
                const subitems = view === 'funds' ? item.clients : item.funds;
                const subitemLabel = view === 'funds' ? 'Clients' : 'Funds';
                return (
                  <>
                    <tr key={item.name} className="hover:bg-muted/20 cursor-pointer" onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}>
                      <td className="px-4 py-3 font-medium text-foreground min-w-[240px]">{item.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs min-w-[120px]">—</td>
                      <td className="px-4 py-3 font-numbers text-right text-foreground min-w-[120px]">—</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs min-w-[80px]">—</td>
                      <td className="px-4 py-3 font-numbers text-right text-foreground font-semibold min-w-[120px]">R {fmtNum(item.totalZar)}</td>
                      <td className="px-4 py-3 text-right text-foreground min-w-[60px]">{subitems.length}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs min-w-[80px]">{item.holdings}</td>
                      <td className="px-4 py-3 text-center">
                        {expandedItem === item.name ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                    {expandedItem === item.name && (
                      <tr className="bg-muted/5 border-b">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{subitemLabel}:</p>
                            <div className="flex flex-wrap gap-2">
                              {subitems.map((subitem) => (
                                <span key={subitem} className="inline-block px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                  {subitem}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}