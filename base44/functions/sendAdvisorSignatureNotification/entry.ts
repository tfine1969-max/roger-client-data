import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADVISOR_EMAIL_MAP = {
  'Trevor Fine': 'trevor@wealthworks.co.za',
  'Roger Eskinazi': 'roger@wealthworks.co.za',
  'Malcolm Munsamy': 'malcolm@wealthworks.co.za',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    // Only trigger on actual client_signed_date updates
    if (!event?.data?.client_signed_date) {
      return Response.json({ skipped: true });
    }

    const proposalId = event.entity_id;
    const proposals = await base44.asServiceRole.entities.Proposal.list();
    const proposal = proposals.find(p => p.id === proposalId);

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const advisorName = proposal.advisor_name || 'Trevor Fine';
    const advisorEmail = ADVISOR_EMAIL_MAP[advisorName] || Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || 'trevor@wealthworks.co.za';

    const signedDate = proposal.client_signed_date
      ? new Date(proposal.client_signed_date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });

    await base44.asServiceRole.functions.invoke('sendTransactionalEmail', {
      to: advisorEmail,
      subject: `Client Signature Complete — ${proposal.reference || proposal.id}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Client Signature Complete</p></td></tr><tr><td style="padding:40px;"><p style="font-size:15px;color:#1e3a5f;font-weight:600;margin:0 0 16px;">Hi ${advisorName},</p><p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;">Great news! Your client <strong>${proposal.client_name || 'Client'}</strong> has completed the digital signature on their proposal.</p><table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;"><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;width:40%;">Reference</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.reference || '—'}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;">Client</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.client_name || '—'}</td></tr><tr><td style="padding:10px 0;color:#64748b;">Signed</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${signedDate}</td></tr></table><p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 24px;">You can now proceed with next steps in the proposal workflow.</p><p style="font-size:13px;color:#334155;">Kind regards,<br/><strong>WealthWorks Portal</strong></p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337</p></td></tr></table></td></tr></table></body></html>`,
    });

    return Response.json({ sent: true, to: advisorEmail });
  } catch (error) {
    console.error('[sendAdvisorSignatureNotification Error]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});