import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { withCalculatedFees, buildFeeMap, feeKey, calcFees } from '@/lib/fee-utils';
import { getSortedMonths, fmtNum, formatMonth, zarVal, origVal } from '@/lib/valuation-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Save, AlertCircle, ChevronDown, ChevronRight, Users, LayoutList } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildClientRows(valuations, feeConfigs, month) {
  const monthRows = valuations.filter(v => v.upload_month === month);
  const enriched = monthRows.map(r => withCalculatedFees(r, feeMappingRows, feeConfigs));
  const seen = new Set();
  const rows = [];
  for (const r of enriched) {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    if (!seen.has(k)) { seen.add(k); rows.push(r); }
  }
  return rows.sort((a, b) =>
    (a.portfolio_name || '').localeCompare(b.portfolio_name || '') ||
    (a.platform || '').localeCompare(b.platform || '') ||
    (a.investment_name || '').localeCompare(b.investment_name || '')
  );
}

function buildInstrumentGroups(rows) {
  const map = {};
  for (const r of rows) {
    const k = `${r.platform}||${r.investment_name}`;
    if (!map[k]) map[k] = { platform: r.platform, investment_name: r.investment_name, rows: [] };
    map[k].rows.push(r);
  }
  return Object.values(map).sort((a, b) =>
    (a.investment_name || '').localeCompare(b.investment_name || '')
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function BulkFees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('client'); // 'client' | 'instrument'
  const [edits, setEdits] = useState({}); // feeKey -> { rebate, advisory }
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({}); // instrument group key -> bool
  const [selectedMonth, setSelectedMonth] = useState(null); // null = latest

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 20000),
  });
  const { data: feeConfigs = [], refetch: refetchFees } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const activeMonth = selectedMonth ?? months[0] ?? '';

  const rows = useMemo(
    () => buildClientRows(valuations, feeConfigs, activeMonth),
    [valuations, feeConfigs, activeMonth]
  );

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

  const instrumentGroups = useMemo(() => buildInstrumentGroups(filtered), [filtered]);

  // ── edit helpers ────────────────────────────────────────────────────────────

  const getEdit = (r) => {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    return edits[k] ?? { rebate: r.rebate_fee_annual_percent ?? 0, advisory: r.advisory_fee_annual_percent ?? 0 };
  };

  const setEdit = (r, field, value) => {
    const k = feeKey(r.account_code, r.platform, r.investment_name);
    setEdits(prev => ({ ...prev, [k]: { ...getEdit(r), [field]: value } }));
  };

  // Set fees for all rows in an instrument group
  const setGroupEdit = (group, field, value) => {
    const next = {};
    group.rows.forEach(r => {
      const k = feeKey(r.account_code, r.platform, r.investment_name);
      next[k] = { ...getEdit(r), [field]: value };
    });
    setEdits(prev => ({ ...prev, ...next }));
  };

  const handleBulkSet = (field, value) => {
    const next = {};
    filtered.forEach(r => {
      const k = feeKey(r.account_code, r.platform, r.investment_name);
      next[k] = { ...getEdit(r), [field]: value };
    });
    setEdits(prev => ({ ...prev, ...next }));
  };

  const dirtyCount = Object.keys(edits).length;

  // ── save ────────────────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    if (!dirtyCount) return;
    setSaving(true);
    try {
      const feeMap = buildFeeMap(feeConfigs);

      for (const [k, { rebate, advisory }] of Object.entries(edits)) {
        const [account_code, platform, investment_name] = k.split('||');
        const rebateVal = parseFloat(rebate) || 0;
        const advisoryVal = parseFloat(advisory) || 0;

        // 1. Upsert FeeConfig
        const existing = feeMap[k];
        if (existing) {
          await base44.entities.FeeConfig.update(existing.id, {
            rebate_fee_annual_percent: rebateVal,
            advisory_fee_annual_percent: advisoryVal,
            effective_from_month: activeMonth,
          });
        } else {
          const row = rows.find(r => feeKey(r.account_code, r.platform, r.investment_name) === k);
          await base44.entities.FeeConfig.create({
            account_code, platform, investment_name,
            portfolio_name: row?.portfolio_name || '',
            rebate_fee_annual_percent: rebateVal,
            advisory_fee_annual_percent: advisoryVal,
            effective_from_month: activeMonth,
          });
        }

        // 2. Recalculate and update PortfolioValuation records for this month
        const matchingValuations = valuations.filter(v =>
          v.upload_month === activeMonth &&
          v.account_code === account_code &&
          v.platform === platform &&
          v.investment_name === investment_name
        );
        for (const v of matchingValuations) {
          const fees = calcFees(origVal(v), zarVal(v), rebateVal, advisoryVal);
          await base44.entities.PortfolioValuation.update(v.id, { ...fees, fee_required: false });
        }
      }

      await refetchFees();
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      setEdits({});
      toast.success(`Saved & recalculated fees for ${dirtyCount} instrument${dirtyCount !== 1 ? 's' : ''} in ${formatMonth(activeMonth)}`);
    } catch (err) {
      toast.error(err.message || 'Failed to save fees');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }));

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bulk Fee Editor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit advisory &amp; rebate fees per instrument, by month. Fees are recalculated on save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {dirtyCount} unsaved
            </span>
          )}
          <Button onClick={handleSaveAll} disabled={!dirtyCount || saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save & Recalculate'}
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Month:</span>
          <div className="flex gap-1">
            {months.map(m => (
              <button
                key={m}
                onClick={() => { setSelectedMonth(m); setEdits({}); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  m === activeMonth
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {formatMonth(m)}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center border rounded overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('client')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'client' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Users className="w-3.5 h-3.5" /> By Client
          </button>
          <button
            onClick={() => setViewMode('instrument')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'instrument' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> By Instrument
          </button>
        </div>
      </div>

      {/* Search + bulk apply */}
      <div className="flex flex-wrap items-center gap-3 bg-white border rounded-lg px-4 py-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search client, fund, platform…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
          <span className="font-medium">Set all visible:</span>
          <BulkSetButton label="Rebate" onSet={v => handleBulkSet('rebate', v)} />
          <BulkSetButton label="Advisory" onSet={v => handleBulkSet('advisory', v)} />
        </div>
      </div>

      {/* TABLE */}
      {viewMode === 'client' ? (
        <ClientView rows={filtered} edits={edits} getEdit={getEdit} setEdit={setEdit} />
      ) : (
        <InstrumentView
          groups={instrumentGroups}
          edits={edits}
          getEdit={getEdit}
          setEdit={setEdit}
          setGroupEdit={setGroupEdit}
          expanded={expanded}
          toggleGroup={toggleGroup}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} instrument rows for {formatMonth(activeMonth)}
      </p>
    </div>
  );
}

// ─── Client View ─────────────────────────────────────────────────────────────

function ClientView({ rows, edits, getEdit, setEdit }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {['Client', 'Platform', 'Instrument', 'Value (ZAR)', 'Rebate % p.a.', 'Advisory % p.a.', 'Monthly Fee (ZAR)', 'Source'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No instruments found.</td></tr>
            )}
            {rows.map(r => {
              const k = feeKey(r.account_code, r.platform, r.investment_name);
              const edit = getEdit(r);
              const isDirty = !!edits[k];
              const monthlyFee = (r.zar_value ?? 0) * ((parseFloat(edit.rebate) || 0) + (parseFloat(edit.advisory) || 0)) / 100 / 12;
              return (
                <tr key={k} className={`hover:bg-muted/20 transition-colors ${isDirty ? 'bg-amber-50/60' : ''}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-sm">{r.portfolio_name || '—'}</p>
                    <p className="text-xs text-primary/70 font-mono mt-0.5">{r.account_code}</p>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.platform}</td>
                  <td className="px-4 py-2.5 text-sm max-w-xs"><span className="line-clamp-2">{r.investment_name}</span></td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right">R {fmtNum(r.zar_value ?? 0)}</td>
                  <td className="px-4 py-2.5">
                    <FeeInput value={edit.rebate} dirty={isDirty} onChange={v => setEdit(r, 'rebate', v)} />
                  </td>
                  <td className="px-4 py-2.5">
                    <FeeInput value={edit.advisory} dirty={isDirty} onChange={v => setEdit(r, 'advisory', v)} />
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right text-muted-foreground">R {fmtNum(monthlyFee)}</td>
                  <td className="px-4 py-2.5 text-right"><SourceBadge source={r.fee_source} required={r.fee_required} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Instrument View ──────────────────────────────────────────────────────────

function InstrumentView({ groups, edits, getEdit, setEdit, setGroupEdit, expanded, toggleGroup }) {
  return (
    <div className="space-y-3">
      {groups.length === 0 && (
        <div className="bg-white border rounded-xl py-12 text-center text-muted-foreground text-sm">No instruments found.</div>
      )}
      {groups.map(group => {
        const gk = `${group.platform}||${group.investment_name}`;
        const isOpen = expanded[gk] ?? false;
        const totalZar = group.rows.reduce((s, r) => s + (r.zar_value ?? 0), 0);
        const dirtyInGroup = group.rows.filter(r => !!edits[feeKey(r.account_code, r.platform, r.investment_name)]).length;

        // Representative fees (first row, or edited)
        const firstRow = group.rows[0];
        const repEdit = getEdit(firstRow);

        return (
          <div key={gk} className="bg-white border rounded-xl overflow-hidden">
            {/* Group header */}
            <div
              className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors ${dirtyInGroup ? 'bg-amber-50/40' : ''}`}
              onClick={() => toggleGroup(gk)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <span className="font-semibold text-sm">{group.investment_name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{group.platform}</span>
                  {dirtyInGroup > 0 && (
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{dirtyInGroup} edited</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground ml-6 mt-0.5">{group.rows.length} client{group.rows.length !== 1 ? 's' : ''} · R {fmtNum(totalZar)} total</p>
              </div>

              {/* Bulk fee inputs for this instrument */}
              <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-muted-foreground">Rebate:</span>
                <FeeInput value={repEdit.rebate} dirty={dirtyInGroup > 0} onChange={v => setGroupEdit(group, 'rebate', v)} width="w-20" />
                <span className="text-xs text-muted-foreground">Advisory:</span>
                <FeeInput value={repEdit.advisory} dirty={dirtyInGroup > 0} onChange={v => setGroupEdit(group, 'advisory', v)} width="w-20" />
                <span className="text-xs text-muted-foreground ml-1">% p.a.</span>
              </div>
            </div>

            {/* Expanded client rows */}
            {isOpen && (
              <div className="border-t">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b">
                      <th className="text-left px-6 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value (ZAR)</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rebate % p.a.</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advisory % p.a.</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Fee</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.rows.map(r => {
                      const k = feeKey(r.account_code, r.platform, r.investment_name);
                      const edit = getEdit(r);
                      const isDirty = !!edits[k];
                      const monthlyFee = (r.zar_value ?? 0) * ((parseFloat(edit.rebate) || 0) + (parseFloat(edit.advisory) || 0)) / 100 / 12;
                      return (
                        <tr key={k} className={`hover:bg-muted/20 ${isDirty ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-6 py-2 font-medium">{r.portfolio_name || '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground font-mono">{r.account_code}</td>
                          <td className="px-4 py-2 text-right font-mono">R {fmtNum(r.zar_value ?? 0)}</td>
                          <td className="px-4 py-2">
                            <FeeInput value={edit.rebate} dirty={isDirty} onChange={v => setEdit(r, 'rebate', v)} />
                          </td>
                          <td className="px-4 py-2">
                            <FeeInput value={edit.advisory} dirty={isDirty} onChange={v => setEdit(r, 'advisory', v)} />
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">R {fmtNum(monthlyFee)}</td>
                          <td className="px-4 py-2 text-right"><SourceBadge source={r.fee_source} required={r.fee_required} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function FeeInput({ value, dirty, onChange, width = 'w-24' }) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      max="10"
      className={`${width} block mx-auto text-center text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${
        dirty ? 'border-amber-400 bg-amber-50' : 'border-input bg-transparent'
      }`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function BulkSetButton({ label, onSet }) {
  const [val, setVal] = useState('');
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <input
        type="number" step="0.01" min="0" max="10"
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