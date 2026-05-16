import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth } from '@/lib/valuation-utils';
import { hasUnknownValue, rowHasUnknown } from '@/lib/client-utils';
import { applyClientBlueprint } from '@/lib/client-canonicalization';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Trash2, Wrench } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

const FLAG_LABELS = {
  has_missing_account_code: 'Missing Account Code',
  has_missing_identity_no: 'Missing ID Number',
  has_missing_market_value: 'Missing Market Value',
  is_duplicate: 'Duplicate Row',
  has_unknown_value: 'Contains UNKNOWN Value',
};

function hasFlag(row, flag) {
  if (flag === 'has_unknown_value') return row.has_unknown_value || rowHasUnknown(row);
  return Boolean(row[flag]);
}

function unknownClass(value) {
  return hasUnknownValue(value) ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded px-1.5 py-0.5' : '';
}

export default function DataQuality() {
  const queryClient = useQueryClient();
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFlag, setFilterFlag] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [repairMonth, setRepairMonth] = useState('');
  const [repairStatus, setRepairStatus] = useState(null);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);

  const flagged = useMemo(() => {
    let rows = valuations.filter(v => v.is_flagged || rowHasUnknown(v));
    if (filterMonth) rows = rows.filter(v => v.upload_month === filterMonth);
    if (filterFlag) rows = rows.filter(v => hasFlag(v, filterFlag));
    return rows;
  }, [valuations, filterMonth, filterFlag]);

  const summary = useMemo(() => {
    const all = valuations.filter(v => v.is_flagged || rowHasUnknown(v));
    return {
      total: all.length,
      missing_account: all.filter(v => v.has_missing_account_code).length,
      missing_id: all.filter(v => v.has_missing_identity_no).length,
      missing_value: all.filter(v => v.has_missing_market_value).length,
      duplicates: all.filter(v => v.is_duplicate).length,
      unknown: all.filter(v => hasFlag(v, 'has_unknown_value')).length,
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
      has_unknown_value: false,
    });
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
  };

  const handleRepairMonth = async () => {
    if (!repairMonth) return;
    setRepairStatus('Checking names and fees against the April blueprint...');
    try {
      const result = await applyClientBlueprint(repairMonth);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      if (result.skipped) {
        setRepairStatus('Choose May 2026 or a later month. April 2026 is the blueprint month.');
      } else {
        setRepairStatus(`Checked ${formatMonth(repairMonth)}. Updated ${result.updated} row${result.updated === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setRepairStatus(err.message || 'Could not repair the selected month.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Quality</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and correct flagged rows from imported data.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Flagged', value: summary.total, color: 'border-l-amber-400' },
          { label: 'Contains UNKNOWN', value: summary.unknown, color: 'border-l-yellow-400' },
          { label: 'Missing Account Code', value: summary.missing_account, color: 'border-l-red-400' },
          { label: 'Missing ID Number', value: summary.missing_id, color: 'border-l-orange-400' },
          { label: 'Duplicate Rows', value: summary.duplicates, color: 'border-l-rose-400' },
        ].map(s => (
          <div key={s.label} className={cn("bg-white border rounded-lg border-l-4 p-3", s.color)}>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-700">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Repair Existing Month</p>
              <p className="text-xs text-muted-foreground">
                Reapply April 2026 client names, fund rebates, and client/provider advisory fees to an already uploaded month.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={repairMonth}
              onChange={event => {
                setRepairMonth(event.target.value);
                setRepairStatus(null);
              }}
              className="h-8 w-40"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleRepairMonth} disabled={!repairMonth}>
              Repair month
            </Button>
          </div>
        </div>
        {repairStatus && <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">{repairStatus}</p>}
      </div>

      {/* Filters */}
      <div className="flex gap-2 bg-white border rounded-lg p-3">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFlag} onValueChange={setFilterFlag}>
          <SelectTrigger className="w-48 h-8">
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
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-20" />
              <col className="w-[22%]" />
              <col className="w-36" />
              <col className="w-[26%]" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-40" />
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/40">
                {['Month', 'Portfolio Name', 'Account Code', 'Investment Name', 'Platform', 'Value', 'Flags', 'Actions'].map(h => (
                  <th key={h} className={cn(
                    "text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    h === 'Actions' && 'sticky right-0 z-10 bg-muted/40'
                  )}>{h}</th>
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
                  <td className="px-3 py-2"><MonthBadge month={row.upload_month} /></td>
                  <td className="px-3 py-2 font-medium text-xs leading-4">
                    {row.portfolio_name ? <span className={unknownClass(row.portfolio_name)}>{row.portfolio_name}</span> : <span className="text-muted-foreground italic">Missing</span>}
                  </td>
                  <td className="px-3 py-2 font-numbers text-xs text-muted-foreground">
                    {row.account_code ? <span className={unknownClass(row.account_code)}>{row.account_code}</span> : <span className="text-red-500">Missing</span>}
                  </td>
                  <td className="px-3 py-2 truncate">
                    {row.investment_name ? <span className={unknownClass(row.investment_name)}>{row.investment_name}</span> : '-'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.platform ? <span className={unknownClass(row.platform)}>{row.platform}</span> : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-numbers">{row.month_end_market_value !== null ? fmtNum(row.month_end_market_value) : <span className="text-red-500">Missing</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.has_missing_account_code && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">No Account</span>}
                      {row.has_missing_identity_no && <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">No ID</span>}
                      {row.has_missing_market_value && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">No Value</span>}
                      {row.is_duplicate && <span className="text-xs bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Duplicate</span>}
                      {hasFlag(row, 'has_unknown_value') && <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded"><AlertTriangle className="w-3 h-3" />UNKNOWN</span>}
                    </div>
                  </td>
                  <td className="sticky right-0 bg-white px-2 py-2 shadow-[-8px_0_10px_-12px_rgba(15,23,42,0.4)]">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleMarkClean(row)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Clean
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
