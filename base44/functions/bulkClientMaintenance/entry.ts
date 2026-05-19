import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH_LIMIT = 500;

const TITLES_RE = /^(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?\s+/gi;
const TRAILING_TITLES_RE = /\s+(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?$/gi;
const ENTITY_MARKERS_RE = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|manufacturers|company|corporation|corp|fund|fof|management|consulting|services|solutions|enterprises|group|associates|capital|advisory|logistics|transport|construction|technologies|technology|media|imaging|images|systems|engineering|healthcare|clinic|pharmacy|retail|distributors|distribution)\b/i;

function formatClientName(name: string): string {
  if (!name) return name;
  let cleaned = name.trim();
  if (ENTITY_MARKERS_RE.test(cleaned)) return cleaned;
  // Strip titles
  let prev: string;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(TITLES_RE, '').trim();
  } while (cleaned !== prev);
  cleaned = cleaned.replace(TRAILING_TITLES_RE, '').trim();
  return cleaned || name;
}

function normalizeClientText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function clientKey(row: Record<string, unknown>) {
  // Must match frontend clientKey in lib/client-utils.js exactly:
  // frontend calls formatClientName first, then normalises and sorts words
  const formattedName = formatClientName(String(row?.portfolio_name || ''));
  const normalized = normalizeClientText(formattedName);
  const sortedName = normalized.split(' ').filter(Boolean).sort().join('');
  if (sortedName && !sortedName.includes('unknown')) return `name-${sortedName}`;
  const plainName = normalized.replace(/[^a-z0-9]+/g, '');
  if (plainName && !plainName.includes('unknown')) return `name-${plainName}`;
  const identity = String(row?.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (identity) return `id-${identity}`;
  return plainName ? `name-${plainName}` : `account-${row?.account_code || 'unknown'}`;
}

function compactUnique(values: unknown[]) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function zarVal(row: Record<string, unknown>) {
  const value = row?.zar_value ?? row?.month_end_market_value ?? 0;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$R,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown error');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      action,
      upload_month,
      client_keys = [],
      primary_key,
      merged_name,
    } = await req.json();

    if (action !== 'fix_entity_names' && (!Array.isArray(client_keys) || client_keys.length === 0)) {
      return Response.json({ error: 'Select at least one client' }, { status: 400 });
    }

    const keySet = new Set(client_keys);

    // Paginate through ALL valuation records
    let rows: Record<string, unknown>[] = [];
    let skip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.PortfolioValuation.list('-upload_month', BATCH_LIMIT, skip);
      if (!page || page.length === 0) break;
      rows = rows.concat(page);
      if (page.length < BATCH_LIMIT) break;
      skip += BATCH_LIMIT;
      await new Promise(res => setTimeout(res, 50));
    }

    if (action === 'merge' || action === 'rename') {
      if (action === 'merge' && client_keys.length < 2) {
        return Response.json({ error: 'Merge requires at least two clients' }, { status: 400 });
      }
      if (!primary_key || !String(merged_name || '').trim()) {
        return Response.json({ error: 'Select a primary client and enter a corrected name' }, { status: 400 });
      }

      const primaryRows = rows.filter((row: Record<string, unknown>) => clientKey(row) === primary_key);
      const primaryIdentity = primaryRows.find((row: Record<string, unknown>) => row.identity_no)?.identity_no || null;
      const targetRows = rows.filter((row: Record<string, unknown>) => keySet.has(clientKey(row)));

      if (targetRows.length === 0) {
        return Response.json({ error: 'No valuation rows matched the selected clients' }, { status: 404 });
      }

      // Determine the unified identity_no: use primary's identity if it has one,
      // otherwise collect all identities across selected clients and pick the first non-null one.
      // All rows will be set to the same identity so they share the same clientKey after merge.
      const allIdentities = targetRows.map((row: Record<string, unknown>) => row.identity_no).filter(Boolean);
      const unifiedIdentity = primaryIdentity || allIdentities[0] || null;

      let updated = 0;
      for (const row of targetRows) {
        await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
          portfolio_name: String(merged_name).trim(),
          identity_no: unifiedIdentity || row.identity_no || null,
          has_unknown_value: false,
          is_flagged: !!row.has_missing_account_code || !!row.has_missing_market_value || !!row.is_duplicate,
        });
        updated++;
        if (updated % 25 === 0) await new Promise(res => setTimeout(res, 100));
      }

      return Response.json({
        success: true,
        action,
        updated_records: updated,
        message: `${action === 'merge' ? 'Merged' : 'Renamed'} ${client_keys.length} client${client_keys.length === 1 ? '' : 's'} to "${String(merged_name).trim()}" — ${updated} records updated`,
      });
    }

    if (action === 'delete_zero_balance') {
      if (!upload_month) {
        return Response.json({ error: 'upload_month is required for zero-balance deletion' }, { status: 400 });
      }

      const rowsForMonth = rows.filter((row: Record<string, unknown>) => row.upload_month === upload_month);
      const totalsByKey: Record<string, number> = {};
      for (const row of rowsForMonth) {
        const key = clientKey(row);
        totalsByKey[key] = (totalsByKey[key] || 0) + zarVal(row);
      }

      const toDelete = rowsForMonth.filter((row: Record<string, unknown>) => {
        const key = clientKey(row);
        return keySet.has(key) && Math.abs(totalsByKey[key] || 0) < 0.01;
      });

      if (toDelete.length === 0) {
        return Response.json({ error: 'No zero-balance rows matched the selected clients' }, { status: 404 });
      }

      let deleted = 0;
      for (const row of toDelete) {
        await base44.asServiceRole.entities.PortfolioValuation.delete(row.id);
        deleted++;
        if (deleted % 25 === 0) await new Promise(res => setTimeout(res, 100));
      }

      return Response.json({
        success: true,
        action,
        deleted_records: deleted,
        message: `Deleted ${deleted} zero-balance valuation records for ${upload_month}`,
      });
    }

    if (action === 'fix_entity_names') {
      // Find all rows with comma-formatted names that look like entities (not real people)
      // e.g. "Management, BSM" → "BSM Management", "Images, Apex" → "Apex Images"
      // We target names provided in the request, or auto-detect via entity markers.
      const ENTITY_MARKERS = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|manufacturers|company|corporation|corp|fund|fof|management|consulting|services|solutions|enterprises|group|associates|images|media|construction|logistics|transport|finance|advisory|capital|wealth|asset|technology|tech|systems|engineering|health|clinic|pharmacy)\b/i;

      let uniqueRows: Record<string, unknown>[] = [];
      let fSkip = 0;
      while (true) {
        const page = await base44.asServiceRole.entities.PortfolioValuation.list('portfolio_name', BATCH_LIMIT, fSkip);
        if (!page || page.length === 0) break;
        uniqueRows = uniqueRows.concat(page);
        if (page.length < BATCH_LIMIT) break;
        fSkip += BATCH_LIMIT;
        await new Promise(res => setTimeout(res, 50));
      }

      const commaRows = uniqueRows.filter((row: Record<string, unknown>) => {
        const name = String(row.portfolio_name || '');
        return name.includes(',') && ENTITY_MARKERS.test(name);
      });

      // Group by current portfolio_name to batch-fix
      const nameGroups: Record<string, { rows: Record<string, unknown>[], fixed: string }> = {};
      for (const row of commaRows) {
        const name = String(row.portfolio_name || '');
        if (!nameGroups[name]) {
          const [surname, ...rest] = name.split(',');
          const firstNames = rest.join(',').trim();
          const fixed = firstNames ? `${firstNames.trim()} ${surname.trim()}` : surname.trim();
          nameGroups[name] = { rows: [], fixed };
        }
        nameGroups[name].rows.push(row as Record<string, unknown>);
      }

      let updated = 0;
      for (const { rows: groupRows, fixed } of Object.values(nameGroups)) {
        for (const row of groupRows) {
          await base44.asServiceRole.entities.PortfolioValuation.update(row.id, { portfolio_name: fixed });
          updated++;
          if (updated % 25 === 0) await new Promise(res => setTimeout(res, 100));
        }
      }

      return Response.json({
        success: true,
        action,
        updated_records: updated,
        fixed_names: Object.entries(nameGroups).map(([original, { fixed }]) => ({ original, fixed })),
        message: `Fixed ${updated} records across ${Object.keys(nameGroups).length} entity names`,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) || 'Bulk client maintenance failed' }, { status: 500 });
  }
});