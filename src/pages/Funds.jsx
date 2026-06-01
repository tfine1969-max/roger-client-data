import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Cloud, CloudOff, Link2, Loader2, Plus, Search, X, Pencil, ArrowUpDown } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import ProviderLogo from '@/components/shared/ProviderLogo';
import { masterFundListUnique as masterFundList } from '@/data/masterFundList';
import { base44 } from '@/api/base44Client';

const MAPPING_KEY = 'fund_master_mappings_v4';
const EXTRA_MASTER_KEY = 'fund_master_extra_v4';
const NO_MASTER = '__none__';

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function canonicalKey(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bfof\b/g, ' fund of funds ')
    .replace(/\bfund of fund\b/g, ' fund of funds ')
    .replace(/\b(class|cls)\s*[a-z0-9]+\b/g, ' ')
    .replace(/\(([a-z0-9]{1,4})\)/g, ' $1 ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

function tokenSet(value) {
  return new Set(clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean));
}

function scoreMatch(source, target) {
  const sourceKey = canonicalKey(source);
  const targetKey = canonicalKey(target);
  if (!sourceKey || !targetKey) return 0;
  if (sourceKey === targetKey) return 1;
  if (sourceKey.includes(targetKey) || targetKey.includes(sourceKey)) return 0.9;
  const a = tokenSet(source);
  const b = tokenSet(target);
  const overlap = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size || 1;
  return overlap / union;
}

function duplicateMasterMatch(source, target) {
  const sourceKey = canonicalKey(source);
  const targetKey = canonicalKey(target);
  if (!sourceKey || !targetKey) return false;
  if (sourceKey === targetKey) return true;

  const sourceTokens = tokenSet(source);
  const targetTokens = tokenSet(target);
  const overlap = [...sourceTokens].filter(token => targetTokens.has(token)).length;
  const overlapRatio = overlap / Math.max(sourceTokens.size, targetTokens.size, 1);
  return overlapRatio >= 0.9 && Math.abs(sourceKey.length - targetKey.length) <= 6;
}

