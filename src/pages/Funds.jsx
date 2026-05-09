import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    const fundMap = {};
    
    monthRows.forEach(row => {
      const fundKey = row.investment_name;
      const clientKey = row.account_code || row.portfolio_name || 'Unknown';
      const clientName = row.portfolio_name || clientKey;
      
      if (!fundMap[fundKey]) {
        fundMap[fundKey] = {
          name: row.investment_name,
          totalZar: 0,
          holdings: 0,
          platforms: new Set(),
          clientMap: {},
        };
      }
      
      if (!fundMap[fundKey].clientMap[clientKey]) {
        fundMap[fundKey].clientMap[clientKey] = {
          code: clientKey,
          name: clientName,
          totalZar: 0,
          holdings: 0,
        };
      }
      
      fundMap[fundKey].totalZar += zarVal(row);
      fundMap[fundKey].holdings += 1;
      fundMap[fundKey].platforms.add(row.platform || 'Unknown');
      fundMap[fundKey].clientMap[clientKey].totalZar += zarVal(row);
      fundMap[fundKey].clientMap[clientKey].holdings += 1;
    });

    return Object.values(fundMap)
      .map(f => ({
        ...f,
        clients: Object.values(f.clientMap).sort((a, b) => a.name.localeCompare(b.name)),
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
                    <tr className="bg-muted/5">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients in this fund ({fund.clients.length}):</p>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/20">
                                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Client Name</th>
                                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Holdings</th>
                                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">AUM (ZAR)</th>
                                  <th className="w-6"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {fund.clients.map((client) => (
                                  <tr key={client.code} className="hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium text-foreground">{client.name}</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">{client.holdings}</td>
                                    <td className="px-3 py-2 text-right font-mono text-foreground">R {fmtNum(client.totalZar)}</td>
                                    <td className="px-3 py-2 text-center">
                                      <Link to={`/clients/${encodeURIComponent(client.code)}`}>
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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