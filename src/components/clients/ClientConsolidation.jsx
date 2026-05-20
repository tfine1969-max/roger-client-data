import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { fmtNum } from '@/lib/valuation-utils';

function getErrorMessage(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.data?.error ||
    err?.message ||
    'Unknown error'
  );
}

const REASON_LABELS = {
  exact: 'Exact match',
  name_subset: 'Name is a subset',
  initials: 'Initials match',
  similar: 'Similar spelling',
};

export default function ClientConsolidation() {
  const queryClient = useQueryClient();

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Dialog state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [primaryKey, setPrimaryKey] = useState('');
  const [mergedName, setMergedName] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeStatus, setMergeStatus] = useState(null); // 'success' | 'error'
  const [mergeMessage, setMergeMessage] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await base44.functions.invoke('suggestClientMerges', {});
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function openGroup(group) {
    // Default primary = first client (most complete name, sorted by suggestClientMerges)
    const primary = group.clients[0];
    setSelectedGroup(group);
    setPrimaryKey(primary.client_key);
    setMergedName(primary.portfolio_name || '');
    setMergeStatus(null);
    setMergeMessage('');
  }

  function closeDialog() {
    setSelectedGroup(null);
    setMergedName('');
    setMergeStatus(null);
    setMergeMessage('');
  }

  async function handleMerge() {
    if (!selectedGroup || !mergedName.trim()) return;
    setMerging(true);
    setMergeStatus(null);
    setMergeMessage('');

    try {
      const res = await base44.functions.invoke('bulkClientMaintenance', {
        action: 'merge',
        client_keys: selectedGroup.clients.map(c => c.client_key),
        primary_key: primaryKey,
        merged_name: mergedName.trim(),
        // Exact portfolio_name values → backend filters rows directly, no
        // computed-key mismatch, no 5 000-row scan limit.
        source_names: selectedGroup.clients.map(c => c.portfolio_name).filter(Boolean),
      });

      if (!res.data.success) throw new Error(res.data.error || 'Merge failed');

      setMergeStatus('success');
      setMergeMessage(res.data.message || `Merged ${selectedGroup.clients.length} clients.`);

      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Remove the resolved group from the list and close the dialog
      setTimeout(() => {
        setSuggestions(prev => prev.filter(s => s !== selectedGroup));
        closeDialog();
      }, 900);
    } catch (err) {
      setMergeStatus('error');
      setMergeMessage(getErrorMessage(err));
    } finally {
      setMerging(false);
    }
  }

  // ── Loading / error / empty states ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {loadError}
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

  // ── Suggestion list ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">
            Found {suggestions.length} potential duplicate group
            {suggestions.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Review each group and confirm the merge. All valuation records will be
            updated to the chosen canonical name.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((group, idx) => (
          <div key={idx} className="border rounded-lg p-4 bg-background">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                {group.clients.map((client, ci) => (
                  <div key={ci} className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={
                        ci === 0
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      }
                    >
                      {client.portfolio_name || '—'}
                    </span>
                    {client.account_code && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {client.account_code}
                      </span>
                    )}
                    {client.total_value > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        R {fmtNum(client.total_value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground whitespace-nowrap">
                  {group.score}%
                  {group.reason && group.reason !== 'similar'
                    ? ` · ${REASON_LABELS[group.reason] ?? group.reason}`
                    : ''}
                </span>
                <Button variant="outline" size="sm" onClick={() => openGroup(group)}>
                  Review
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Merge dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!selectedGroup} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge Duplicate Clients</DialogTitle>
            <DialogDescription>
              Select the primary record and enter the correct canonical name. All
              valuation records for every client in this group will be updated.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              {/* Primary selector */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Primary record</p>
                <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                  {selectedGroup.clients.map(client => (
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
                        <p className="text-sm font-medium">
                          {client.portfolio_name || '—'}
                        </p>
                        {client.account_code && (
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">
                            {client.account_code}
                          </p>
                        )}
                        {client.total_value > 0 && (
                          <p className="text-xs text-muted-foreground">
                            R {fmtNum(client.total_value)}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Canonical name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Canonical client name</label>
                <Input
                  value={mergedName}
                  onChange={e => setMergedName(e.target.value)}
                  placeholder="Enter the correct client name…"
                />
              </div>

              {/* Status feedback */}
              {mergeStatus === 'success' && (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {mergeMessage}
                </div>
              )}
              {mergeStatus === 'error' && (
                <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {mergeMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  disabled={merging}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={merging || !mergedName.trim() || mergeStatus === 'success'}
                  className="flex-1"
                >
                  {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