function providerId(value) {
  return clean(value).toLowerCase()
    .replace('julius baer', 'julius-baer')
    .replace('prime investments', 'prime')
    .replace('gryphon asset management', 'gryphon')
    .replace('peresec securities', 'peresec')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function variantKey(row) {
  return `${clean(row.platform) || 'Unknown'}||${clean(row.investment_name) || 'Unknown'}`;
}

export default function Funds() {
  const [activeTab, setActiveTab] = useState('master-list');
  const [masterListSort, setMasterListSort] = useState('aum'); // 'aum' | 'name'
  const [masterListSearch, setMasterListSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [globalVariantSearch, setGlobalVariantSearch] = useState('');
  const [showLinkedNames, setShowLinkedNames] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(masterFundList[0]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedReviewVariants, setSelectedReviewVariants] = useState({});
  const [bulkReviewTarget, setBulkReviewTarget] = useState(NO_MASTER);
  const [reviewTargets, setReviewTargets] = useState({});
  const [newFundName, setNewFundName] = useState('');
  const [newMasterDraft, setNewMasterDraft] = useState(null);
  const [message, setMessage] = useState(null);
  const [mappings, setMappings] = useState(() => loadJson(MAPPING_KEY, {}));
  const [extraMasterFunds, setExtraMasterFunds] = useState(() => loadJson(EXTRA_MASTER_KEY, []));
  const [dbSyncStatus, setDbSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

  const queryClient = useQueryClient();

  const { data: fundMergeRules = [] } = useQuery({
    queryKey: ['fundMergeRules'],
    queryFn: () => base44.entities.FundMergeRule.list('source_name', 5000),
    staleTime: 5 * 60 * 1000,
  });

  // On startup, hydrate localStorage from DB if local data is missing.
  // This restores mappings after a container restart without any manual steps.
  useEffect(() => {
    if (!fundMergeRules.length) return;
    const existingMappings = loadJson(MAPPING_KEY, {});
    const existingExtra = loadJson(EXTRA_MASTER_KEY, []);
    const hydratedMappings = { ...existingMappings };
    const hydratedExtra = new Set(existingExtra);
    let changed = false;
    fundMergeRules.forEach(rule => {
      if (!rule.source_name || !rule.canonical_name) return;
      if (rule.platform === '__extra_master__') {
        if (!hydratedExtra.has(rule.canonical_name)) { hydratedExtra.add(rule.canonical_name); changed = true; }
        return;
      }
      const key = `${clean(rule.platform || 'Unknown')}||${clean(rule.source_name)}`;
      if (!hydratedMappings[key]) { hydratedMappings[key] = rule.canonical_name; changed = true; }
    });
    if (changed) {
      saveJson(MAPPING_KEY, hydratedMappings);
      setMappings(hydratedMappings);
      const extraArr = [...hydratedExtra].sort((a, b) => a.localeCompare(b));
      saveJson(EXTRA_MASTER_KEY, extraArr);
      setExtraMasterFunds(extraArr);
    }
  }, [fundMergeRules]);

  // Persist all current mappings + extra master funds to the DB so they survive
  // container restarts and session changes. Called automatically on every link op.
  const persistToDb = useCallback(async (currentMappings, currentExtraFunds) => {
    setDbSyncStatus('saving');
    try {
      const rules = [
        ...Object.entries(currentMappings)
          .filter(([, canonical]) => canonical)
          .map(([key, canonical]) => {
            const sepIdx = key.indexOf('||');
            return { source_name: key.slice(sepIdx + 2), canonical_name: canonical, platform: key.slice(0, sepIdx) };
          }),
        ...(currentExtraFunds || []).map(name => ({
          source_name: name, canonical_name: name, platform: '__extra_master__',
        })),
      ];
      if (!rules.length) { setDbSyncStatus('idle'); return; }
      await base44.functions.invoke('seedFundMergeRules', { rules });
      queryClient.invalidateQueries({ queryKey: ['fundMergeRules'] });
      setDbSyncStatus('saved');
      setTimeout(() => setDbSyncStatus('idle'), 4000);
    } catch {
      setDbSyncStatus('error');
    }
  }, [queryClient]);

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = selectedMonth || months[0] || '';
  const masterFunds = useMemo(() => {
    return [...new Set([...masterFundList, ...extraMasterFunds].map(clean).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [extraMasterFunds]);

  const variants = useMemo(() => {
    const grouped = {};
    valuations.filter(row => row.upload_month === latestMonth).forEach(row => {
      const key = variantKey(row);
      if (!grouped[key]) {
        grouped[key] = {
          key,
          platform: clean(row.platform) || 'Unknown',
          name: clean(row.investment_name) || 'Unknown',
          totalZar: 0,
          holdings: 0,
          clients: new Set(),
        };
      }
      grouped[key].totalZar += zarVal(row);
      grouped[key].holdings += 1;
      grouped[key].clients.add(row.account_code || row.portfolio_name || 'Unknown');
    });
    return Object.values(grouped).map(variant => {
      const exactMaster = masterFunds.find(fund => canonicalKey(fund) === canonicalKey(variant.name));
      const mappedMaster = mappings[variant.key] || exactMaster || '';
      const suggestions = masterFunds
        .map(fund => ({ fund, score: scoreMatch(variant.name, fund) }))
        .filter(match => match.score >= 0.28)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return {
        ...variant,
        clients: variant.clients.size,
        mappedMaster,
        autoMatched: !mappings[variant.key] && !!exactMaster,
        suggestions,
      };
    }).sort((a, b) => b.totalZar - a.totalZar);
  }, [valuations, latestMonth, mappings, masterFunds]);

  const masterStats = useMemo(() => {
    const stats = {};
    masterFunds.forEach(fund => { stats[fund] = { variants: 0, totalZar: 0 }; });
    variants.forEach(variant => {
      if (!variant.mappedMaster) return;
      if (!stats[variant.mappedMaster]) stats[variant.mappedMaster] = { variants: 0, totalZar: 0 };
      stats[variant.mappedMaster].variants += 1;
      stats[variant.mappedMaster].totalZar += variant.totalZar;
    });
    return stats;
  }, [masterFunds, variants]);

  const filteredMasterFunds = masterFunds.filter(fund => canonicalKey(fund).includes(canonicalKey(searchTerm)));

  // Tab 1: master list sorted by AUM (default) or name, with search
  const masterListRows = useMemo(() => {
    const q = canonicalKey(masterListSearch);
    return masterFunds
      .filter(fund => !q || canonicalKey(fund).includes(q))
      .map(fund => ({ fund, ...(masterStats[fund] || { variants: 0, totalZar: 0 }) }))
      .sort((a, b) => masterListSort === 'name' ? a.fund.localeCompare(b.fund) : b.totalZar - a.totalZar);
  }, [masterFunds, masterStats, masterListSort, masterListSearch]);
  const selectedMasterVariants = variants
    .filter(variant => variant.mappedMaster === selectedMaster || variant.suggestions.some(match => match.fund === selectedMaster))
    .filter(variant => canonicalKey(`${variant.platform} ${variant.name}`).includes(canonicalKey(variantSearch)));
  const selectedMasterPendingVariants = selectedMasterVariants.filter(variant => mappings[variant.key] !== selectedMaster);
  const reviewVariants = variants.filter(variant => !variant.mappedMaster);
  const linkedCount = variants.filter(variant => variant.mappedMaster).length;
  // Variants already mapped to the currently selected master
  const linkedToMaster = variants.filter(v => mappings[v.key] === selectedMaster);
  // Global search across ALL variants (linked + unlinked) for reassignment
  const globalSearchResults = useMemo(() => {
    const q = canonicalKey(globalVariantSearch);
    if (!q) return [];
    return variants.filter(v => canonicalKey(`${v.platform} ${v.name}`).includes(q));
  }, [variants, globalVariantSearch]);

  const toggleVariant = (key) => {
    setSelectedVariants(current => ({ ...current, [key]: !current[key] }));
  };

  const linkSelected = () => {
    const keys = Object.entries(selectedVariants).filter(([, checked]) => checked).map(([key]) => key);
    if (!selectedMaster || keys.length === 0) return;
    const next = { ...mappings };
    keys.forEach(key => { next[key] = selectedMaster; });
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setSelectedVariants({});
    setMessage({ type: 'success', text: `Linked ${keys.length} provider instrument${keys.length === 1 ? '' : 's'} to ${selectedMaster}.` });
    persistToDb(next, extraMasterFunds);
  };

  const selectedReviewKeys = Object.entries(selectedReviewVariants).filter(([, checked]) => checked).map(([key]) => key);

  const toggleReviewVariant = (key) => {
    setSelectedReviewVariants(current => ({ ...current, [key]: !current[key] }));
  };

  const linkSelectedReview = () => {
    if (bulkReviewTarget === NO_MASTER || selectedReviewKeys.length === 0) return;
    const next = { ...mappings };
    selectedReviewKeys.forEach(key => { next[key] = bulkReviewTarget; });
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setSelectedReviewVariants({});
    setBulkReviewTarget(NO_MASTER);
    setMessage({ type: 'success', text: `Linked ${selectedReviewKeys.length} provider instrument${selectedReviewKeys.length === 1 ? '' : 's'} to ${bulkReviewTarget}.` });
    persistToDb(next, extraMasterFunds);
  };

  const linkOne = (key, fund) => {
    if (!fund) return;
    const next = { ...mappings, [key]: fund };
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setMessage({ type: 'success', text: `Linked instrument to ${fund}.` });
    persistToDb(next, extraMasterFunds);
  };

  const unlinkOne = (key) => {
    const next = { ...mappings };
    delete next[key];
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setMessage({ type: 'success', text: 'Removed the manual fund link.' });
    persistToDb(next, extraMasterFunds);
  };

  const addMasterFund = (name = newFundName, variantKeyToSelect = null) => {
    const fund = clean(name);
    if (!fund) return;
    const existing = masterFunds.find(master => duplicateMasterMatch(fund, master));
    if (existing) {
      setSelectedMaster(existing);
      if (variantKeyToSelect) setReviewTargets(current => ({ ...current, [variantKeyToSelect]: existing }));
      setNewFundName('');
      setMessage({ type: 'success', text: `${fund} already matches ${existing}. Select provider names and confirm the link instead of adding a duplicate master fund.` });
      return;
    }
    const next = [...extraMasterFunds, fund].sort((a, b) => a.localeCompare(b));
    setExtraMasterFunds(next);
    saveJson(EXTRA_MASTER_KEY, next);
    setSelectedMaster(fund);
    if (variantKeyToSelect) setReviewTargets(current => ({ ...current, [variantKeyToSelect]: fund }));
    setNewFundName('');
    setMessage({ type: 'success', text: `Added ${fund} to the master list. Confirm the link to apply it to the provider instrument.` });
    persistToDb(mappings, next);
  };

  const openNewMasterModal = (variant) => {
    setNewMasterDraft({
      variantKey: variant.key,
      originalName: variant.name,
      editedName: variant.name,
      platform: variant.platform,
    });
  };

  const confirmNewMaster = () => {
    if (!newMasterDraft) return;
    addMasterFund(newMasterDraft.editedName, newMasterDraft.variantKey);
    setNewMasterDraft(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fund Master List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Link provider instrument names to the approved Wealthworks fund naming convention.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dbSyncStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving to database…
            </span>
          )}
          {dbSyncStatus === 'saved' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
              <Cloud className="h-3.5 w-3.5" /> Saved to database
            </span>
          )}
          {dbSyncStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
              <CloudOff className="h-3.5 w-3.5" /> Save failed — retry below
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={dbSyncStatus === 'saving'}
            onClick={() => persistToDb(mappings, extraMasterFunds)}
          >
            <Cloud className="h-3.5 w-3.5" />
            {Object.keys(mappings).length > 0 ? `Save ${Object.keys(mappings).length} links to DB` : 'Save to database'}
          </Button>
          <Select value={latestMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Latest month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reporting Month</p>
          <div className="mt-2">{latestMonth ? <MonthBadge month={latestMonth} /> : 'No data'}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Master Funds</p>
          <p className="mt-1 text-2xl font-semibold">{masterFunds.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imported Names</p>
          <p className="mt-1 text-2xl font-semibold">{variants.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Need Review</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{reviewVariants.length}</p>
        </div>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {message.text}</span>
          <button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="master-list">Master Fund List</TabsTrigger>
          <TabsTrigger value="link-funds">Link Funds</TabsTrigger>
        </TabsList>

        <TabsContent value="master-list">
          <div className="rounded-lg border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={masterListSearch} onChange={e => setMasterListSearch(e.target.value)} placeholder="Search funds…" className="h-8 w-64 pl-8 text-xs" />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setMasterListSort(s => s === 'aum' ? 'name' : 'aum')}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort by: {masterListSort === 'aum' ? 'AUM (highest first)' : 'Name (A–Z)'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fund Name</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AUM (ZAR)</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linked Names</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {masterListRows.map((row, i) => (
                    <tr key={row.fund} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-sm">{row.fund}</td>
                      <td className="px-4 py-2.5 text-right font-numbers text-sm">
                        {row.totalZar > 0 ? <>ZAR {fmtNum(row.totalZar)}</> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm">{row.variants}</td>
                    </tr>
                  ))}
                  {masterListRows.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No funds match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="link-funds">
      <div className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_1fr]">
        <section className="rounded-lg border bg-white">
          <div className="border-b p-3">
            <h2 className="text-sm font-semibold">Master List</h2>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search master funds" className="h-8 pl-8 text-xs" />
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={newFundName} onChange={e => setNewFundName(e.target.value)} placeholder="Add new master fund" className="h-8 text-xs" />
              <Button onClick={() => addMasterFund()} className="h-8 gap-1.5 px-3 text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
          </div>
          <div className="max-h-[650px] overflow-y-auto divide-y">
            {filteredMasterFunds.map(fund => {
              const stats = masterStats[fund] || { variants: 0, totalZar: 0 };
              return (
                <button
                  key={fund}
                  onClick={() => { setSelectedMaster(fund); setSelectedVariants({}); }}
                  className={`w-full px-3 py-2 text-left transition hover:bg-muted/30 ${selectedMaster === fund ? 'bg-primary/5' : ''}`}
                >
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">{fund}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {stats.variants} linked names · ZAR {fmtNum(stats.totalZar)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          {(selectedMasterPendingVariants.length > 0 || variantSearch) && <div className="rounded-lg border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Selected Master Review</h2>
                <p className="max-w-[520px] truncate text-xs text-muted-foreground">Selected master fund: <strong>{selectedMaster}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={variantSearch} onChange={e => setVariantSearch(e.target.value)} placeholder="Filter provider names" className="h-8 w-52 text-xs" />
                <Button onClick={linkSelected} disabled={!Object.values(selectedVariants).some(Boolean)} className="h-8 gap-2 text-xs">
                  <Link2 className="h-3.5 w-3.5" /> Link selected
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-8 px-2 py-1.5"></th>
                    <th className="w-[38%] px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Provider Instrument</th>
                    <th className="w-[28%] px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="w-[15%] px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AUM</th>
                    <th className="w-[7%] px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clients</th>
                    <th className="w-[12%] px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedMasterVariants.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No provider instruments suggested for this master fund.</td></tr>
                  )}
                  {selectedMasterPendingVariants.map(variant => {
                    const linkedHere = mappings[variant.key] === selectedMaster;
                    const suggestedHere = variant.mappedMaster === selectedMaster;
                    const best = variant.suggestions[0];
                    return (
                      <tr key={variant.key} className={linkedHere ? 'bg-green-50/40' : suggestedHere ? 'bg-amber-50/30' : ''}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={!!selectedVariants[variant.key]} onChange={() => toggleVariant(variant.key)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="grid min-w-0 grid-cols-[66px_minmax(0,1fr)] items-center gap-2">
                            <ProviderLogo providerId={providerId(variant.platform)} provider={variant.platform} logoBoxClassName="h-7 w-[66px]" logoClassName="max-h-4 max-w-[54px]" showName={false} />
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-tight text-foreground" title={variant.name}>{variant.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{variant.platform} · {variant.holdings} holdings</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] leading-snug">
                          {linkedHere ? (
                            <span className="line-clamp-2 font-semibold text-green-700" title={variant.mappedMaster}>{variant.mappedMaster}</span>
                          ) : suggestedHere ? (
                            <span className="line-clamp-2 font-semibold text-amber-700" title={variant.mappedMaster}>Suggested: {variant.mappedMaster}</span>
                          ) : best ? (
                            <span className="line-clamp-2 text-muted-foreground" title={best.fund}>Suggested: <strong className="text-foreground">{best.fund}</strong> ({Math.round(best.score * 100)}%)</span>
                          ) : (
                            <span className="text-amber-700">No confident match</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right font-numbers leading-tight"><span className="block text-[9px] text-muted-foreground">ZAR</span>{fmtNum(variant.totalZar)}</td>
                        <td className="px-2 py-1.5 text-right">{variant.clients}</td>
                        <td className="px-2 py-1.5 text-right">
                          {linkedHere ? (
                            <Button variant="outline" size="sm" onClick={() => unlinkOne(variant.key)} className="h-7 px-2 text-[11px]">Unlink</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => linkOne(variant.key, selectedMaster)} className="h-7 px-2 text-[11px]">
                              {suggestedHere ? 'Confirm' : 'Link'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>}

          {/* Currently linked names for selected master — lets user see & change existing links */}
          {linkedToMaster.length > 0 && (
            <div className="rounded-lg border bg-white">
              <button
                onClick={() => setShowLinkedNames(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/20 text-left"
              >
                <div>
                  <h2 className="text-sm font-semibold">{linkedToMaster.length} name{linkedToMaster.length !== 1 ? 's' : ''} currently linked to <span className="text-primary">{selectedMaster}</span></h2>
                  <p className="text-xs text-muted-foreground">Expand to unlink or reassign to a different master fund</p>
                </div>
                <span className="text-xs text-muted-foreground">{showLinkedNames ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showLinkedNames && (
                <div className="border-t divide-y">
                  {linkedToMaster.map(variant => (
                    <div key={variant.key} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={variant.name}>{variant.name}</p>
                        <p className="text-[11px] text-muted-foreground">{variant.platform} · ZAR {fmtNum(variant.totalZar)}</p>
                      </div>
                      <select
                        className="h-7 rounded border border-input bg-white text-[11px] px-1.5 max-w-[220px] truncate"
                        value={mappings[variant.key] || ''}
                        onChange={e => { if (e.target.value) linkOne(variant.key, e.target.value); }}
                      >
                        {masterFunds.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <Button variant="outline" size="sm" onClick={() => unlinkOne(variant.key)} className="h-7 px-2 text-[11px] shrink-0">Unlink</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Global variant search — find ANY provider name (linked or not) and reassign it */}
          <div className="rounded-lg border bg-white">
            <div className="border-b px-3 py-2.5">
              <h2 className="text-sm font-semibold flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Find &amp; Reassign</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Search any provider instrument name to change an existing link or link an unlinked name.</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={globalVariantSearch} onChange={e => setGlobalVariantSearch(e.target.value)} placeholder="Type a fund name to search all variants…" className="h-8 pl-8 text-xs" />
              </div>
            </div>
            {globalSearchResults.length > 0 && (
              <div className="divide-y">
                {globalSearchResults.slice(0, 20).map(variant => (
                  <div key={variant.key} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" title={variant.name}>{variant.name}</p>
                      <p className="text-[11px] text-muted-foreground">{variant.platform} · ZAR {fmtNum(variant.totalZar)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {mappings[variant.key] && (
                        <span className="text-[10px] text-green-700 font-medium max-w-[120px] truncate" title={mappings[variant.key]}>→ {mappings[variant.key]}</span>
                      )}
                      <select
                        className="h-7 rounded border border-input bg-white text-[11px] px-1.5 max-w-[200px]"
                        value={mappings[variant.key] || ''}
                        onChange={e => { if (e.target.value) linkOne(variant.key, e.target.value); }}
                      >
                        <option value="">— choose master —</option>
                        {masterFunds.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      {mappings[variant.key] && (
                        <Button variant="ghost" size="sm" onClick={() => unlinkOne(variant.key)} className="h-7 px-2 text-[11px]">Unlink</Button>
                      )}
                    </div>
                  </div>
                ))}
                {globalSearchResults.length > 20 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">{globalSearchResults.length - 20} more results — refine your search.</p>
                )}
              </div>
            )}
            {globalVariantSearch && globalSearchResults.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">No provider instruments match &quot;{globalVariantSearch}&quot;.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Unlinked Provider Instruments</h2>
                  <p className="text-xs text-muted-foreground">
                    {linkedCount} of {variants.length} imported names linked. Select multiple rows to link them together.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedReviewKeys.length} selected</span>
                  <Select value={bulkReviewTarget} onValueChange={setBulkReviewTarget}>
                    <SelectTrigger className="h-8 w-64 bg-white text-xs">
                      <SelectValue placeholder="Choose master fund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MASTER}>Choose master fund</SelectItem>
                      {masterFunds.map(fund => <SelectItem key={`bulk-${fund}`} value={fund}>{fund}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={linkSelectedReview}
                    disabled={bulkReviewTarget === NO_MASTER || selectedReviewKeys.length === 0}
                    className="h-8 gap-1.5 px-3 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Link selected
                  </Button>
                </div>
              </div>
            </div>
            <div className="divide-y">
              {reviewVariants.slice(0, 12).map(variant => {
                const best = variant.suggestions[0];
                const selectedTarget = reviewTargets[variant.key] || best?.fund || NO_MASTER;
                return (
                  <div key={variant.key} className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_244px_150px] md:items-center">
                    <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-2">
                      <input type="checkbox" checked={!!selectedReviewVariants[variant.key]} onChange={() => toggleReviewVariant(variant.key)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight" title={variant.name}>{variant.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{variant.platform} · ZAR {fmtNum(variant.totalZar)} · {variant.clients} clients</p>
                      </div>
                    </div>
                    <Select
                      value={selectedTarget}
                      onValueChange={fund => setReviewTargets(current => ({ ...current, [variant.key]: fund }))}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Choose master fund" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MASTER}>No link selected</SelectItem>
                        {variant.suggestions.map(match => (
                          <SelectItem key={match.fund} value={match.fund}>{match.fund} ({Math.round(match.score * 100)}%)</SelectItem>
                        ))}
                        {masterFunds
                          .filter(fund => !variant.suggestions.some(match => match.fund === fund))
                          .map(fund => <SelectItem key={`all-${fund}`} value={fund}>{fund}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => linkOne(variant.key, selectedTarget === NO_MASTER ? '' : selectedTarget)}
                        disabled={selectedTarget === NO_MASTER}
                        className="h-8 flex-[1.2] gap-1.5 px-2 text-[11px]"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Confirm
                      </Button>
                      <Button variant="outline" onClick={() => openNewMasterModal(variant)} className="h-8 flex-1 gap-1 px-2 text-[11px]">
                        <Plus className="h-3 w-3" /> New
                      </Button>
                    </div>
                  </div>
                );
              })}
              {reviewVariants.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">All imported provider names are linked for this month.</div>
              )}
            </div>
          </div>
        </section>
      </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!newMasterDraft} onOpenChange={open => { if (!open) setNewMasterDraft(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Master Fund</DialogTitle>
            <DialogDescription>
              Edit the name before adding it to the master list. After adding, confirm the link in the row.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-semibold text-foreground">Imported provider name</p>
              <p className="mt-1 text-muted-foreground">{newMasterDraft?.originalName}</p>
              <p className="mt-1 text-muted-foreground">{newMasterDraft?.platform}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Master fund name</label>
              <Input
                value={newMasterDraft?.editedName || ''}
                onChange={e => setNewMasterDraft(current => current ? { ...current, editedName: e.target.value } : current)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMasterDraft(null)}>Cancel</Button>
            <Button onClick={confirmNewMaster} disabled={!clean(newMasterDraft?.editedName)}>Add to master list</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}