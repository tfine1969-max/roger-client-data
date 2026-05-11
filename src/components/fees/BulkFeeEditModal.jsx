import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { fmtNum } from '@/lib/valuation-utils';
import { toast } from 'sonner';

function QuickRateButtons({ options, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(String(o))}
          className="px-1.5 py-0.5 text-xs rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {o}%
        </button>
      ))}
    </div>
  );
}

export default function BulkFeeEditModal({ rows, feeOptions = [], onClose, onSaved }) {
  // Per-instrument fee state keyed by row index
  const [fees, setFees] = useState(() =>
    rows.reduce((acc, r, i) => {
      acc[i] = {
        rebate: String(r.rebate_fee_annual_percent ?? ''),
        advisory: String(r.advisory_fee_annual_percent ?? ''),
      };
      return acc;
    }, {})
  );
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => [...new Set(feeOptions)].sort((a, b) => a - b), [feeOptions]);

  // Group rows by client for display
  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r, i) => {
      const key = r.account_code || r.portfolio_name || 'Unknown';
      if (!map[key]) map[key] = { label: r.portfolio_name || r.account_code, code: r.account_code, items: [] };
      map[key].items.push({ row: r, idx: i });
    });
    return Object.values(map);
  }, [rows]);

  const setFee = (idx, field, val) =>
    setFees(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: val } }));

  // Apply same rate to all instruments for a client group
  const applyToGroup = (items, field, val) =>
    items.forEach(({ idx }) => setFee(idx, field, val));

  // Apply same rate to all rows
  const applyToAll = (field, val) =>
    rows.forEach((_, i) => setFee(i, field, val));

  const handleSave = async () => {
    setSaving(true);
    let saved = 0;
    for (const [idxStr, { rebate, advisory }] of Object.entries(fees)) {
      const row = rows[parseInt(idxStr)];
      const rebatePct = rebate === '' ? 0 : (parseFloat(rebate) ?? 0);
      const advisoryPct = advisory === '' ? null : (parseFloat(advisory) ?? null);

      const existing = await base44.entities.FeeConfig.filter({
        account_code: row.account_code,
        platform: row.platform,
        investment_name: row.investment_name,
      });

      const configData = {
        account_code: row.account_code,
        portfolio_name: row.portfolio_name,
        platform: row.platform,
        investment_name: row.investment_name,
        rebate_fee_annual_percent: rebatePct,
        advisory_fee_annual_percent: advisoryPct, // null = not yet set; 0 = explicitly zero
        effective_from_month: row.upload_month,
      };

      if (existing.length > 0) {
        await base44.entities.FeeConfig.update(existing[0].id, configData);
      } else {
        await base44.entities.FeeConfig.create(configData);
      }
      saved++;
    }

    toast.success(`Fee configs saved for ${saved} instrument${saved !== 1 ? 's' : ''}.`);
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">
            Update Fees — {grouped.length} client{grouped.length !== 1 ? 's' : ''}, {rows.length} instrument{rows.length !== 1 ? 's' : ''}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Set rebate and advisory rates per instrument. Each instrument can have a different rate.
          </p>
          {options.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Apply to all:</span>
              <div className="flex flex-wrap gap-1">
                {options.map(o => (
                  <button
                    key={`all-r-${o}`}
                    type="button"
                    onClick={() => applyToAll('rebate', String(o))}
                    className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-chart-2/20 hover:text-chart-2 border transition-colors"
                  >
                    Rebate {o}%
                  </button>
                ))}
                {options.map(o => (
                  <button
                    key={`all-a-${o}`}
                    type="button"
                    onClick={() => applyToAll('advisory', String(o))}
                    className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-chart-1/20 hover:text-chart-1 border transition-colors"
                  >
                    Advisory {o}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable instrument list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {grouped.map(group => (
            <div key={group.code}>
              {/* Client header */}
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b">
                <div>
                  <p className="text-sm font-semibold">{group.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{group.code}</p>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {options.map(o => (
                      <button
                        key={`g-r-${o}`}
                        type="button"
                        onClick={() => applyToGroup(group.items, 'rebate', String(o))}
                        className="px-1.5 py-0.5 text-xs rounded border bg-white hover:bg-chart-2/10 hover:text-chart-2 transition-colors"
                      >
                        R {o}%
                      </button>
                    ))}
                    {options.map(o => (
                      <button
                        key={`g-a-${o}`}
                        type="button"
                        onClick={() => applyToGroup(group.items, 'advisory', String(o))}
                        className="px-1.5 py-0.5 text-xs rounded border bg-white hover:bg-chart-1/10 hover:text-chart-1 transition-colors"
                      >
                        A {o}%
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Instrument rows */}
              <div className="space-y-2">
                {group.items.map(({ row: r, idx }) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_100px] gap-3 items-center rounded-lg border bg-white px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.investment_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.currency} · ZAR {fmtNum(r.zar_value ?? 0)}
                        {r.fee_required && (
                          <span className="ml-2 px-1 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">Req</span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground text-center">Rebate %</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fees[idx]?.rebate ?? ''}
                        onChange={e => setFee(idx, 'rebate', e.target.value)}
                        className="h-8 text-center text-sm font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground text-center">Advisory %</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fees[idx]?.advisory ?? ''}
                        onChange={e => setFee(idx, 'advisory', e.target.value)}
                        className="h-8 text-center text-sm font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t bg-white shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Changes apply from each holding's upload month forward.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-48">
              {saving ? 'Saving...' : `Update Fees for Selected Clients`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}