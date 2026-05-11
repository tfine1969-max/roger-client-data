import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function ClientConsolidation() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null);
  const [mergedName, setMergedName] = useState('');
  const [selectedMerge, setSelectedMerge] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('suggestClientMerges', {});
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      setMessage(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedMerge || !mergedName.trim()) return;
    
    setMerging(true);
    setStatus('processing');
    try {
      const res = await base44.functions.invoke('mergeClients', {
        primary_id: selectedMerge.id1,
        secondary_id: selectedMerge.id2,
        merged_name: mergedName.trim(),
      });
      
      setStatus('success');
      setMessage(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      // Remove merged suggestion and refresh
      setTimeout(() => {
        setSelectedMerge(null);
        setMergedName('');
        fetchSuggestions();
      }, 1500);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">No duplicate clients detected</p>
        <p className="text-xs text-muted-foreground mt-1">Your client list appears clean.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">Found {suggestions.length} potential duplicate{suggestions.length > 1 ? 's' : ''}</p>
          <p className="text-xs text-amber-800 mt-1">Review and approve merges below. Approved merges update all related holdings.</p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              setSelectedMerge(suggestion);
              setMergedName(suggestion.name1);
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center mb-2">
                  <span className="text-sm font-medium text-foreground truncate">{suggestion.name1}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{suggestion.score}% match</span>
                </div>
                <p className="text-xs text-muted-foreground">Code: {suggestion.code1}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMerge(suggestion);
                  setMergedName(suggestion.name1);
                }}
              >
                Merge
              </Button>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p className="font-medium text-foreground mb-1">Possible duplicate:</p>
              <p>{suggestion.name2}</p>
              <p>Code: {suggestion.code2}</p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedMerge} onOpenChange={(open) => !open && setSelectedMerge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Clients</DialogTitle>
            <DialogDescription>
              Consolidate into a single client. All holdings from both will be linked.
            </DialogDescription>
          </DialogHeader>

          {selectedMerge && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                <p><strong>Client 1:</strong> {selectedMerge.name1}</p>
                <p><strong>Client 2:</strong> {selectedMerge.name2}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Merged Client Name</label>
                <Input
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  placeholder="Enter unified name..."
                />
              </div>

              {status === 'success' && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  {message}
                </div>
              )}
              {status === 'error' && (
                <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMerge(null)}
                  disabled={merging}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={merging || !mergedName.trim()}
                  className="flex-1"
                >
                  {merging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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