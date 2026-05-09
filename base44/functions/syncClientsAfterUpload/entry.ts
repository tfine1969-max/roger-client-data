import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const upload_month = body.upload_month;
    if (!upload_month) return Response.json({ error: 'upload_month is required' }, { status: 400 });

    // Fetch valuations for this month
    const valuations = await base44.asServiceRole.entities.PortfolioValuation.filter(
      { upload_month },
      '-created_date',
      5000
    );

    if (!valuations.length) {
      return Response.json({ message: 'No valuations found for this month', synced: 0 });
    }

    // Group by composite client key
    const clientMap = {};
    for (const row of valuations) {
      if (!row.account_code || !row.portfolio_name) continue;
      const key = `${row.account_code}||${row.identity_no || ''}||${row.portfolio_name}`;
      if (!clientMap[key]) {
        clientMap[key] = {
          account_code: row.account_code,
          identity_no: row.identity_no || '',
          portfolio_name: row.portfolio_name,
          platforms: new Set(),
          count: 0,
          total_value: 0,
          currency: row.currency || '',
        };
      }
      clientMap[key].count++;
      clientMap[key].total_value += row.zar_value ?? row.month_end_market_value ?? 0;
      if (row.platform) clientMap[key].platforms.add(row.platform);
      if (!clientMap[key].currency && row.currency) clientMap[key].currency = row.currency;
    }

    // Fetch all existing clients
    const existingClients = await base44.asServiceRole.entities.Client.list('-created_date', 2000);
    const existingMap = {};
    for (const c of existingClients) {
      const key = `${c.account_code}||${c.identity_no || ''}||${c.portfolio_name}`;
      existingMap[key] = c;
    }

    const uploadedKeys = new Set(Object.keys(clientMap));

    const toCreate = [];
    const toUpdate = [];

    for (const [key, data] of Object.entries(clientMap)) {
      const payload = {
        account_code: data.account_code,
        identity_no: data.identity_no,
        portfolio_name: data.portfolio_name,
        last_updated_month: upload_month,
        latest_total_value: data.total_value,
        number_of_investments: data.count,
        platforms: [...data.platforms].join(', '),
        latest_currency: data.currency,
      };

      const existing = existingMap[key];
      if (existing) {
        toUpdate.push({ id: existing.id, payload: { ...payload, status: 'Active' } });
      } else {
        toCreate.push({ ...payload, first_seen_month: upload_month, status: 'New' });
      }
    }

    // Mark absent clients
    const toMarkAbsent = [];
    for (const [key, existing] of Object.entries(existingMap)) {
      if (!uploadedKeys.has(key)) {
        toMarkAbsent.push({
          id: existing.id,
          payload: {
            account_code: existing.account_code,
            portfolio_name: existing.portfolio_name || existing.name || 'Unknown',
            status: 'Not Present In Latest Upload',
          },
        });
      }
    }

    // Bulk create new clients
    let created = 0;
    for (let i = 0; i < toCreate.length; i += 50) {
      const chunk = toCreate.slice(i, i + 50);
      await base44.asServiceRole.entities.Client.bulkCreate(chunk);
      created += chunk.length;
    }

    // Update existing + absent sequentially to avoid rate limits
    const allUpdates = [...toUpdate, ...toMarkAbsent];
    for (const { id, payload } of allUpdates) {
      await base44.asServiceRole.entities.Client.update(id, payload);
    }

    return Response.json({
      upload_month,
      clients_created: created,
      clients_updated: toUpdate.length,
      clients_marked_absent: toMarkAbsent.length,
    });
  } catch (error) {
    console.error('syncClientsAfterUpload error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});