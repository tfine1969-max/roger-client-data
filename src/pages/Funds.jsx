import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Fragment, useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { ChevronDown, ChevronUp, ChevronRight, GitMerge, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import MonthBadge from '@/components/shared/MonthBadge';

const STOP_WORDS = new Set([
  'a', 'b', 'c', 'd', 'e', 'the', 'and', 'of', 'for', 'by', 'in', 'to',
  'fund', 'funds', 'fof', 'unit', 'units', 'share', 'shares', 'shs',
  'class', 'acc', 'inc', 'ltd', 'limited', 'plc', 'pcc', 'pty',
  'capital', 'pim', 'wealthworks', 'portfolio', 'managed', 'fd',
  'usd', 'zar', 'hkd', 'eur', 'gbp', 'bci', 'ci',
]);

function normalizeFundName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bglbl\b/g, 'global')
    .replace(/\beqty\b/g, 'equity')
    .replace(/\byi\b/g, 'yield')
    .replace(/\bopp\b/g, 'opportunities')
    .replace(/\bfof\b/g, 'fund of funds')
    .replace(/\bmay test\s+\d+\s*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fundTokens(value) {
  return normalizeFundName(value)
    .split(' ')
    .filter(token => token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

function tokenSimilarity(a, b) {
  const aTokens = new Set(fundTokens(a));
  const bTokens = new Set(fundTokens(b));
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter(token => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = intersection / union;
  const overlap = intersection / Math.min(aTokens.size, bTokens.size);
  return Math.max(jaccard, overlap * 0.82);
}

function compactName(value) {
  return normalizeFundName(value).replace(/\s+/g, '');
}

function likelySimilarFunds(a, b) {
  const aName = a.name || '';
  const bName = b.name || '';
  if (aName === bName) return false;

  const aCompact = compactName(aName);
  const bCompact = compactName(bName);
  if (!aCompact || !bCompact) return false;

  const samePlatform = a.platforms.some(platform => b.platforms.includes(platform));
  const score = tokenSimilarity(aName, bName);
  if (score >= 0.58) return true;
  if (samePlatform && score >= 0.48) return true;
  if (samePlatform && (aCompact.includes(bCompact) || bCompact.includes(aCompact)) && Math.min(aCompact.length, bCompact.length) > 8) return true;

  const aIsShortCode = /^[a-z]{4,8}$/i.test(aName.trim());
  const bIsShortCode = /^[a-z]{4,8}$/i.test(bName.trim());
  return samePlatform && (aIsShortCode || bIsShortCode) && score >= 0.32;
}

function buildSuggestedGroups(rawFunds) {
  const parent = new Map(rawFunds.map(fund => [fund.name, fund.name]));
  const find = (name) => {
    const current = parent.get(name);
    if (current === name) return name;
    const root = find(current);
    parent.set(name, root);
    return root;
  };
  const union = (a, b) => {
    const aRoot = find(a);
    const bRoot = find(b);
    if (aRoot !== bRoot) parent.set(bRoot, aRoot);
  };

  for (let i = 0; i < rawFunds.length; i += 1) {
    for (let j = i + 1; j < rawFunds.length; j += 1) {
      if (likelySimilarFunds(rawFunds[i], rawFunds[j])) union(rawFunds[i].name, rawFunds[j].name);
    }
  }

  const groups = new Map();
  rawFunds.forEach(fund => {
    const root = find(fund.name);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(fund);
  });

  return [...groups.values()]
    .filter(group => group.length > 1)
    .map(group => ({
      id: group.map(item => item.name).sort().join('|'),
      items: group.sort((a, b) => b.totalZar - a.totalZar),
      totalZar: group.reduce((sum, item) => sum + item.totalZar, 0),
      platforms: [...new Set(group.flatMap(item => item.platforms))].sort(),
    }))
    .sort((a, b) => b.totalZar - a.totalZar)
    .slice(0, 12);
}

export default function Funds() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [sortBy, setSortBy] = useState('size');
  const [fundSearch, setFundSearch] = useState('');
  const [expandedFund, setExpandedFund] = useState(null);
  const [selectedFunds, setSelectedFunds] = useState(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeFundName, setMergeFundName] = useState('');

  const queryClient = useQueryClient();

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
      const fundKey = row.investment_name || 'Unknown';
      const clientKey = row.account_code || row.portfolio_name || 'Unknown';
      const clientName = row.portfolio_name || clientKey;

      if (!fundMap[fundKey]) {
        fundMap[fundKey] = {
          name: fundKey,
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
      .map(fund => ({
        ...fund,
        clients: Object.values(fund.clientMap).sort((a, b) => a.name.localeCompare(b.name)),
        platforms: Array.from(fund.platforms).sort(),
      }))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalZar - a.totalZar;
      });
  }, [valuations, latestMonth, sortBy]);

  const suggestedGroups = useMemo(() => buildSuggestedGroups(fundData), [fundData]);
  const selectedFundNames = useMemo(() => [...selectedFunds], [selectedFunds]);
  const searchMatches = useMemo(() => {
    const query = fundSearch.trim();
    if (!query) return [];
    const queryCompact = compactName(query);
    const queryTokens = fundTokens(query);

    return fundData
      .map(fund => {
        const nameCompact = compactName(fund.name);
        const contains = queryCompact && nameCompact.includes(queryCompact);
        const tokenHit = queryTokens.some(token => fundTokens(fund.name).includes(token));
        const score = contains ? 1 : Math.max(tokenSimilarity(fund.name, query), tokenHit ? 0.72 : 0);
        return { ...fund, searchScore: score };
      })
      .filter(fund => fund.searchScore >= 0.28)
      .sort((a, b) => b.searchScore - a.searchScore || b.totalZar - a.totalZar)
      .slice(0, 40);
  }, [fundData, fundSearch]);
  const visibleFundData = fundSearch.trim() ? searchMatches : fundData;
  const selectedRowCount = useMemo(
    () => valuations.filter(row => selectedFunds.has(row.investment_name || 'Unknown')).length,
    [valuations, selectedFunds]
  );

  const mergeMutation = useMutation({
    mutationFn: async ({ sourceNames, targetName }) => {
      const rowsToUpdate = valuations.filter(row => sourceNames.includes(row.investment_name || 'Unknown'));
      await Promise.all(rowsToUpdate.map(row => base44.entities.PortfolioValuation.update(row.id, { investment_name: targetName })));
      return rowsToUpdate.length;
    },
    onSuccess: (count, { targetName }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      setSelectedFunds(new Set());
      setExpandedFund(null);
      setMergeDialogOpen(false);
      setMergeFundName('');
      toast({
        title: 'Funds merged',
        description: `${count} valuation rows now use "${targetName}".`,
        duration: 1800,
      });
    },
    onError: (error) => {
      toast({
        title: 'Fund merge failed',
        description: error?.message || 'The selected fund rows could not be updated.',
        variant: 'destructive',
        duration: 8000,
      });
    },
  });

  const toggleFund = (name) => {
    setSelectedFunds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const openMergeDialog = (names = selectedFundNames) => {
    const cleanNames = names.filter(Boolean);
    if (cleanNames.length < 2) return;
    setSelectedFunds(new Set(cleanNames));
    setMergeFundName(cleanNames[0] || '');
    setMergeDialogOpen(true);
  };

  const setMergeNameSelected = (name, checked) => {
    setSelectedFunds(prev => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
    if (!checked && mergeFundName === name) {
      const remaining = selectedFundNames.filter(item => item !== name);
      setMergeFundName(remaining[0] || '');
    }
  };

  const applyFundMerge = () => {
    const targetName = mergeFundName.trim();
    if (!targetName || selectedFundNames.length < 2) return;
    mergeMutation.mutate({ sourceNames: selectedFundNames, targetName });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funds</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fundData.length} funds - {latestMonth ? <span>Viewing <MonthBadge month={latestMonth} /></span> : 'No data'}
          </p>
        </div>
        <Select value={latestMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Latest month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort by:</p>
          <Button size="sm" variant={sortBy === 'name' ? 'default' : 'outline'} onClick={() => setSortBy('name')} className="h-7">
            Name
          </Button>
          <Button size="sm" variant={sortBy === 'size' ? 'default' : 'outline'} onClick={() => setSortBy('size')} className="h-7">
            Size
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={fundSearch}
              onChange={event => setFundSearch(event.target.value)}
              placeholder="Search similar funds..."
              className="h-8 w-72 pl-8 text-sm"
            />
          </div>
          <Button type="button" className="h-8 gap-2" disabled={selectedFundNames.length < 2} onClick={() => openMergeDialog()}>
            <GitMerge className="h-4 w-4" />
            Merge selected{selectedFundNames.length ? ` (${selectedFundNames.length})` : ''}
          </Button>
        </div>
      </div>

      {fundSearch.trim() && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Search Matches</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchMatches.length} likely match{searchMatches.length === 1 ? '' : 'es'} for "{fundSearch.trim()}". Select only the funds that should share one final name.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8"
                disabled={searchMatches.length === 0}
                onClick={() => setSelectedFunds(prev => new Set([...prev, ...searchMatches.map(item => item.name)]))}
              >
                Select matches
              </Button>
              <Button
                type="button"
                className="h-8"
                disabled={searchMatches.length < 2}
                onClick={() => openMergeDialog(searchMatches.map(item => item.name))}
              >
                Review matches
              </Button>
            </div>
          </div>
        </div>
      )}

      {suggestedGroups.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Suggested Similar Funds</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                These are only suggestions based on similar words and platforms. Review each group and choose the final name before merging.
              </p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{suggestedGroups.length} groups</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {suggestedGroups.slice(0, 8).map(group => (
              <div key={group.id} className="rounded-lg border bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.platforms.join(', ') || 'Multiple platforms'}</p>
                    <p className="mt-1 text-sm font-semibold">R {fmtNum(group.totalZar)}</p>
                  </div>
                  <Button type="button" size="sm" className="h-8 shrink-0" onClick={() => openMergeDialog(group.items.map(item => item.name))}>
                    Review merge
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {group.items.map(item => (
                    <p key={item.name} className="truncate text-xs text-slate-700">
                      <span className="font-semibold">R {fmtNum(item.totalZar)}</span>
                      <span className="text-muted-foreground"> - {item.name}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-10 px-4 py-3" />
                <th className="min-w-[260px] whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fund Name</th>
                <th className="min-w-[140px] whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total AUM (ZAR)</th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clients</th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Holdings</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platforms</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleFundData.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No funds.</td></tr>
              )}
              {visibleFundData.map(fund => (
                <Fragment key={fund.name}>
                  <tr className="cursor-pointer hover:bg-muted/20" onClick={() => setExpandedFund(expandedFund === fund.name ? null : fund.name)}>
                    <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedFunds.has(fund.name)}
                        onChange={() => toggleFund(fund.name)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                        aria-label={`Select ${fund.name} for merge`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{fund.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">R {fmtNum(fund.totalZar)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{fund.clients.length}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fund.holdings}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fund.platforms.join(', ')}</td>
                    <td className="px-4 py-3 text-center">
                      {expandedFund === fund.name ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                  {expandedFund === fund.name && (
                    <tr className="bg-muted/5">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clients in this fund ({fund.clients.length}):</p>
                          <div className="overflow-hidden rounded-lg border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/20">
                                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Client Name</th>
                                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Holdings</th>
                                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">AUM (ZAR)</th>
                                  <th className="w-6" />
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {fund.clients.map(client => (
                                  <tr key={client.code} className="hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium text-foreground">{client.name}</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">{client.holdings}</td>
                                    <td className="px-3 py-2 text-right font-mono text-foreground">R {fmtNum(client.totalZar)}</td>
                                    <td className="px-3 py-2 text-center">
                                      <Link to={`/clients/${encodeURIComponent(client.code)}`}>
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFundNames.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedFundNames.length} selected fund name{selectedFundNames.length === 1 ? '' : 's'}</p>
              <p className="text-xs text-muted-foreground">
                {selectedRowCount} valuation row{selectedRowCount === 1 ? '' : 's'} will be renamed if you confirm the merge.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-9 px-4" onClick={() => setSelectedFunds(new Set())}>
                Clear selection
              </Button>
              <Button type="button" className="h-9 gap-2 px-5" onClick={() => openMergeDialog()} disabled={selectedFundNames.length < 2}>
                <GitMerge className="h-4 w-4" />
                Merge selected
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Merge Selected Funds</DialogTitle>
            <DialogDescription>
              Choose the correct fund name. Confirming this permanently renames all matching valuation rows, so client portfolios and reports group under the same fund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected fund names</p>
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-slate-50 p-2">
                {selectedFundNames.map(name => (
                  <label key={name} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={selectedFunds.has(name)}
                      onChange={event => setMergeNameSelected(name, event.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                    />
                    <span className="min-w-0 flex-1 leading-5">{name}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded border bg-white px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-blue-50"
                      onClick={(event) => {
                        event.preventDefault();
                        setMergeFundName(name);
                      }}
                    >
                      Use name
                    </button>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Untick any names that should not be merged now. The remaining names stay separate and can be picked up by search or later suggestions.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final fund name</label>
              <Input
                value={mergeFundName}
                onChange={event => setMergeFundName(event.target.value)}
                placeholder="Enter the correct fund name"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will update {selectedRowCount} valuation row{selectedRowCount === 1 ? '' : 's'} across all months where the selected names appear.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeDialogOpen(false)} disabled={mergeMutation.isPending}>Cancel</Button>
            <Button type="button" onClick={applyFundMerge} disabled={!mergeFundName.trim() || selectedFundNames.length < 2 || mergeMutation.isPending}>
              {mergeMutation.isPending ? 'Merging...' : 'Confirm merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
