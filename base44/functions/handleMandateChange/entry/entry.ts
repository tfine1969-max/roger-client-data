import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id, mandate_included } = await req.json();

    if (!proposal_id || mandate_included === undefined) {
      return Response.json({ error: 'proposal_id and mandate_included required' }, { status: 400 });
    }

    const output_document_type = mandate_included === 'Yes' ? 'Document B' : 'Document A';

    await base44.asServiceRole.entities.Proposal.update(proposal_id, {
      mandate_included,
      output_document_type,
      pdf_status: 'Outdated',
      proposal_status: 'Modified',
      advisor_signature_completed: false,
      client_signature_completed: false,
      client_initials_completed: false
    });

    return Response.json({ success: true, mandate_included, output_document_type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});