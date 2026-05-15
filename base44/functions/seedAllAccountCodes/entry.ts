import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const clients = await base44.asServiceRole.entities.Client.list('-created_date', 2000);

    let updated = 0;
    for (const client of clients) {
      if (client.all_account_codes) continue; // already seeded
      await base44.asServiceRole.entities.Client.update(client.id, {
        all_account_codes: String(client.account_code || '').trim(),
      });
      updated++;
      if (updated % 20 === 0) await new Promise(res => setTimeout(res, 100));
    }

    return Response.json({ success: true, seeded: updated, total: clients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});