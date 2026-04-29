import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct calls ({ proposal_id }) and entity automation payloads ({ data: { proposal_id } })
    const proposal_id = body.proposal_id || body.data?.proposal_id;

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required' }, { status: 400 });
    }

    // Invalidate the proposal
    await base44.asServiceRole.entities.Proposal.update(proposal_id, {
      pdf_status: 'Outdated',
      proposal_status: 'Modified',
      advisor_signature_completed: false,
      client_signature_completed: false,
      client_initials_completed: false
    });

    return Response.json({ success: true, message: 'Proposal invalidated' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});