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
    const primaryClient = await base44.entities.Client.read(primary_id);
    const secondaryClient = await base44.entities.Client.read(secondary_id);
    
    if (!primaryClient || !secondaryClient) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update all portfolio valuations from secondary to primary
    const secondaryValuations = await base44.entities.PortfolioValuation.filter({
      account_code: secondaryClient.account_code
    });
    
    for (const valuation of secondaryValuations) {
      await base44.entities.PortfolioValuation.update(valuation.id, {
        account_code: primaryClient.account_code,
        portfolio_name: merged_name
      });
    }

    // Update the primary client
    await base44.entities.Client.update(primary_id, {
      portfolio_name: merged_name,
      platforms: [primaryClient.platforms, secondaryClient.platforms]
        .filter(Boolean)
        .join(',')
        .split(',')
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(',')
    });

    // Delete the secondary client
    await base44.entities.Client.delete(secondary_id);

    return Response.json({
      success: true,
      message: `Merged ${secondaryClient.portfolio_name} into ${merged_name}`,
      updated_records: secondaryValuations.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});