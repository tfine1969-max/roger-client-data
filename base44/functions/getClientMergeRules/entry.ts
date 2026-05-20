import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Returns all active ClientMergeRules so the frontend can apply name overrides
 * at render time — including for embedded (rogerSourceRows) data that can never
 * be updated by bulkClientMaintenance.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rules = await base44.asServiceRole.entities.ClientMergeRule.list('-created_date', 2000) ?? [];

    return Response.json({ rules });
  } catch (error: any) {
    return Response.json({ error: error?.message ?? 'getClientMergeRules failed' }, { status: 500 });
  }
});
