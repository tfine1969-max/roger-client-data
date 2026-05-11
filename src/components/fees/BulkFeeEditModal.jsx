import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BulkFeeEditModal({ rows, feeOptions = [], onClose, onSaved }) {
  const [rebate, setRebate] = useState('');
  const [advisory, setAdvisory] = useState('');
  const [saving, setSaving] = useState(false);

  const rebatePct = parseFloat(rebate);
  const advisoryPct = parseFloat(advisory);
  const hasRebate = !isNaN(rebatePct);
  const hasAdvisory = !isNaN(advisoryPct);

  const handleSave = async () => {
    if (!hasRebate && !hasAdvisory) return;
    setSaving(true);

    for (const row of rows) {
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
        rebate_fee_annual_percent: hasRebate ? rebatePct : (row.rebate_fee_annual_percent ?? 0),
        advisory_fee_annual_percent: hasAdvisory ? advisoryPct : (row.advisory_fee_annual_percent ?? 0),
        effective_from_month: row.upload_month,
      };

      if (existing.length > 0) {
        await base44.entities.FeeConfig.update(existing[0].id, configData);
      } else {
        await base44.entities.FeeConfig.create(configData);
      }
    }

    toast.success(`Fee configs updated for ${rows.length} holding${rows.length > 1 ? 's' : ''}.`);
    setSaving(false);
    onSaved();
  };

  const options = [...new Set([...(feeOptions || [])])].sort((a, b) => a - b);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Bulk Edit Fee Rates — {rows.length} holdings</DialogTitle>
        </DialogHeader>

        <div className="max-h-40 overflow-y-auto border rounded bg-muted/30 p-2 space-y-0.5">
          {rows.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">{r.portfolio_name}</span> · {r.investment_name}
            </p>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Leave a field blank to keep each holding's existing value.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Rebate annual rate (%)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={rebate}
              onChange={e => setRebate(e.target.value)}
              placeholder="Leave blank to keep"
              className="text-lg font-semibold"
            />
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {options.map(o => (
                  <button key={o} onClick={() => setRebate(String(o))}
                    className="px-1.5 py-0.5 text-xs rounded bg-muted hover:bg-primary hover:text-white transition-colors">
                    {o}%
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Advisory annual rate (%)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={advisory}
              onChange={e => setAdvisory(e.target.value)}
              placeholder="Leave blank to keep"
              className="text-lg font-semibold"
            />
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {options.map(o => (
                  <button key={o} onClick={() => setAdvisory(String(o))}
                    className="px-1.5 py-0.5 text-xs rounded bg-muted hover:bg-primary hover:text-white transition-colors">
                    {o}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!hasRebate && !hasAdvisory)}>
            {saving ? 'Saving...' : `Apply to ${rows.length} Holdings`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}