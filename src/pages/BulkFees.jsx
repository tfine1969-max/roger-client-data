import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { withCalculatedFees, buildFeeMap, feeKey } from '@/lib/fee-utils';
import { getSortedMonths, fmtNum } from '@/lib/valuation-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Save, AlertCircle } from 'lucide-react';

// Flatten all unique (client × instrument) combos from latest month, with current fees
function buildRows(valuations, feeConfigs, latestMonth) {
  const monthRows = valuations.filter(v => v.upload_month === latestMonth);
  const enriched = monthRows.map(r => withCalculatedFees(r, feeMappingRows, feeConfigs));
  // deduplicate by account_code + platform + investment_name
  const seen = new Set();
  const rows = [];
  for (const r of enriched) {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    if (!seen.has(k)) {
      seen.add(k);
      rows.push(r);
    }
  }
  return rows.sort((a, b) =>
    (a.portfolio_name || '').localeCompare(b.portfolio_name || '') ||
    (a.platform || '').localeCompare(b.platform || '') ||
    (a.investment_name || '').localeCompare(b.investment_name || '')
  );
}

export default function BulkFees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({}); // key -> { rebate, advisory }
  const [saving, setSaving] = useState(false);

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });
  const { data: feeConfigs = [], refetch: refetchFees } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const latestMonth = useMemo(() => getSortedMonths(valuations)[0] || '', [valuations]);
  const rows = useMemo(() => buildRows(valuations, feeConfigs, latestMonth), [valuations, feeConfigs, latestMonth]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (r.portfolio_name || '').toLowerCase().includes(q) ||
      (r.investment_name || '').toLowerCase().includes(q) ||
      (r.platform || '').toLowerCase().includes(q) ||
      (r.account_code || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const getEdit = (r) => {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    return edits[k] ?? {
      rebate: r.rebate_fee_annual_percent ?? 0,
      advisory: r.advisory_fee_annual_percent ?? 0,
    };
  };

  const setEdit = (r, field, value) => {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    setEdits(prev => ({
      ...prev,
      [k]: { ...getEdit(r), [field]: value },
    }));
  };

  const dirtyKeys = Object.keys(edits);
  const dirtyCount = dirtyKeys.length;

  const handleSaveAll = async () => {
    if (!dirtyCount) return;
    setSaving(true);
    try {
      const feeMap = buildFeeMap(feeConfigs);
      for (const [k, { rebate, advisory }] of Object.entries(edits)) {
        const [account_code, platform, investment_name] = k.split('||');
        const rebateVal = parseFloat(rebate) || 0;
        const advisoryVal = parseFloat(advisory) || 0;
        const existing = feeMap[k];
        if (existing) {
          await base44.entities.FeeConfig.update(existing.id, {
            rebate_fee_annual_percent: rebateVal,
            advisory_fee_annual_percent: advisoryVal,
          });
        } else {
          const row = rows.find(r => feeKey(r.account_code, r.platform, r.investment_name) === k);
          await base44.entities.FeeConfig.create({
            account_code,
            platform,
            investment_name,
            portfolio_name: row?.portfolio_name || '',
            rebate_fee_annual_percent: rebateVal,
            advisory_fee_annual_percent: advisoryVal,
            effective_from_month: latestMonth,
          });
        }
      }
      await refetchFees();
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      setEdits({});
      toast.success(`${dirtyCount} fee config${dirtyCount !== 1 ? 's' : ''} saved`);
    } catch (err) {
      toast.error(err.message || 'Failed to save fees');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSet = (field, value) => {
    const next = {};
    filtered.forEach(r => {
      const k = feeKey(r.account_code, r.platform, r.investment_name);
      next[k] = { ...getEdit(r), [field]: value };
    });
    setEdits(prev => ({ ...prev, ...next }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bulk Fee Editor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit advisory &amp; rebate fees for all instruments. Changes saved as FeeConfig overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
            </span>
          )}
          <Button onClick={handleSaveAll} disabled={!dirtyCount || saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* Search + bulk set */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search client, fund, platform…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Set all visible:</span>
          <BulkSetButton label="Rebate" onSet={v => handleBulkSet('rebate', v)} />
          <BulkSetButton label="Advisory" onSet={v => handleBulkSet('advisory', v)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Platform</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Instrument</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (ZAR)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Rebate % p.a.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Advisory % p.a.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Fee Source</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No instruments found.</td></tr>
              )}
              {filtered.map(r => {
                const k = feeKey(r.account_code, r.platform, r.investment_name);
                const edit = getEdit(r);
                const isDirty = !!edits[k];
                return (
                  <tr key={k} className={`hover:bg-muted/20 ${isDirty ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-sm leading-tight">{r.portfolio_name || '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.account_code}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{r.platform}</td>
                    <td className="px-4 py-2.5 text-sm max-w-xs">
                      <span className="line-clamp-2">{r.investment_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">R {fmtNum(r.zar_value ?? 0)}</td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        className={`w-24 mx-auto text-center text-sm h-8 ${isDirty ? 'border-amber-400 ring-amber-200' : ''}`}
                        value={edit.rebate}
                        onChange={e => setEdit(r, 'rebate', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        className={`w-24 mx-auto text-center text-sm h-8 ${isDirty ? 'border-amber-400 ring-amber-200' : ''}`}
                        value={edit.advisory}
                        onChange={e => setEdit(r, 'advisory', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <SourceBadge source={r.fee_source} required={r.fee_required} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
          Showing {filtered.length} of {rows.length} instruments from {latestMonth}
        </div>
      </div>
    </div>
  );
}

function BulkSetButton({ label, onSet }) {
  const [val, setVal] = useState('');
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <input
        type="number"
        step="0.01"
        min="0"
        max="10"
        className="w-16 border rounded px-1.5 py-0.5 text-xs text-center"
        placeholder="0.00"
        value={val}
        onChange={e => setVal(e.target.value)}
      />
      <button
        className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        disabled={!val}
        onClick={() => { onSet(parseFloat(val) || 0); setVal(''); }}
      >
        Apply
      </button>
    </span>
  );
}

function SourceBadge({ source, required }) {
  if (required) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Missing</span>;
  if (source === 'override') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Override</span>;
  if (source === 'mapping') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Mapped</span>;
  if (source === 'stored') return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Stored</span>;
  return null;
}