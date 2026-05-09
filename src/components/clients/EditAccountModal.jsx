import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditAccountModal({ client, valuations, onClose, onSaved }) {
  const [codes, setCodes] = useState(client.account_codes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build mapping from old codes to new codes
      const codeMap = new Map();
      client.account_codes.forEach((old, i) => {
        codeMap.set(old, codes[i] || old);
      });

      // Update all valuations for this client
      const rows = valuations.filter(v => v.portfolio_name === client.portfolio_name);
      if (rows.length === 0) {
        toast.error('No valuations found for this client');
        setSaving(false);
        return;
      }

      for (const row of rows) {
        const newCode = codeMap.get(row.account_code) || row.account_code;
        if (row.account_code !== newCode) {
          await base44.entities.PortfolioValuation.update(row.id, { account_code: newCode });
        }
      }

      toast.success('Account codes updated');
      setSaving(false);
      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to update account codes');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Account Codes</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground border rounded p-3 bg-muted/30">
          <p className="font-medium text-foreground">{client.portfolio_name}</p>
          <p>ID: {client.identity_no || '—'}</p>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {codes.map((code, idx) => (
            <div key={idx} className="space-y-1">
              <Label className="text-xs">Account Code {idx + 1}</Label>
              <Input
                value={code}
                onChange={(e) => {
                  const newCodes = [...codes];
                  newCodes[idx] = e.target.value;
                  setCodes(newCodes);
                }}
                placeholder="e.g., PRI20211011005"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}