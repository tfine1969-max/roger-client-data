import { useState, useMemo } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FundBreakdown({ monthRows }) {
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'size'
  const [expandedFund, setExpandedFund] = useState(null);

  // Group by investment fund and aggregate clients
  const fundData = useMemo(() => {
    const map = {};
    monthRows.forEach(row => {
      const fundKey = row.investment_name;
      if (!map[fundKey]) {
        map[fundKey] = {
          name: row.investment_name,
          totalZar: 0,
          clients: new Set(),
          holdings: 0,
        };
      }
      map[fundKey].totalZar += row.zar_value || 0;
      map[fundKey].clients.add(row.account_code || row.portfolio_name || 'Unknown');
      map[fundKey].holdings += 1;
    });

    // Convert to array and sort
    return Object.values(map)
      .map(f => ({ ...f, clients: Array.from(f.clients).sort() }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalZar - a.totalZar;
      });
  }, [monthRows, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sort by:</p>
        <Button
          size="sm"
          variant={sortBy === 'name' ? 'default' : 'outline'}
          onClick={() => setSortBy('name')}
          className="h-7"
        >
          Fund Name
        </Button>
        <Button
          size="sm"
          variant={sortBy === 'size' ? 'default' : 'outline'}
          onClick={() => setSortBy('size')}
          className="h-7"
        >
          Fund Size
        </Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[260px]">Investment Fund</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px]">Total Value (ZAR)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Clients</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Holdings</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fundData.map((fund) => (
                <>
                  <tr key={fund.name} className="hover:bg-muted/20 cursor-pointer" onClick={() => setExpandedFund(expandedFund === fund.name ? null : fund.name)}>
                    <td className="px-4 py-3 font-medium text-foreground">{fund.name}</td>
                    <td className="px-4 py-3 font-sans text-right text-foreground">R {fmtNum(fund.totalZar)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fund.clients.length}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{fund.holdings}</td>
                    <td className="px-4 py-3 text-center">
                      {expandedFund === fund.name ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                  {expandedFund === fund.name && (
                    <tr className="bg-muted/5 border-b">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients in this fund:</p>
                          <div className="flex flex-wrap gap-2">
                            {fund.clients.map((client) => (
                              <span key={client} className="inline-block px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                {client}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}