import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Advisor access required' }, { status: 403 });
    }

    const { clientId, clientEmail, clientName, documentTypes, message } = await req.json();

    if (!clientId || !clientEmail || !documentTypes?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique upload token
    const uploadToken = crypto.randomUUID().replace(/-/g, '');
    const appBaseUrl = (req.headers.get('origin') || Deno.env.get('APP_BASE_URL') || '').replace(/\/+$/, '');
    if (!appBaseUrl) {
      return Response.json({ error: 'APP_BASE_URL not configured' }, { status: 500 });
    }
    const uploadUrl = `${appBaseUrl}/upload-documents?token=${uploadToken}`;

    // Create the document request record
    const docRequest = await base44.asServiceRole.entities.DocumentRequest.create({
      client_id: clientId,
      client_email: clientEmail,
      client_name: clientName || 'Client',
      requested_by_email: user.email,
      requested_by_name: user.full_name || user.email,
      document_types: documentTypes,
      message: message || '',
      upload_token: uploadToken,
      status: 'Pending',
      sent_at: new Date().toISOString(),
    });

    // Send email to client
    const docList = documentTypes.map(d => `• ${d}`).join('\n');
    await base44.asServiceRole.functions.invoke('sendTransactionalEmail', {
      to: clientEmail,
      subject: 'Additional Documents Required — WealthWorks',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Additional Documents Required</p></td></tr><tr><td style="padding:40px;"><p style="font-size:15px;color:#1e3a5f;font-weight:600;margin:0 0 16px;">Dear ${clientName || 'Client'},</p><p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;">Your advisor has requested the following documents to complete your file:</p><ul style="font-size:14px;color:#334155;line-height:2;margin:0 0 16px;">${documentTypes.map(d => `<li>${d}</li>`).join('')}</ul>${message ? `<p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;"><strong>Message from your advisor:</strong><br/>${message}</p>` : ''}<p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 24px;">Please use the secure link below to upload your documents:</p><table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="background:#1e3a5f;border-radius:6px;padding:14px 28px;"><a href="${uploadUrl}" style="color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.8px;text-transform:uppercase;">Upload Documents →</a></td></tr></table><p style="font-size:12px;color:#64748b;margin:0 0 24px;">Or copy this link: <a href="${uploadUrl}" style="color:#1e3a5f;">${uploadUrl}</a></p><p style="font-size:13px;color:#64748b;">This link is unique to you and expires after use. Please do not share it.</p><p style="font-size:13px;color:#334155;margin-top:24px;">Kind regards,<br/><strong>The WealthWorks Team</strong></p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337 · <a href="https://www.wealthworks.co.za" style="color:#1e3a5f;">www.wealthworks.co.za</a></p></td></tr></table></td></tr></table></body></html>`,
    });

    // Write audit log
    await base44.asServiceRole.entities.OnboardingAuditLog.create({
      client_id: clientId,
      actor_email: user.email,
      actor_name: user.full_name || user.email,
      action: 'Document Request Sent',
      previous_status: '',
      new_status: 'Awaiting Documents',
      notes: `Requested: ${documentTypes.join(', ')}${message ? ' | Message: ' + message : ''}`,
      metadata: JSON.stringify({ upload_token: uploadToken, document_types: documentTypes }),
    });

    // Update client doc_status to Awaiting
    await base44.asServiceRole.entities.Clients.update(clientId, {
      doc_status: 'Incomplete',
      verification_status: 'Awaiting Documents',
    });

    return Response.json({ success: true, requestId: docRequest.id, uploadToken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});