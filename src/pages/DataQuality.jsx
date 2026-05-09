import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

const FLAG_LABELS = {
  has_missing_account_code: 'Missing Account Code',
  has_missing_identity_no: 'Missing ID Number',
  has_missing_market_value: 'Missing Market Value',
  is_duplicate: 'Duplicate Row',
};

export default function DataQuality() {
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFlag, setFilterFlag] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);

  const flagged = useMemo(() => {
    let rows = valuations.filter(v => v.is_flagged);
    if (filterMonth) rows = rows.filter(v => v.upload_month === filterMonth);
    if (filterFlag) rows = rows.filter(v => v[filterFlag]);
    return rows;
  }, [valuations, filterMonth, filterFlag]);

  const summary = useMemo(() => {
    const all = valuations.filter(v => v.is_flagged);
    return {
      total: all.length,
      missing_account: all.filter(v => v.has_missing_account_code).length,
      missing_id: all.filter(v => v.has_missing_identity_no).length,
      missing_value: all.filter(v => v.has_missing_market_value).length,
      duplicates: all.filter(v => v.is_duplicate).length,
    };
  }, [valuations]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    await base44.entities.PortfolioValuation.delete(id);
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    setDeletingId(null);
  };

  const handleMarkClean = async (row) => {
    await base44.entities.PortfolioValuation.update(row.id, {
      is_flagged: false,
      has_missing_account_code: false,
      has_missing_identity_no: false,
      has_missing_market_value: false,
      is_duplicate: false,
    });
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Quality</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and correct flagged rows from imported data.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Flagged', value: summary.total, color: 'border-l-amber-400' },
          { label: 'Missing Account Code', value: summary.missing_account, color: 'border-l-red-400' },
          { label: 'Missing ID Number', value: summary.missing_id, color: 'border-l-orange-400' },
          { label: 'Duplicate Rows', value: summary.duplicates, color: 'border-l-rose-400' },
        ].map(s => (
          <div key={s.label} className={cn("bg-white border rounded-lg border-l-4 p-4", s.color)}>
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white border rounded-lg p-4">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFlag} onValueChange={setFilterFlag}>
          <SelectTrigger className="w-56 h-9">
            <SelectValue placeholder="All flags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All flags</SelectItem>
            {Object.entries(FLAG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Month', 'Portfolio Name', 'Account Code', 'Investment Name', 'Platform', 'Value', 'Flags', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && flagged.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No flagged rows found. Data quality looks good.</p>
                  </td>
                </tr>
              )}
              {flagged.map(row => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5"><MonthBadge month={row.upload_month} /></td>
                  <td className="px-4 py-2.5 font-medium text-sm">{row.portfolio_name || <span className="text-muted-foreground italic">Missing</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.account_code || <span className="text-red-500">Missing</span>}</td>
                  <td className="px-4 py-2.5 max-w-xs truncate">{row.investment_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.platform}</td>
                  <td className="px-4 py-2.5 font-mono">{row.month_end_market_value !== null ? fmtNum(row.month_end_market_value) : <span className="text-red-500">Missing</span>}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {row.has_missing_account_code && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">No Account</span>}
                      {row.has_missing_identity_no && <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">No ID</span>}
                      {row.has_missing_market_value && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">No Value</span>}
                      {row.is_duplicate && <span className="text-xs bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Duplicate</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleMarkClean(row)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Clean
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}