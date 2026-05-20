import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeClientText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Sorted-token clientKey — must stay in sync with client-utils.js clientKey().
 * Sorting makes word-order irrelevant so "Conder, Andrew" and "Andrew Conder"
 * both produce "name-andrewconder".
 */
function clientKey(row: Record<string, unknown>): string {
  const normalized = normalizeClientText(row?.portfolio_name || '');
  const sorted = normalized.split(' ').filter(Boolean).sort().join('');
  if (sorted && !sorted.includes('unknown')) return `name-${sorted}`;
  const plain = normalized.replace(/[^a-z0-9]+/g, '');
  if (plain && !plain.includes('unknown')) return `name-${plain}`;
  const identity = String(row?.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (identity) return `id-${identity}`;
  return plain ? `name-${plain}` : `account-${row?.account_code || 'unknown'}`;
}

function compactUnique(values: unknown[]): string[] {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}

function zarVal(row: Record<string, unknown>): number {
  const v = row?.zar_value ?? row?.month_end_market_value ?? 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$R,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e || 'Unknown error');
}

/** Fetch all PortfolioValuation rows matching a set of exact portfolio_name values.
 *  Uses one parallel filter call per name — no batch-limit risk. */
async function fetchRowsByNames(
  base44: any,
  names: string[],
): Promise<Record<string, unknown>[]> {
  const batches = await Promise.all(
    names.map(name =>
      base44.asServiceRole.entities.PortfolioValuation.filter(
        { portfolio_name: name.trim() },
        '-upload_month',
        10000,
      )
    )
  );
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const batch of batches) {
    for (const row of (batch || [])) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
      }
    }
  }
  return rows;
}

