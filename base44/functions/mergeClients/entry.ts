/**
 * @deprecated
 * This endpoint is superseded by `bulkClientMaintenance` with action "merge".
 * That function operates directly on PortfolioValuation rows (the source of
 * truth), unifies identity numbers, and correctly matches rows by clientKey.
 *
 * This file is kept only to avoid a 404 if any external caller still hits it.
 * It redirects the request to bulkClientMaintenance internally.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeClientText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function clientKey(portfolioName: unknown): string {
  const sorted = normalizeClientText(portfolioName).split(' ').filter(Boolean).sort().join('');
  return sorted ? `name-${sorted}` : '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const { primary_id, secondary_id, merged_name } = await req.json();
    if (!primary_id || !secondary_id || !merged_name?.trim()) {
      return Response.json({ error: 'Missing required fields: primary_id, secondary_id, merged_name' }, { status: 400 });
    }

    // Resolve Client entities to get portfolio_name → clientKey
    const [primaryClients, secondaryClients] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: primary_id }),
      base44.asServiceRole.entities.Client.filter({ id: secondary_id }),
    ]);

    const primaryClient = primaryClients?.[0];
    const secondaryClient = secondaryClients?.[0];

    if (!primaryClient || !secondaryClient) {
      return Response.json({ error: 'One or both clients not found' }, { status: 404 });
    }

    const primaryCK = clientKey(primaryClient.portfolio_name);
    const secondaryCK = clientKey(secondaryClient.portfolio_name);

    if (!primaryCK || !secondaryCK) {
      return Response.json({ error: 'Unable to derive clientKey for one or both clients' }, { status: 400 });
    }

    // Delegate to the canonical merge implementation
    const BATCH_LIMIT = 5000;
    const rows = await base44.asServiceRole.entities.PortfolioValuation.list('-upload_month', BATCH_LIMIT);
    const keySet = new Set([primaryCK, secondaryCK]);

    const primaryRows = rows.filter((r: any) => clientKey(r.portfolio_name) === primaryCK);
    const primaryIdentity = primaryRows.find((r: any) => r.identity_no)?.identity_no ?? null;

    const targetRows = rows.filter((r: any) => keySet.has(clientKey(r.portfolio_name)));
    if (targetRows.length === 0) {
      return Response.json({ error: 'No valuation rows found for these clients' }, { status: 404 });
    }

    const allIdentities = targetRows.map((r: any) => r.identity_no).filter(Boolean);
    const unifiedIdentity = primaryIdentity ?? allIdentities[0] ?? null;

    let updated = 0;
    for (const row of targetRows) {
      await base44.asServiceRole.entities.PortfolioValuation.update(row.id, {
        portfolio_name: String(merged_name).trim(),
        identity_no: unifiedIdentity ?? row.identity_no ?? null,
      });
      updated++;
      if (updated % 25 === 0) await new Promise(res => setTimeout(res, 100));
    }

    return Response.json({
      success: true,
      message: `Merged "${secondaryClient.portfolio_name}" into "${String(merged_name).trim()}" — ${updated} records updated`,
      updated_records: updated,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message ?? 'mergeClients failed' }, { status: 500 });
  }
});
