import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const { primary_id, secondary_id, merged_name } = await req.json();
    
    if (!primary_id || !secondary_id || !merged_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get both clients
    const primaryClients = await base44.asServiceRole.entities.Client.filter({ id: primary_id });
    const secondaryClients = await base44.asServiceRole.entities.Client.filter({ id: secondary_id });
    
    const primaryClient = primaryClients[0];
    const secondaryClient = secondaryClients[0];
    
    if (!primaryClient || !secondaryClient) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update all portfolio valuations from secondary to primary
    const secondaryValuations = await base44.asServiceRole.entities.PortfolioValuation.filter({
      account_code: secondaryClient.account_code
    });
    
    let updatedCount = 0;
    for (let i = 0; i < secondaryValuations.length; i++) {
      const valuation = secondaryValuations[i];
      try {
        await base44.asServiceRole.entities.PortfolioValuation.update(valuation.id, {
          account_code: primaryClient.account_code,
          portfolio_name: merged_name
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update valuation ${valuation.id}:`, err.message);
      }
      if ((i + 1) % 10 === 0) {
        await new Promise(res => setTimeout(res, 100));
      }
    }

    // Update the primary client
    await base44.asServiceRole.entities.Client.update(primary_id, {
      portfolio_name: merged_name,
      platforms: [primaryClient.platforms, secondaryClient.platforms]
        .filter(Boolean)
        .join(',')
        .split(',')
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(',')
    });

    // Delete the secondary client
    await base44.asServiceRole.entities.Client.delete(secondary_id);

    return Response.json({
      success: true,
      message: `Merged ${secondaryClient.portfolio_name} into ${merged_name}`,
      updated_records: updatedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});