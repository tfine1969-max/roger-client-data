import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { fmtNum } from '@/lib/valuation-utils';

// ─── Duplicate-detection helpers (pure, no network) ──────────────────────────

const ENTITY_RE = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|fund|management|group|properties|trading|company|corp)\b/i;

function norm(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenSet(s) { return new Set(s.split(' ').filter(Boolean)); }

function isTokenSubset(smaller, larger) {
  const sm = tokenSet(smaller);
  const lg = tokenSet(larger);
  if (!sm.size) return false;
  for (const t of sm) if (!lg.has(t)) return false;
  return true;
}

function initialsMatch(a, b) {
  const ta = a.split(' ').filter(Boolean);
  const tb = b.split(' ').filter(Boolean);
  if (ta.length < 2 || tb.length < 2 || ta[0] !== tb[0]) return false;
  const initA = ta.slice(1).map(t => t[0]).join('');
  const initB = tb.slice(1).map(t => t[0]).join('');
  const abbA  = ta.slice(1).join('');
  const abbB  = tb.slice(1).join('');
  return initB.startsWith(abbA) || initA.startsWith(abbB);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return curr[n];
}

function matchScore(na, nb) {
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const sa = tokenSet(na);
  const sb = tokenSet(nb);
  const shared = [...sa].filter(t => t.length > 2 && sb.has(t));
  if (!shared.length) return 0;
  const onlyA = na.split(' ').filter(t => !sb.has(t));
  const onlyB = nb.split(' ').filter(t => !sa.has(t));
  // Different single-char initials → definitely different people
  if (onlyA.length === 1 && onlyB.length === 1
    && onlyA[0].length === 1 && onlyB[0].length === 1
    && onlyA[0] !== onlyB[0]) return 0;
  if (isTokenSubset(na, nb) || isTokenSubset(nb, na)) {
    return Math.round(85 + (Math.min(sa.size, sb.size) / Math.max(sa.size, sb.size)) * 15);
  }
  if (initialsMatch(na, nb)) return 87;
  const longer  = na.length >= nb.length ? na : nb;
  const shorter = na.length <  nb.length ? na : nb;
  const lev = (longer.length - levenshtein(longer, shorter)) / longer.length;
  return lev >= 0.85 ? Math.round(lev * 100) : 0;
}

function detectDuplicates(clients) {
  const normed = clients.map(c => norm(c.portfolio_name));
  const entity = clients.map(c => ENTITY_RE.test(c.portfolio_name || ''));
  const n = clients.length;

  // Union-Find to cluster 3+ duplicates into one group
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) { parent[find(x)] = find(y); }

  const pairScores = new Map();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (entity[i] !== entity[j]) continue;
      const s = matchScore(normed[i], normed[j]);
      if (s > 0) { union(i, j); pairScores.set(`${i}:${j}`, s); }
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }

  const suggestions = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const groupScores = [];
    for (let a = 0; a < members.length; a++)
      for (let b = a + 1; b < members.length; b++) {
        const s = pairScores.get(`${members[a]}:${members[b]}`) ?? 0;
        if (s) groupScores.push(s);
      }
    // Longest name first → suggested as the most-complete primary
    const sorted = [...members].sort((a, b) =>
      (clients[b].portfolio_name?.length ?? 0) - (clients[a].portfolio_name?.length ?? 0)
    );
    suggestions.push({
      clients: sorted.map(i => clients[i]),
      score: Math.max(...groupScores, 0),
    });
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────────────────────────────────────

function getErr(err) {
  return err?.response?.data?.error || err?.data?.error || err?.message || 'Unknown error';
}

export default function ClientConsolidation({ clients = [] }) {
  const queryClient = useQueryClient();

  // Detect duplicates from the already-override-applied client list
  const suggestions = useMemo(() => detectDuplicates(clients), [clients]);

  const [dismissed, setDismissed] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [primaryKey, setPrimaryKey] = useState('');
  const [mergedName, setMergedName] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeStatus, setMergeStatus] = useState(null);
  const [mergeMessage, setMergeMessage] = useState('');

  const visible = useMemo(
    () => suggestions.filter(s => !dismissed.has(s.clients.map(c => c.client_key).join('|'))),
    [suggestions, dismissed]
  );

  function openGroup(group) {
    const primary = group.clients[0];
    setSelectedGroup(group);
    setPrimaryKey(primary.client_key);
    setMergedName(primary.portfolio_name || '');
    setMergeStatus(null);
    setMergeMessage('');
  }

  function closeDialog() {
    setSelectedGroup(null);
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
        source_names: selectedGroup.clients.map(c => c.portfolio_name).filter(Boolean),
      });
      if (!res.data.success) throw new Error(res.data.error || 'Merge failed');
      setMergeStatus('success');
      setMergeMessage(res.data.message || `Merged ${selectedGroup.clients.length} clients.`);
      // Invalidate both so the override map and raw rows update together
      queryClient.invalidateQueries({ queryKey: ['clientMergeRules'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      setTimeout(closeDialog, 800);
    } catch (err) {
      setMergeStatus('error');
      setMergeMessage(getErr(err));
    } finally {
      setMerging(false);
    }
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-medium">No duplicate clients detected</p>
        <p className="text-xs text-muted-foreground mt-1">Your client list appears clean.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">
            {visible.length} potential duplicate group{visible.length !== 1 ? 's' : ''} detected
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Merging updates all records and saves a rule so future imports use the same canonical name.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((group, idx) => (
          <div key={idx} className="border rounded-lg p-4 bg-background">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                {group.clients.map((client, ci) => (
                  <div key={client.client_key} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={ci === 0 ? 'font-medium' : 'text-muted-foreground'}>
                      {client.portfolio_name || '—'}
                    </span>
                    {client.account_codes?.length > 0 && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {client.account_codes.join(', ')}
                      </span>
                    )}
                    {client.totalValue > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        R {fmtNum(client.totalValue)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                  {group.score}%
                </span>
                <Button variant="outline" size="sm" onClick={() => openGroup(group)}>Merge</Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground"
                  onClick={() => setDismissed(p => new Set([...p, group.clients.map(c => c.client_key).join('|')]))}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge Duplicate Clients</DialogTitle>
            <DialogDescription>
              Select the primary record and confirm the canonical name. All records and future imports will use this name.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Select primary record</p>
                <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                  {selectedGroup.clients.map(client => (
                    <label key={client.client_key} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
                      <input
                        type="radio" name="primary-client"
                        checked={primaryKey === client.client_key}
                        onChange={() => { setPrimaryKey(client.client_key); setMergedName(client.portfolio_name || ''); }}
                        className="mt-1 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{client.portfolio_name || '—'}</p>
                        {client.account_codes?.length > 0 && (
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{client.account_codes.join(', ')}</p>
                        )}
                        {client.totalValue > 0 && (
                          <p className="text-xs text-muted-foreground">R {fmtNum(client.totalValue)}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Canonical name</label>
                <Input value={mergedName} onChange={e => setMergedName(e.target.value)} placeholder="Enter the correct client name…" />
              </div>
              {mergeStatus === 'success' && (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{mergeMessage}</div>
              )}
              {mergeStatus === 'error' && (
                <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{mergeMessage}</div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeDialog} disabled={merging}>Cancel</Button>
                <Button onClick={handleMerge} disabled={merging || !mergedName.trim() || mergeStatus === 'success'} className="flex-1">
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
