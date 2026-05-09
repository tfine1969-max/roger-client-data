import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';

export default function Funds() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [sortBy, setSortBy] = useState('size'); // 'name' or 'size'
  const [expandedFund, setExpandedFund] = useState(null);

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = selectedMonth || months[0] || '';

  const fundData = useMemo(() => {
    const monthRows = valuations.filter(v => v.upload_month === latestMonth);
    const map = {};
    
    monthRows.forEach(row => {
      const fundKey = row.investment_name;
      if (!map[fundKey]) {
        map[fundKey] = {
          name: row.investment_name,
          totalZar: 0,
          clients: new Set(),
          holdings: 0,
          platforms: new Set(),
        };
      }
      map[fundKey].totalZar += zarVal(row);
      map[fundKey].clients.add(row.account_code || row.portfolio_name || 'Unknown');
      map[fundKey].platforms.add(row.platform || 'Unknown');
      map[fundKey].holdings += 1;
    });

    return Object.values(map)
      .map(f => ({
        ...f,
        clients: Array.from(f.clients).sort(),
        platforms: Array.from(f.platforms),
      }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalZar - a.totalZar;
      });
  }, [valuations, latestMonth, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{fundData.length} funds · {latestMonth ? <span>Viewing <MonthBadge month={latestMonth} /></span> : 'No data'}</p>
        </div>
        <Select value={latestMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Latest month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 bg-white border rounded-lg p-3">
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

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[260px]">Fund Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px]">Total AUM (ZAR)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Clients</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Holdings</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Platforms</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fundData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No funds.</td></tr>
              )}
              {fundData.map((fund) => (
                <>
                  <tr
                    key={fund.name}
                    className="hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedFund(expandedFund === fund.name ? null : fund.name)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{fund.name}</td>
                    <td className="px-4 py-3 font-mono text-right text-foreground">R {fmtNum(fund.totalZar)}</td>
                    <td className="px-4 py-3 text-right text-foreground font-semibold">{fund.clients.length}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{fund.holdings}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fund.platforms.join(', ')}</td>
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
                      <td colSpan={6} className="px-4 py-3">
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