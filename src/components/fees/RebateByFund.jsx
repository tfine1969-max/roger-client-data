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

// Build a map of canonicalName -> Set of raw source names using current rules + rawRows
function buildSourceMap(rawMonthRows, fundMergeRules) {
  // platform-specific map
  const platformMap = {};
  const globalMap = {};
  fundMergeRules.forEach(rule => {
    if (!rule.source_name || !rule.canonical_name || rule.platform === '__extra_master__') return;
    const platform = (rule.platform || '').trim();
    if (platform) {
      platformMap[`${platform}||${rule.source_name.trim()}`] = rule.canonical_name;
    } else {
      globalMap[rule.source_name.trim()] = rule.canonical_name;
    }
  });

  // For each raw row, resolve its canonical name and map canonical -> [raw source names]
  const result = {}; // canonicalName -> Set of { source_name, platform }
  rawMonthRows.forEach(row => {
    const rawName = (row.investment_name || '').trim();
    const platform = (row.platform || '').trim();
    const platformKey = `${platform}||${rawName}`;
    const canonical = platformMap[platformKey] || globalMap[rawName] || rawName;
    if (!result[canonical]) result[canonical] = new Set();
    result[canonical].add(JSON.stringify({ source_name: rawName, platform }));
  });
  return result;
}

function MergeDialog({ open, onOpenChange, selected, onMerged, rawMonthRows, fundMergeRules }) {
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
      const canonical = canonicalName.trim();
      const sources = selected.filter(name => name !== canonical);

      // Build a map from canonical display name -> raw source names in the DB
      const sourceMap = buildSourceMap(rawMonthRows, fundMergeRules);

      // Collect all raw source names that need to point to canonical
      const rawSourcesToCreate = new Set();
      for (const displayName of sources) {
        // The raw sources that currently resolve to this display name
        const rawEntries = sourceMap[displayName] || new Set([JSON.stringify({ source_name: displayName, platform: '' })]);
        rawEntries.forEach(entry => {
          const { source_name, platform } = JSON.parse(entry);
          if (source_name !== canonical) {
            rawSourcesToCreate.add(JSON.stringify({ source_name, platform }));
          }
        });
      }

      // Load all existing rules once
      const allRules = await base44.entities.FundMergeRule.list('source_name', 2000);
      const ruleByKey = {};
      allRules.forEach(r => {
        const key = `${(r.platform || '').trim()}||${(r.source_name || '').trim()}`;
        ruleByKey[key] = r;
      });

      for (const entryStr of rawSourcesToCreate) {
        const { source_name, platform } = JSON.parse(entryStr);
        const key = `${platform}||${source_name}`;
        const existing = ruleByKey[key];
        if (existing) {
          await base44.entities.FundMergeRule.update(existing.id, { canonical_name: canonical, platform });
        } else {
          await base44.entities.FundMergeRule.create({
            source_name,
            canonical_name: canonical,
            platform,
            notes: 'Created via Rebate by Fund merge UI',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['fundMergeRules'] });
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

export default function RebateByFund({ monthRows, rawMonthRows = [], fundMergeRules = [] }) {
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

  const thClass = "px-2 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors";
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
              <th className="px-2 py-2.5 w-8"></th>
              <th className={`${thClass} text-left`} onClick={() => handleSort('fund')}>
                Fund <SortIcon col="fund" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('aum')}>
                AUM <SortIcon col="aum" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('clients')}>
                Clients <SortIcon col="clients" />
              </th>
              <th className={`${thClass} text-left`}>Platforms</th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('rebate')}>
                Rebate <SortIcon col="rebate" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('advisory')}>
                Advisory <SortIcon col="advisory" />
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('total')}>
                Total <SortIcon col="total" />
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
                  <td className="px-2 py-2 text-center">
                    {isSelected
                      ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      : <Square className="w-3.5 h-3.5 text-muted-foreground/40" />
                    }
                  </td>
                  <td className="px-2 py-2 font-medium w-[28%]">
                    <span className="block truncate text-sm" title={row.fund}>{row.fund}</span>
                  </td>
                  <td className="px-2 py-2 font-mono text-right whitespace-nowrap text-muted-foreground text-xs">
                    R {fmtNum(row.aum)}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground text-xs">{row.clients}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-0.5">
                      {row.platforms.map(p => (
                        <span key={p} className="text-[11px] rounded bg-muted px-1 py-0.5 text-muted-foreground whitespace-nowrap">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-right text-chart-2 font-semibold whitespace-nowrap text-xs">
                    R {fmtNum(row.rebate)}
                  </td>
                  <td className="px-2 py-2 font-mono text-right text-chart-1 whitespace-nowrap text-xs">
                    R {fmtNum(row.advisory)}
                  </td>
                  <td className="px-2 py-2 font-mono text-right font-bold whitespace-nowrap text-xs">
                    R {fmtNum(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td />
              <td className="px-2 py-2 text-xs uppercase tracking-wider">
                Total ({sorted.length} fund{sorted.length !== 1 ? 's' : ''})
              </td>
              <td className="px-2 py-2 font-mono text-right whitespace-nowrap text-muted-foreground text-xs">
                R {fmtNum(totals.aum)}
              </td>
              <td />
              <td />
              <td className="px-2 py-2 font-mono text-right text-chart-2 whitespace-nowrap text-xs">
                R {fmtNum(totals.rebate)}
              </td>
              <td className="px-2 py-2 font-mono text-right text-chart-1 whitespace-nowrap text-xs">
                R {fmtNum(totals.advisory)}
              </td>
              <td className="px-2 py-2 font-mono text-right font-bold whitespace-nowrap text-xs">
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
      rawMonthRows={rawMonthRows}
      fundMergeRules={fundMergeRules}
    />
    </>
  );
}