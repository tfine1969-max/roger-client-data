import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { origVal, zarVal } from '@/lib/valuation-utils';
import { toast } from 'sonner';

export default function FeeEditModal({ row, feeOptions = [], onClose, onSaved }) {
  const [rebate, setRebate] = useState(String(row.rebate_fee_annual_percent ?? 0));
  const [advisory, setAdvisory] = useState(String(row.advisory_fee_annual_percent ?? 0));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const rebatePct = rebate === '' ? 0 : parseFloat(rebate) ?? 0;
    const advisoryPct = advisory === '' ? null : parseFloat(advisory) ?? null;

    // Create/update FeeConfig for future months
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

    toast.success(`Fee config updated from ${row.upload_month}. New fees apply to future uploads only.`);
    setSaving(false);
    onSaved();
  };

  const rebatePct = rebate === '' ? 0 : (parseFloat(rebate) ?? 0);
  const advisoryPct = advisory === '' ? 0 : (parseFloat(advisory) ?? 0);
  const feeBaseZar = row.fee_base_zar ?? zarVal(row);
  const previewRebateZar = feeBaseZar * (rebatePct / 100) / 12;
  const previewAdvisoryZar = feeBaseZar * (advisoryPct / 100) / 12;
  const previewRebateOrig = (row.fee_base_zar ?? origVal(row)) * (rebatePct / 100) / 12;
  const previewAdvisoryOrig = (row.fee_base_zar ?? origVal(row)) * (advisoryPct / 100) / 12;
  const options = [...new Set([...(feeOptions || []), rebatePct, advisoryPct])].sort((a, b) => a - b);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Monthly Fee Rates</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground border rounded p-3 bg-muted/30">
          <p><span className="font-medium text-foreground">{row.portfolio_name}</span></p>
          <p>{row.platform} · {row.investment_name}</p>
          <p>{row.currency} · {row.upload_month}</p>
          {row.fee_mapping_client && <p>Mapped from: {row.fee_mapping_client}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Rebate annual rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={rebate}
              onChange={(e) => setRebate(e.target.value)}
              className="text-lg font-semibold"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Monthly: {(rebatePct / 12).toFixed(4)}%</p>
          </div>
          <div className="space-y-1.5">
            <Label>Advisory annual rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={advisory}
              onChange={(e) => setAdvisory(e.target.value)}
              className="text-lg font-semibold"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Monthly: {(advisoryPct / 12).toFixed(4)}%</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          New fees apply to portfolio uploads from {row.upload_month} forward. Historical data is not affected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : row.fee_required ? 'Allocate Fee' : 'Save Fees'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}