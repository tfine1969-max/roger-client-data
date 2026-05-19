import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { suggestMerges, mergeClients } from '@/lib/client-merge';

export default function ClientConsolidation({ clients = [] }) {
  const queryClient = useQueryClient();
  const [merging, setMerging] = useState(false);
  const [mergedName, setMergedName] = useState('');
  const [selectedMerge, setSelectedMerge] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(new Set());

  const suggestions = useMemo(
    () => suggestMerges(clients).filter(s => !dismissed.has(`${s.client_key1}||${s.client_key2}`)),
    [clients, dismissed]
  );

  const handleMerge = async () => {
    if (!selectedMerge || !mergedName.trim()) return;
    setMerging(true);
    setStatus('processing');
    try {
      const res = await mergeClients(
        [selectedMerge.client_key1, selectedMerge.client_key2],
        mergedName.trim()
      );
      setStatus('success');
      setMessage(res.message);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setTimeout(() => {
        setDismissed(prev => new Set([...prev, `${selectedMerge.client_key1}||${selectedMerge.client_key2}`]));
        setSelectedMerge(null);
        setMergedName('');
        setStatus(null);
        setMessage('');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const dismiss = (suggestion) => {
    setDismissed(prev => new Set([...prev, `${suggestion.client_key1}||${suggestion.client_key2}`]));
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">
            Found {suggestions.length} potential duplicate{suggestions.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Review and approve merges below, or dismiss false positives.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center mb-1">
                  <span className="text-sm font-medium">{suggestion.name1}</span>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{suggestion.score}% match</span>
                </div>
                {suggestion.code1 && <p className="text-xs text-muted-foreground">Code: {suggestion.code1}</p>}
                <div className="text-xs text-muted-foreground border-t mt-2 pt-2">
                  <p>{suggestion.name2}</p>
                  {suggestion.code2 && <p>Code: {suggestion.code2}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dismiss(suggestion)}
                >
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMerge(suggestion);
                    setMergedName(suggestion.name1);
                    setStatus(null);
                    setMessage('');
                  }}
                >
                  Merge
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedMerge} onOpenChange={(open) => !open && setSelectedMerge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Clients</DialogTitle>
            <DialogDescription>
              All holdings from both clients will be merged under the corrected name.
            </DialogDescription>
          </DialogHeader>

          {selectedMerge && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><strong>{selectedMerge.name1}</strong></p>
                <p className="text-muted-foreground">+ {selectedMerge.name2}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Correct Client Name</label>
                <Input
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  placeholder="Enter unified name..."
                />
              </div>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
                </div>
              )}
              {status === 'error' && (
                <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedMerge(null)} disabled={merging}>
                  Cancel
                </Button>
                <Button onClick={handleMerge} disabled={merging || !mergedName.trim()} className="flex-1">
                  {merging && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirm Merge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
