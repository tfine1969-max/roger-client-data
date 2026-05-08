import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const advisorNotificationEmail = Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || 'trevor@wealthworks.co.za';
  const advisorNotificationName = Deno.env.get('ADVISOR_NOTIFICATION_NAME') || 'Advisor';

  const body = await req.json();
  const { action, proposalId, clientInitials, signedAt, signedPdfUrl } = body;

  if (!proposalId) {
    return Response.json({ error: 'proposalId is required' }, { status: 400 });
  }

  // Use service role so unauthenticated clients can read/update proposals
  // Try Proposal (singular) first, then fall back to Proposals (plural)
  let proposal = null;
  let entityName = 'Proposal';

  const allProposalsSingular = await base44.asServiceRole.entities.Proposal.list();
  proposal = allProposalsSingular.find(p => p.signing_token === proposalId);

  if (!proposal) {
    const allProposalsPlural = await base44.asServiceRole.entities.Proposals.list();
    proposal = allProposalsPlural.find(p => p.signing_token === proposalId);
    if (proposal) entityName = 'Proposals';
  }

  if (!proposal) {
    return Response.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Helper to update the correct entity
  const updateProposal = (id, data) =>
    entityName === 'Proposals'
      ? base44.asServiceRole.entities.Proposals.update(id, data)
      : base44.asServiceRole.entities.Proposal.update(id, data);

  // action=load — just return the proposal (for initial page load)
  if (action === 'load') {
    // Also mark as Awaiting Client Signature if not already signed
    if (proposal.status !== 'Signed') {
      await updateProposal(proposal.id, {
        status: 'Awaiting Client Signature',
      });
      return Response.json({ proposal: { ...proposal, status: 'Awaiting Client Signature' } });
    }
    return Response.json({ proposal });
  }

  // action=submit — save signature data + notify advisor
  if (action === 'submit') {
    if (!clientInitials || !signedAt) {
      return Response.json({ error: 'clientInitials and signedAt are required' }, { status: 400 });
    }

    const updateData = {
      client_initials: clientInitials,
      signed_at: signedAt,
      status: 'Signed',
    };
    if (signedPdfUrl) {
      updateData.signed_pdf_url = signedPdfUrl;
    }

    await updateProposal(proposal.id, updateData);

    // Notify advisor (non-blocking — errors don't fail the request)
    try {
      await base44.asServiceRole.functions.invoke('sendTransactionalEmail', {
        to: advisorNotificationEmail,
        subject: `Document Signed — ${proposal.client_name || ''} — ${proposal.reference || ''}`,
        body: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Document Signed — Action Required</p></td></tr><tr><td style="padding:40px;"><p style="font-size:15px;color:#1e3a5f;font-weight:600;margin:0 0 16px;">Dear ${advisorNotificationName},</p><p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;"><strong>${proposal.client_name || 'The client'}</strong> has signed their Financial Strategy &amp; Recommendation Report.</p><table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;"><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;width:40%;">Client</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.client_name || '—'}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;">Proposal Reference</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.reference || '—'}</td></tr><tr><td style="padding:10px 0;color:#64748b;">Signed At</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${new Date(signedAt).toLocaleString('en-ZA')}</td></tr></table><p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 24px;">Please log in to the WealthWorks Advisor Portal to view the signed document in the client's Document Repository.</p><p style="font-size:13px;color:#334155;">Kind regards,<br/><strong>WealthWorks Portal</strong></p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0 0 4px;font-size:11px;color:#64748b;font-weight:700;">For more information go to: <a href="https://www.wealthworks.co.za" style="color:#1e3a5f;">www.wealthworks.co.za</a></p><p style="margin:0;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337</p></td></tr></table></td></tr></table></body></html>`,
      });
    } catch (emailErr) {
      console.warn('Advisor email failed (non-blocking):', emailErr?.message);
    }

    return Response.json({ success: true });
  }

  // action=getRelated — fetch investments + risk products + risk covers for PDF generation
  if (action === 'getRelated') {
    const [allInvestments, allRiskProducts, allRiskCovers] = await Promise.all([
      base44.asServiceRole.entities.Investments.list(),
      base44.asServiceRole.entities.RiskProducts.list(),
      base44.asServiceRole.entities.RiskCovers.list(),
    ]);
    const investments = allInvestments.filter(i => i.proposal_id === proposal.id);
    const riskProductsRaw = allRiskProducts.filter(rp => rp.proposal_id === proposal.id);
    const riskProducts = riskProductsRaw.map(rp => ({
      ...rp,
      covers: allRiskCovers.filter(c => c.risk_product_id === rp.id),
      _covers: allRiskCovers.filter(c => c.risk_product_id === rp.id),
    }));
    return Response.json({ investments, riskProducts });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});