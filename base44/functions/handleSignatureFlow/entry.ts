import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id, action } = await req.json();

    if (!proposal_id || !action) {
      return Response.json({ error: 'proposal_id and action required' }, { status: 400 });
    }

    // Fetch current proposal
    const proposals = await base44.asServiceRole.entities.Proposal.filter({ id: proposal_id });
    if (!proposals || proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    // Handle each action
    if (action === 'send_to_advisor') {
      // Validate: PDF must be current (not outdated, not missing)
      if (proposal.pdf_status !== 'Current') {
        return Response.json({ error: 'PDF must be current before sending to advisor' }, { status: 400 });
      }
      return Response.json({ success: true, message: 'Ready to send to advisor for signature' });
    }

    if (action === 'advisor_signed') {
      // Set advisor_signature_completed = true
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        advisor_signature_completed: true,
        status: 'signed'
      });
      return Response.json({ success: true, message: 'Advisor signature recorded' });
    }

    if (action === 'send_to_client') {
      // Validate: Advisor must have signed
      if (!proposal.advisor_signature_completed) {
        return Response.json({ error: 'Advisor must sign before sending to client' }, { status: 400 });
      }
      return Response.json({ success: true, message: 'Ready to send to client for signature' });
    }

    if (action === 'client_signed') {
      // Set client_signature_completed = true
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        client_signature_completed: true
      });
      return Response.json({ success: true, message: 'Client signature recorded' });
    }

    if (action === 'client_initials_completed') {
      // Set client_initials_completed = true
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        client_initials_completed: true
      });
      return Response.json({ success: true, message: 'Client initials recorded' });
    }

    if (action === 'complete_signatures') {
      // Validate: All signature fields must be true
      if (!proposal.advisor_signature_completed) {
        return Response.json({ error: 'Advisor signature not completed' }, { status: 400 });
      }
      if (!proposal.client_signature_completed) {
        return Response.json({ error: 'Client signature not completed' }, { status: 400 });
      }
      if (!proposal.client_initials_completed) {
        return Response.json({ error: 'Client initials not completed' }, { status: 400 });
      }

      // Update proposal to completed status
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        status: 'client_signed'
      });
      return Response.json({ success: true, message: 'All signatures completed - proposal finalized' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});