import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required' }, { status: 400 });
    }

    // Fetch Proposal
    const proposal = await base44.asServiceRole.entities.Proposal.filter({ id: proposal_id });
    if (!proposal || proposal.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposalData = proposal[0];

    // Determine document type based on mandate_included
    const documentType = proposalData.mandate_included === 'Yes' ? 'Document B' : 'Document A';

    // Fetch Client data (if client_id exists)
    let clientData = null;
    if (proposalData.client_id) {
      const clients = await base44.asServiceRole.entities.Clients.filter({ id: proposalData.client_id });
      clientData = clients[0] || null;
    }

    // Fetch Investments linked to this proposal
    const investments = await base44.asServiceRole.entities.Investments.filter({ proposal_id });

    // Fetch RiskProducts linked to this proposal
    const riskProducts = await base44.asServiceRole.entities.RiskProducts.filter({ proposal_id });

    // Fetch RiskCovers for each RiskProduct
    const riskCoversMap = {};
    for (const product of riskProducts) {
      const covers = await base44.asServiceRole.entities.RiskCovers.filter({ risk_product_id: product.id });
      riskCoversMap[product.id] = covers;
    }

    // Structure the data for PDF generation
    const pdfData = {
      documentType,
      proposal: proposalData,
      client: clientData,
      investments: investments || [],
      riskProducts: riskProducts.map(product => ({
        ...product,
        covers: riskCoversMap[product.id] || []
      }))
    };

    return Response.json({ success: true, data: pdfData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});