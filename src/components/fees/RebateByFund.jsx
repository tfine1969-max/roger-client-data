import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fmtNum } from '@/lib/valuation-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, ChevronDown, ChevronUp, Merge, CheckSquare, Square, Loader2 } from 'lucide-react';

function summariseFund(rows) {
  let rebate = 0, advisory = 0, total = 0, aum = 0;
  const clients = new Set();
  const platforms = new Set();
  rows.forEach(r => {
    rebate += r.rebate_fee_monthly_amount_zar ?? 0;
    advisory += r.advisory_fee_monthly_amount_zar ?? 0;
    total += r.total_monthly_fee_zar ?? 0;
    aum += r.fee_base_zar ?? r.zar_value ?? r.month_end_market_value ?? 0;
    if (r.account_code) clients.add(r.account_code);
    if (r.platform) platforms.add(r.platform);
  });
  return { rebate, advisory, total, aum, clients: clients.size, platforms: [...platforms] };
}

function MergeDialog({ open, onOpenChange, selected, onMerged }) {
  const queryClient = useQueryClient();
  const [canonicalName, setCanonicalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill with the longest/most descriptive name
  useMemo(() => {
    if (selected.length > 0) {
      const longest = [...selected].sort((a, b) => b.length - a.length)[0];
      setCanonicalName(longest);
      setError('');
    }
  }, [selected]);

  async function handleMerge() {
    if (!canonicalName.trim() || selected.length < 2) return;
    setLoading(true);
    setError('');
    try {
      // For each source name that differs from canonical, save a FundMergeRule
      const sources = selected.filter(name => name !== canonicalName.trim());
      for (const source_name of sources) {
        // Check if rule already exists; if so update, otherwise create
        const existing = await base44.entities.FundMergeRule.filter({ source_name });
        if (existing.length > 0) {
          await base44.entities.FundMergeRule.update(existing[0].id, {
            canonical_name: canonicalName.trim(),
            platform: '',
          });
        } else {
          await base44.entities.FundMergeRule.create({
            source_name,
            canonical_name: canonicalName.trim(),
            platform: '',
            notes: 'Created via Rebate by Fund merge UI',
          });
        }
      }
      // Now apply the rules to the actual DB records
      await base44.functions.invoke('applyFundMergeRules', {});

      queryClient.invalidateQueries({ queryKey: ['fundMergeRules'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      onMerged();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Failed to save merge rules');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-4 h-4" /> Merge {selected.length} Funds
          </DialogTitle>
          <DialogDescription>
            All selected fund names will be renamed to the canonical name below. This saves fund merge rules that apply on every data refresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selected fund names</p>
            <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
              {selected.map(name => (
                <div key={name} className="px-3 py-2 text-sm flex items-center gap-2">
                  <span className={name === canonicalName.trim() ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                    {name}
                  </span>
                  {name === canonicalName.trim() && (
                    <span className="ml-auto text-xs rounded bg-primary/10 text-primary px-1.5 py-0.5">canonical</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Canonical (target) fund name</label>
            <Input
              value={canonicalName}
              onChange={e => setCanonicalName(e.target.value)}
              placeholder="Enter the canonical fund name..."
            />
            <p className="text-xs text-muted-foreground">All other selected names will be renamed to this.</p>
          </div>

          {error && (
            <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleMerge}
              disabled={loading || !canonicalName.trim() || selected.length < 2}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Merge Rules
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RebateByFund({ monthRows }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rebate');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);

  const fundRows = useMemo(() => {
    const map = {};
    monthRows.forEach(r => {
      const fund = r.investment_name || 'Unknown';
      if (!map[fund]) map[fund] = [];
      map[fund].push(r);
    });
    return Object.entries(map).map(([fund, rows]) => ({
      fund,
      ...summariseFund(rows),
    }));
  }, [monthRows]);

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q ? fundRows.filter(r => r.fund.toLowerCase().includes(q)) : fundRows;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [fundRows, search, sortBy, sortDir]);

  const totals = useMemo(() => sorted.reduce(
    (acc, r) => ({ rebate: acc.rebate + r.rebate, advisory: acc.advisory + r.advisory, total: acc.total + r.total, aum: acc.aum + r.aum }),
    { rebate: 0, advisory: 0, total: 0, aum: 0 }
  ), [sorted]);

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function toggleSelect(fund) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(fund) ? next.delete(fund) : next.add(fund);
      return next;
    });
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  }

  const thClass = "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors";
  const selectedList = [...selected];

  return (
    <>
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Rebate by Investment Fund</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total monthly rebate per fund across all providers · {fundRows.length} funds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size >= 2 && (
            <Button size="sm" className="gap-1.5 h-9" onClick={() => setMergeOpen(true)}>
              <Merge className="w-3.5 h-3.5" />
              Merge {selected.size} funds
            </Button>
          )}
          {selected.size > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-9 text-xs">
              Clear
            </Button>
          )}
          <div className="relative min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search fund name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="px-5 py-2 bg-primary/5 border-b text-xs text-primary font-medium">
          {selected.size} fund{selected.size !== 1 ? 's' : ''} selected — select at least 2 to merge
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 w-10"></th>
              <th className={`${thClass} text-left`} onClick={() => handleSort('fund')}>
                Fund <SortIcon col="fund" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('aum')}>
                AUM (ZAR) <SortIcon col="aum" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('clients')}>
                Clients <SortIcon col="clients" />
              </th>
              <th className={`${thClass} text-left hidden md:table-cell`}>Platforms</th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('rebate')}>
                Monthly Rebate <SortIcon col="rebate" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('advisory')}>
                Monthly Advisory <SortIcon col="advisory" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('total')}>
                Total Monthly <SortIcon col="total" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No funds found.</td>
              </tr>
            )}
            {sorted.map(row => {
              const isSelected = selected.has(row.fund);
              return (
                <tr
                  key={row.fund}
                  className={`hover:bg-muted/20 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => toggleSelect(row.fund)}
                >
                  <td className="px-4 py-3 text-center">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground/40" />
                    }
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs">
                    <span className="block truncate" title={row.fund}>{row.fund}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-right whitespace-nowrap text-muted-foreground">
                    R {fmtNum(row.aum)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.clients}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {row.platforms.map(p => (
                        <span key={p} className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-chart-2 font-semibold whitespace-nowrap">
                    R {fmtNum(row.rebate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap">
                    R {fmtNum(row.advisory)}
                  </td>
                  <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap">
                    R {fmtNum(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td />
              <td className="px-4 py-3 text-xs uppercase tracking-wider">
                Total ({sorted.length} fund{sorted.length !== 1 ? 's' : ''})
              </td>
              <td className="px-4 py-3 font-mono text-right whitespace-nowrap text-muted-foreground">
                R {fmtNum(totals.aum)}
              </td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3 font-mono text-right text-chart-2 whitespace-nowrap">
                R {fmtNum(totals.rebate)}
              </td>
              <td className="px-4 py-3 font-mono text-right text-chart-1 whitespace-nowrap">
                R {fmtNum(totals.advisory)}
              </td>
              <td className="px-4 py-3 font-mono text-right font-bold whitespace-nowrap">
                R {fmtNum(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <MergeDialog
      open={mergeOpen}
      onOpenChange={setMergeOpen}
      selected={selectedList}
      onMerged={() => setSelected(new Set())}
    />
    </>
  );
}