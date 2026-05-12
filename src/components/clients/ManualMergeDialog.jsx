import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Merge } from 'lucide-react';

/**
 * selectedClients: array of client objects from the Clients page
 * Each has: client_key, portfolio_name, account_codes[], platforms[]
 * 
 * The first selected client is treated as primary (its Client entity id is looked up by account_code).
 */
export default function ManualMergeDialog({ open, onOpenChange, selectedClients, onMerged }) {
  const queryClient = useQueryClient();
  const [mergedName, setMergedName] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens
  const handleOpen = (isOpen) => {
    if (isOpen && selectedClients.length > 0) {
      setMergedName(selectedClients[0].portfolio_name || '');
      setStatus(null);
      setMessage('');
    }
    onOpenChange(isOpen);
  };

  const handleMerge = async () => {
    if (selectedClients.length < 2 || !mergedName.trim()) return;
    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      // Look up Client entity IDs by account_code for each selected client
      const clientRecords = await Promise.all(
        selectedClients.map(async (c) => {
          const code = c.account_codes[0];
          if (!code) return null;
          const results = await base44.entities.Client.filter({ account_code: code });
          return results[0] || null;
        })
      );

      const [primary, ...secondaries] = clientRecords;

      if (!primary) throw new Error('Could not find primary client record. Make sure client data is synced.');

      // Merge each secondary into the primary sequentially
      for (const secondary of secondaries) {
        if (!secondary) continue;
        const res = await base44.functions.invoke('mergeClients', {
          primary_id: primary.id,
          secondary_id: secondary.id,
          merged_name: mergedName.trim(),
        });
        if (!res.data.success) throw new Error(res.data.error || 'Merge failed');
      }

      setStatus('success');
      setMessage(`Successfully merged ${selectedClients.length} clients into "${mergedName.trim()}".`);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      setTimeout(() => {
        onOpenChange(false);
        if (onMerged) onMerged();
      }, 1500);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Merge failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-4 h-4" />
            Merge {selectedClients.length} Clients
          </DialogTitle>
          <DialogDescription>
            All holdings from the selected clients will be consolidated under the first selected client's account code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
            {selectedClients.map((c, i) => (
              <div key={c.client_key} className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i === 0 ? 'Primary' : `#${i + 1}`}
                </span>
                <span className="font-medium truncate">{c.portfolio_name}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{c.account_codes[0]}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Merged Client Name</label>
            <Input
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              placeholder="Enter unified name..."
            />
          </div>

          {status === 'success' && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{message}</div>
          )}
          {status === 'error' && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">{message}</div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleMerge} disabled={loading || !mergedName.trim() || status === 'success'} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Merge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}