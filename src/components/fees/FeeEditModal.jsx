import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { applyFeeToRow, feeKey } from '@/lib/fee-utils';
import { useToast } from '@/components/ui/use-toast';

export default function FeeEditModal({ row, onClose, onSaved }) {
  const { toast } = useToast();
  const [rebate, setRebate] = useState(String(row.rebate_fee_annual_percent ?? 0));
  const [advisory, setAdvisory] = useState(String(row.advisory_fee_annual_percent ?? 0));
  const [applyHistorical, setApplyHistorical] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const rebatePct = parseFloat(rebate) || 0;
    const advisoryPct = parseFloat(advisory) || 0;

    // Find all rows matching this fee key
    const key = feeKey(row.account_code, row.platform, row.investment_name);
    let rows;
    if (applyHistorical) {
      rows = await base44.entities.PortfolioValuation.filter({
        account_code: row.account_code,
        platform: row.platform,
        investment_name: row.investment_name,
      });
    } else {
      rows = [row];
    }

    for (const r of rows) {
      const updates = applyFeeToRow(r, rebatePct, advisoryPct);
      await base44.entities.PortfolioValuation.update(r.id, updates);
    }

    // Upsert FeeConfig
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
      advisory_fee_annual_percent: advisoryPct,
      effective_from_month: applyHistorical ? null : row.upload_month,
    };
    if (existing.length > 0) {
      await base44.entities.FeeConfig.update(existing[0].id, configData);
    } else {
      await base44.entities.FeeConfig.create(configData);
    }

    toast({ title: 'Fees saved', description: `Updated ${rows.length} record(s)` });
    setSaving(false);
    onSaved();
  };

  const rebatePct = parseFloat(rebate) || 0;
  const advisoryPct = parseFloat(advisory) || 0;
  const origVal = row.original_currency_value ?? row.month_end_market_value ?? 0;
  const previewRebate = origVal * (rebatePct / 100) / 12;
  const previewAdvisory = origVal * (advisoryPct / 100) / 12;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Fees</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground border rounded p-3 bg-muted/30">
          <p><span className="font-medium text-foreground">{row.portfolio_name}</span></p>
          <p>{row.platform} · {row.investment_name}</p>
          <p>{row.currency} · {row.upload_month}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Rebate Fee % (annual)</Label>
            <Input type="number" step="0.01" min="0" value={rebate} onChange={e => setRebate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Monthly: {(rebatePct / 12).toFixed(4)}%</p>
            <p className="text-xs text-positive font-mono">≈ {row.currency} {(previewRebate).toFixed(2)} / mo</p>
          </div>
          <div className="space-y-1.5">
            <Label>Advisory Fee % (annual)</Label>
            <Input type="number" step="0.01" min="0" value={advisory} onChange={e => setAdvisory(e.target.value)} />
            <p className="text-xs text-muted-foreground">Monthly: {(advisoryPct / 12).toFixed(4)}%</p>
            <p className="text-xs text-positive font-mono">≈ {row.currency} {(previewAdvisory).toFixed(2)} / mo</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox id="hist" checked={applyHistorical} onCheckedChange={setApplyHistorical} />
          <label htmlFor="hist" className="text-sm cursor-pointer">Apply to all historical months for this investment</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Fees'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}