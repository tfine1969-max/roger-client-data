import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Normalisation ────────────────────────────────────────────────────────────

const TITLE_RE = /\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g;
const ENTITY_RE = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|company|corporation|corp|fund|management|consulting|services|solutions|enterprises|group|capital|advisory)\b/i;

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(TITLE_RE, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isEntity(portfolioName: unknown): boolean {
  return ENTITY_RE.test(String(portfolioName || ''));
}

/** Sorted-token key — must match bulkClientMaintenance clientKey exactly */
function clientKey(portfolioName: unknown): string {
  const sorted = normalize(portfolioName).split(' ').filter(Boolean).sort().join('');
  return sorted ? `name-${sorted}` : '';
}

// ─── Matching strategies ──────────────────────────────────────────────────────

function tokens(norm: string): string[] {
  return norm.split(' ').filter(Boolean);
}

function tokenSet(norm: string): Set<string> {
  return new Set(tokens(norm));
}

/**
 * Token-subset match.
 * "conder andrew" ⊂ "conder andrew clifford nicholas" → true
 */
function isTokenSubset(smaller: string, larger: string): boolean {
  const sm = tokenSet(smaller);
  const lg = tokenSet(larger);
  if (sm.size === 0) return false;
  for (const t of sm) if (!lg.has(t)) return false;
  return true;
}

/**
 * Initials abbreviation match.
 * "divaris bn" matches "divaris belle norma elizabeth"
 * Both share the same first surname token; the abbreviated first-name
 * part resolves to the initials of the expanded first-name tokens.
 */
function initialsMatch(normA: string, normB: string): boolean {
  const tA = tokens(normA);
  const tB = tokens(normB);
  if (tA.length < 2 || tB.length < 2) return false;
  if (tA[0] !== tB[0]) return false; // different surnames

  const abbA = tA.slice(1).join('');
  const abbB = tB.slice(1).join('');
  const initA = tA.slice(1).map(t => t[0]).join('');
  const initB = tB.slice(1).map(t => t[0]).join('');

  return initB.startsWith(abbA) || initA.startsWith(abbB);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_: unknown, i: number) => i);
  const curr = new Array<number>(n + 1).fill(0);
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

type MatchResult = { match: boolean; score: number; reason: string };

function isDuplicate(normA: string, normB: string, entityA: boolean, entityB: boolean): MatchResult {
  const NONE: MatchResult = { match: false, score: 0, reason: '' };
  if (!normA || !normB) return NONE;

  // Don't cross-match legal entities with natural persons
  if (entityA !== entityB) return NONE;

  if (normA === normB) return { match: true, score: 100, reason: 'exact' };

  const setA = tokenSet(normA);
  const setB = tokenSet(normB);

  // Require at least one shared substantial token (> 2 chars) to anchor the match
  const sharedSubstantial = [...setA].filter(t => t.length > 2 && setB.has(t));
  if (sharedSubstantial.length === 0) return NONE;

  const onlyA = tokens(normA).filter(t => !setB.has(t));
  const onlyB = tokens(normB).filter(t => !setA.has(t));

  // Reject different single-char initials: "Van Der Merwe, A" ≠ "Van Der Merwe, B"
  if (
    onlyA.length === 1 && onlyB.length === 1 &&
    onlyA[0].length === 1 && onlyB[0].length === 1 &&
    onlyA[0] !== onlyB[0]
  ) return NONE;

  // Token-subset: "Conder, Andrew" ⊂ "Conder, Andrew Clifford Nicholas"
  if (isTokenSubset(normA, normB) || isTokenSubset(normB, normA)) {
    const ratio = Math.min(setA.size, setB.size) / Math.max(setA.size, setB.size);
    return { match: true, score: Math.round(85 + ratio * 15), reason: 'name_subset' };
  }

  // Initials abbreviation: "Divaris, BN" ↔ "Divaris, Belle Norma Elizabeth"
  if (initialsMatch(normA, normB)) {
    return { match: true, score: 87, reason: 'initials' };
  }

  // Levenshtein similarity for near-identical spellings / typos
  const longer = normA.length >= normB.length ? normA : normB;
  const shorter = normA.length < normB.length ? normA : normB;
  const dist = levenshtein(longer, shorter);
  const levScore = (longer.length - dist) / longer.length;
  if (levScore >= 0.85) {
    return { match: true, score: Math.round(levScore * 100), reason: 'similar' };
  }

  return NONE;
}

// ─── Union-Find (cluster 3+ duplicates together) ──────────────────────────────

function buildUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_: unknown, i: number) => i);
  const rank = new Array<number>(n).fill(0);

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number) {
    const rx = find(x), ry = find(y);
    if (rx === ry) return;
    if (rank[rx] < rank[ry]) parent[rx] = ry;
    else if (rank[rx] > rank[ry]) parent[ry] = rx;
    else { parent[ry] = rx; rank[rx]++; }
  }

  return { find, union };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clients: any[] = await base44.asServiceRole.entities.Client.list('-created_date', 5000) ?? [];
    if (clients.length < 2) return Response.json({ suggestions: [] });

    const normed = clients.map((c: any) => normalize(c.portfolio_name));
    const entity = clients.map((c: any) => isEntity(c.portfolio_name));

    // O(n²) pair scan — clients list is bounded to a few thousand at most
    type Pair = { i: number; j: number; score: number; reason: string };
    const pairs: Pair[] = [];

    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const r = isDuplicate(normed[i], normed[j], entity[i], entity[j]);
        if (r.match) pairs.push({ i, j, score: r.score, reason: r.reason });
      }
    }

    // Cluster matched pairs into groups using union-find
    const { find, union } = buildUnionFind(clients.length);
    for (const { i, j } of pairs) union(i, j);

    const groupMap = new Map<number, number[]>();
    for (let i = 0; i < clients.length; i++) {
      const root = find(i);
      if (!groupMap.has(root)) groupMap.set(root, []);
      groupMap.get(root)!.push(i);
    }

    // Build suggestion objects — one per cluster with 2+ members
    const suggestions: any[] = [];

    for (const members of groupMap.values()) {
      if (members.length < 2) continue;

      const groupPairs = pairs.filter(p => members.includes(p.i) && members.includes(p.j));
      const maxScore = Math.max(...groupPairs.map(p => p.score));
      const bestReason = groupPairs.find(p => p.score === maxScore)!.reason;

      const groupClients = members.map(idx => ({
        id: clients[idx].id,
        portfolio_name: clients[idx].portfolio_name || '',
        account_code: clients[idx].account_code || '',
        client_key: clientKey(clients[idx].portfolio_name),
        total_value: Number(clients[idx].latest_total_value) || 0,
      }));

      // Most complete name (longest) first — suggested as the primary
      groupClients.sort((a, b) => b.portfolio_name.length - a.portfolio_name.length);

      suggestions.push({
        clients: groupClients,
        score: maxScore,
        reason: bestReason,
        // Legacy pair fields so any existing callers still work
        id1: groupClients[0].id,
        id2: groupClients[1].id,
        name1: groupClients[0].portfolio_name,
        name2: groupClients[1].portfolio_name,
        code1: groupClients[0].account_code,
        code2: groupClients[1].account_code,
      });
    }

    suggestions.sort((a, b) => b.score - a.score);
    return Response.json({ suggestions });
  } catch (error: any) {
    return Response.json({ error: error?.message ?? 'suggestClientMerges failed' }, { status: 500 });
  }
});
