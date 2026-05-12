import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH_LIMIT = 5000;

function normalizeClientText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|dr|prof)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function clientKey(row: Record<string, unknown>) {
  const identity = String(row?.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (identity) return `id-${identity}`;
  const name = normalizeClientText(row?.portfolio_name || '').replace(/[^a-z0-9]+/g, '');
  return name ? `name-${name}` : `account-${row?.account_code || 'unknown'}`;
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

    if (!Array.isArray(client_keys) || client_keys.length === 0) {
      return Response.json({ error: 'Select at least one client' }, { status: 400 });
    }

    const keySet = new Set(client_keys);
    const rows = await base44.asServiceRole.entities.PortfolioValuation.list('-upload_month', BATCH_LIMIT);

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

      let updated = 0;
      for (const row of targetRows) {
        await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
          portfolio_name: String(merged_name).trim(),
          ...(primaryIdentity ? { identity_no: primaryIdentity } : {}),
          has_unknown_value: false,
          is_flagged: !!row.has_missing_account_code || !!row.has_missing_market_value || !!row.is_duplicate,
        });
        updated++;
        if (updated % 25 === 0) await new Promise(res => setTimeout(res, 100));
      }

      let ruleSaved = false;
      let ruleWarning = '';
      try {
        await base44.asServiceRole.entities.ClientMergeRule.create({
          merged_name: String(merged_name).trim(),
          primary_key,
          client_keys: compactUnique(client_keys).join('|'),
          account_codes: compactUnique(targetRows.map((row: Record<string, unknown>) => row.account_code)).join('|'),
          identity_numbers: compactUnique(targetRows.map((row: Record<string, unknown>) => row.identity_no)).join('|'),
          source_names: compactUnique(targetRows.map((row: Record<string, unknown>) => row.portfolio_name)).join('|'),
          created_by: user.email || user.full_name || 'Unknown',
        });
        ruleSaved = true;
      } catch (error) {
        ruleWarning = `The selected rows were merged, but the future-import merge rule could not be saved: ${errorMessage(error)}`;
      }

      return Response.json({
        success: true,
        action,
        updated_records: updated,
        rule_saved: ruleSaved,
        warning: ruleWarning,
        message: ruleSaved
          ? `${action === 'merge' ? 'Merged' : 'Renamed'} ${client_keys.length} client${client_keys.length === 1 ? '' : 's'} to ${String(merged_name).trim()} and saved the rule for future uploads`
          : `${action === 'merge' ? 'Merged' : 'Renamed'} ${client_keys.length} client${client_keys.length === 1 ? '' : 's'} to ${String(merged_name).trim()}. ${ruleWarning}`,
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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) || 'Bulk client maintenance failed' }, { status: 500 });
  }
});
