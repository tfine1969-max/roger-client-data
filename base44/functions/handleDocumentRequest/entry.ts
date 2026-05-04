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
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'WealthWorks',
      to: clientEmail,
      subject: 'Additional Documents Required — WealthWorks',
      body: `Dear ${clientName || 'Client'},\n\nThank you for completing your onboarding with WealthWorks.\n\nAdditional verification may be required. WealthWorks will contact you if further documentation is needed.\n\nYour advisor has requested the following documents to complete your file:\n\n${docList}\n\n${message ? `Additional message from your advisor:\n${message}\n\n` : ''}Please use the secure link below to upload your documents:\n\n${uploadUrl}\n\nThis link is unique to you and expires after use. Please do not share it.\n\nIf you have any questions, please contact your advisor directly.\n\nKind regards,\nThe WealthWorks Team\n\nAuthorised Financial Services Provider FSP no 28337`,
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
