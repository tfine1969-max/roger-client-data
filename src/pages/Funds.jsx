import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Link2, Plus, Search, X } from 'lucide-react';
import MonthBadge from '@/components/shared/MonthBadge';
import ProviderLogo from '@/components/shared/ProviderLogo';
import { masterFundList } from '@/data/masterFundList';

const MAPPING_KEY = 'fund_master_mappings_v1';
const EXTRA_MASTER_KEY = 'fund_master_extra_v1';

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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [selectedMaster, setSelectedMaster] = useState(masterFundList[0]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [newFundName, setNewFundName] = useState('');
  const [message, setMessage] = useState(null);
  const [mappings, setMappings] = useState(() => loadJson(MAPPING_KEY, {}));
  const [extraMasterFunds, setExtraMasterFunds] = useState(() => loadJson(EXTRA_MASTER_KEY, []));

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
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
  const selectedMasterVariants = variants
    .filter(variant => variant.mappedMaster === selectedMaster || variant.suggestions.some(match => match.fund === selectedMaster))
    .filter(variant => canonicalKey(`${variant.platform} ${variant.name}`).includes(canonicalKey(variantSearch)));
  const reviewVariants = variants.filter(variant => !variant.mappedMaster);
  const linkedCount = variants.filter(variant => variant.mappedMaster).length;

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
  };

  const linkOne = (key, fund) => {
    const next = { ...mappings, [key]: fund };
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setMessage({ type: 'success', text: `Linked instrument to ${fund}.` });
  };

  const unlinkOne = (key) => {
    const next = { ...mappings };
    delete next[key];
    setMappings(next);
    saveJson(MAPPING_KEY, next);
    setMessage({ type: 'success', text: 'Removed the manual fund link.' });
  };

  const addMasterFund = (name = newFundName) => {
    const fund = clean(name);
    if (!fund) return;
    if (masterFunds.some(existing => canonicalKey(existing) === canonicalKey(fund))) {
      setSelectedMaster(masterFunds.find(existing => canonicalKey(existing) === canonicalKey(fund)));
      setNewFundName('');
      return;
    }
    const next = [...extraMasterFunds, fund].sort((a, b) => a.localeCompare(b));
    setExtraMasterFunds(next);
    saveJson(EXTRA_MASTER_KEY, next);
    setSelectedMaster(fund);
    setNewFundName('');
    setMessage({ type: 'success', text: `Added ${fund} to the master list.` });
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
        <Select value={latestMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="Latest month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
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

        <section className="space-y-4">
          <div className="rounded-lg border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Link Provider Names</h2>
                <p className="max-w-[520px] truncate text-xs text-muted-foreground">Selected master fund: <strong>{selectedMaster}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={variantSearch} onChange={e => setVariantSearch(e.target.value)} placeholder="Filter provider names" className="h-9 w-56 text-xs" />
                <Button onClick={linkSelected} disabled={!Object.values(selectedVariants).some(Boolean)} className="h-9 gap-2 text-xs">
                  <Link2 className="h-3.5 w-3.5" /> Link selected
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-9 px-3 py-2"></th>
                    <th className="w-[36%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Provider Instrument</th>
                    <th className="w-[26%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Link / Suggestion</th>
                    <th className="w-[16%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AUM</th>
                    <th className="w-[8%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Clients</th>
                    <th className="w-[14%] px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedMasterVariants.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No provider instruments suggested for this master fund.</td></tr>
                  )}
                  {selectedMasterVariants.map(variant => {
                    const linkedHere = mappings[variant.key] === selectedMaster;
                    const suggestedHere = variant.mappedMaster === selectedMaster;
                    const best = variant.suggestions[0];
                    return (
                      <tr key={variant.key} className={linkedHere ? 'bg-green-50/40' : suggestedHere ? 'bg-amber-50/30' : ''}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={!!selectedVariants[variant.key]} onChange={() => toggleVariant(variant.key)} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="grid min-w-0 grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
                            <ProviderLogo providerId={providerId(variant.platform)} provider={variant.platform} logoBoxClassName="h-8 w-[76px]" logoClassName="max-h-5 max-w-[62px]" showName={false} />
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-tight text-foreground" title={variant.name}>{variant.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{variant.platform} · {variant.holdings} holdings</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11px] leading-snug">
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
                        <td className="px-3 py-2 text-right font-numbers leading-tight"><span className="block text-[10px] text-muted-foreground">ZAR</span>{fmtNum(variant.totalZar)}</td>
                        <td className="px-3 py-2 text-right">{variant.clients}</td>
                        <td className="px-3 py-2 text-right">
                          {linkedHere ? (
                            <Button variant="outline" size="sm" onClick={() => unlinkOne(variant.key)} className="h-8 px-3 text-xs">Unlink</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => linkOne(variant.key, selectedMaster)} className="h-8 px-3 text-xs">
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
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Unlinked Provider Instruments</h2>
              <p className="text-xs text-muted-foreground">
                {linkedCount} of {variants.length} imported names linked. Review these after every new upload.
              </p>
            </div>
            <div className="divide-y">
              {reviewVariants.slice(0, 12).map(variant => {
                const best = variant.suggestions[0];
                return (
                  <div key={variant.key} className="grid gap-2 px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_250px_142px] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight" title={variant.name}>{variant.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{variant.platform} · ZAR {fmtNum(variant.totalZar)} · {variant.clients} clients</p>
                    </div>
                    <Select value={best?.fund || ''} onValueChange={fund => linkOne(variant.key, fund)}>
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Choose master fund" />
                      </SelectTrigger>
                      <SelectContent>
                        {variant.suggestions.map(match => (
                          <SelectItem key={match.fund} value={match.fund}>{match.fund} ({Math.round(match.score * 100)}%)</SelectItem>
                        ))}
                        {masterFunds
                          .filter(fund => !variant.suggestions.some(match => match.fund === fund))
                          .map(fund => <SelectItem key={`all-${fund}`} value={fund}>{fund}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => addMasterFund(variant.name)} className="h-9 gap-1.5 px-3 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add as master
                    </Button>
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
    </div>
  );
}