/** Write a ClientMergeRule so that future imports auto-apply this merge. */
async function createMergeRule(
  base44: any,
  mergedName: string,
  primaryKey: string,
  clientKeys: string[],
  targetRows: Record<string, unknown>[],
  actor: string,
): Promise<void> {
  const accountCodes = compactUnique(targetRows.map(r => r.account_code));
  const identities = compactUnique(
    targetRows.map(r => String(r.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase())
  ).filter(Boolean);
  // Store every source name except the merged name itself so imports can match
  const sourceNames = compactUnique(targetRows.map(r => r.portfolio_name))
    .filter(n => n !== mergedName);

  if (sourceNames.length === 0 && accountCodes.length === 0 && identities.length === 0) return;

  await base44.asServiceRole.entities.ClientMergeRule.create({
    merged_name: mergedName,
    primary_key: primaryKey,
    client_keys: clientKeys.join('|'),
    account_codes: accountCodes.join('|'),
    identity_numbers: identities.join('|'),
    source_names: sourceNames.join('|'),
    created_by: actor,
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      action,
      upload_month,
      client_keys = [],
      primary_key,
      merged_name,
      source_names = [],   // array of exact portfolio_name strings from the frontend
    } = body;

    // ── merge / rename ────────────────────────────────────────────────────────
    if (action === 'merge' || action === 'rename') {
      if (!Array.isArray(client_keys) || client_keys.length === 0) {
        return Response.json({ error: 'Select at least one client' }, { status: 400 });
      }
      if (action === 'merge' && client_keys.length < 2) {
        return Response.json({ error: 'Merge requires at least two clients' }, { status: 400 });
      }
      if (!primary_key || !String(merged_name || '').trim()) {
        return Response.json({ error: 'Select a primary client and enter a corrected name' }, { status: 400 });
      }

      const canonicalName = String(merged_name).trim();
      const keySet = new Set<string>(client_keys);

      // ── Resolve target rows ──────────────────────────────────────────────
      // Primary approach: use the exact portfolio_name values passed by the
      // frontend.  This is a direct DB filter — reliable and unlimited.
      const validSourceNames: string[] = Array.isArray(source_names)
        ? source_names.filter((n: unknown) => typeof n === 'string' && String(n).trim())
        : [];

      let targetRows: Record<string, unknown>[] = [];

      if (validSourceNames.length > 0) {
        targetRows = await fetchRowsByNames(base44, validSourceNames);
      }

      // Fallback / supplement: if no source_names were supplied, or if the
      // direct filter missed some rows (edge case), also scan by clientKey.
      if (targetRows.length === 0) {
        const scanned = await base44.asServiceRole.entities.PortfolioValuation.list(
          '-upload_month', 10000
        );
        const seen = new Set(targetRows.map((r: any) => r.id));
        const extra = (scanned || []).filter(
          (r: Record<string, unknown>) => keySet.has(clientKey(r)) && !seen.has(r.id)
        );
        targetRows = [...targetRows, ...extra];
      }

      if (targetRows.length === 0) {
        return Response.json(
          { error: 'No valuation rows found for the selected clients. Try re-selecting from the client list.' },
          { status: 404 }
        );
      }

      // Unified identity: prefer the primary client's identity
      const primaryIdentity = targetRows
        .filter(r => clientKey(r) === primary_key)
        .find(r => r.identity_no)?.identity_no ?? null;
      const unifiedIdentity: string | null =
        primaryIdentity ||
        (targetRows.find(r => r.identity_no)?.identity_no as string) ||
        null;

      // ── Update all rows ──────────────────────────────────────────────────
      let updated = 0;
      for (const row of targetRows) {
        await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
          portfolio_name: canonicalName,
          ...(unifiedIdentity ? { identity_no: unifiedIdentity } : {}),
        });
        updated++;
        if (updated % 25 === 0) await new Promise(r => setTimeout(r, 80));
      }

      // ── Persist merge rule so future imports apply the same mapping ──────
      try {
        await createMergeRule(
          base44,
          canonicalName,
          primary_key,
          client_keys,
          targetRows,
          user.email || user.id || 'system',
        );
      } catch (_e) {
        // Rule creation is best-effort — don't fail the whole merge
        console.warn('Could not create ClientMergeRule:', errMsg(_e));
      }

      return Response.json({
        success: true,
        action,
        updated_records: updated,
        message: `${action === 'merge' ? 'Merged' : 'Renamed'} ${client_keys.length} client${client_keys.length === 1 ? '' : 's'} to "${canonicalName}" — ${updated} records updated`,
      });
    }

    // ── delete_zero_balance ───────────────────────────────────────────────────
    if (action === 'delete_zero_balance') {
      if (!upload_month) {
        return Response.json({ error: 'upload_month is required' }, { status: 400 });
      }
      if (!Array.isArray(client_keys) || client_keys.length === 0) {
        return Response.json({ error: 'Select at least one client' }, { status: 400 });
      }

      const keySet = new Set<string>(client_keys);

      // Only fetch this month — keeps it within limits and avoids scanning history
      const monthRows: Record<string, unknown>[] =
        await base44.asServiceRole.entities.PortfolioValuation.filter(
          { upload_month },
          '-created_date',
          10000,
        ) || [];

      // Sum ZAR value per clientKey for this month
      const totalsByKey: Record<string, number> = {};
      for (const row of monthRows) {
        const k = clientKey(row);
        totalsByKey[k] = (totalsByKey[k] || 0) + zarVal(row);
      }

      const toDelete = monthRows.filter(row => {
        const k = clientKey(row);
        return keySet.has(k) && Math.abs(totalsByKey[k] || 0) < 0.01;
      });

      if (toDelete.length === 0) {
        return Response.json(
          { error: 'No zero-balance rows matched the selected clients for that month' },
          { status: 404 }
        );
      }

      let deleted = 0;
      for (const row of toDelete) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(row.id);
        deleted++;
        if (deleted % 25 === 0) await new Promise(r => setTimeout(r, 80));
      }

      return Response.json({
        success: true,
        action,
        deleted_records: deleted,
        message: `Deleted ${deleted} zero-balance records for ${upload_month}`,
      });
    }

    // ── fix_entity_names ──────────────────────────────────────────────────────
    if (action === 'fix_entity_names') {
      const ENTITY_RE = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|manufacturers|company|corporation|corp|fund|fof|management|consulting|services|solutions|enterprises|group|associates|images|media|construction|logistics|transport|finance|advisory|capital|wealth|asset|technology|tech|systems|engineering|health|clinic|pharmacy)\b/i;

      // Fetch two ordered passes to get full coverage beyond a single sort limit
      const [pass1, pass2] = await Promise.all([
        base44.asServiceRole.entities.PortfolioValuation.list('portfolio_name', 5000),
        base44.asServiceRole.entities.PortfolioValuation.list('-portfolio_name', 5000),
      ]);
      const seen = new Set<string>();
      const allRows = [...(pass1 || []), ...(pass2 || [])].filter(row => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });

      // Only rows with a comma AND an entity marker → likely wrongly inverted
      const commaEntityRows = allRows.filter(row => {
        const n = String(row.portfolio_name || '');
        return n.includes(',') && ENTITY_RE.test(n);
      });

      // Group by current name so we can batch-fix identical names at once
      const groups: Record<string, { rows: Record<string, unknown>[]; fixed: string }> = {};
      for (const row of commaEntityRows) {
        const name = String(row.portfolio_name || '');
        if (!groups[name]) {
          const [part1, ...rest] = name.split(',');
          const firstPart = rest.join(',').trim();
          groups[name] = {
            rows: [],
            fixed: firstPart ? `${firstPart} ${part1.trim()}` : part1.trim(),
          };
        }
        groups[name].rows.push(row);
      }

      let updated = 0;
      for (const { rows: groupRows, fixed } of Object.values(groups)) {
        for (const row of groupRows) {
          await base44.asServiceRole.entities.PortfolioValuation.update(row.id, { portfolio_name: fixed });
          updated++;
          if (updated % 25 === 0) await new Promise(r => setTimeout(r, 80));
        }
      }

      return Response.json({
        success: true,
        action,
        updated_records: updated,
        fixed_names: Object.entries(groups).map(([original, { fixed }]) => ({ original, fixed })),
        message: `Fixed ${updated} records across ${Object.keys(groups).length} entity names`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: errMsg(error) || 'bulkClientMaintenance failed' },
      { status: 500 }
    );
  }
});
