import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Merge } from 'lucide-react';
import { fmtNum } from '@/lib/valuation-utils';

function getInvokeErrorMessage(err) {
  return err?.response?.data?.error
    || err?.response?.data?.message
    || err?.data?.error
    || err?.message
    || 'Merge failed';
}

export default function ManualMergeDialog({ open, onOpenChange, selectedClients, onMerged }) {
  const queryClient = useQueryClient();
  const [primaryKey, setPrimaryKey] = useState('');
  const [mergedName, setMergedName] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || selectedClients.length === 0) return;
    const first = selectedClients[0];
    setPrimaryKey(first.client_key);
    setMergedName(first.portfolio_name || '');
    setStatus(null);
    setMessage('');
  }, [open, selectedClients]);

  const primaryClient = useMemo(
    () => selectedClients.find(client => client.client_key === primaryKey) || selectedClients[0],
    [selectedClients, primaryKey]
  );

  const handleMerge = async () => {
    if (selectedClients.length < 2 || !primaryClient || !mergedName.trim()) return;
    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      const res = await base44.functions.invoke('bulkClientMaintenance', {
        action: 'merge',
        client_keys: selectedClients.map(client => client.client_key),
        primary_key: primaryClient.client_key,
        merged_name: mergedName.trim(),
      });

      if (!res.data.success) throw new Error(res.data.error || 'Merge failed');

      setStatus('success');
      setMessage(res.data.message || `Merged ${selectedClients.length} clients.`);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      setTimeout(() => {
        onOpenChange(false);
        if (onMerged) onMerged();
      }, 800);
    } catch (err) {
      setStatus('error');
      setMessage(getInvokeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-4 h-4" />
            Merge {selectedClients.length} Clients
          </DialogTitle>
          <DialogDescription>
            Choose the primary client and the corrected name. All selected valuation rows will use the corrected name while retaining their account codes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary client</p>
            <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
              {selectedClients.map(client => (
                <label
                  key={client.client_key}
                  className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40"
                >
                  <input
                    type="radio"
                    name="primary-client"
                    checked={primaryKey === client.client_key}
                    onChange={() => {
                      setPrimaryKey(client.client_key);
                      setMergedName(client.portfolio_name || '');
                    }}
                    className="mt-1 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{client.portfolio_name || '-'}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        R {fmtNum(client.totalValue)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {client.account_codes.join(', ') || 'No account code'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Correct Client Name</label>
            <Input
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              placeholder="Enter corrected client name..."
            />
          </div>

          {status === 'success' && (
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>
          )}
          {status === 'error' && (
            <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{message}</div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleMerge} disabled={loading || !mergedName.trim() || selectedClients.length < 2 || status === 'success'} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Merge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}