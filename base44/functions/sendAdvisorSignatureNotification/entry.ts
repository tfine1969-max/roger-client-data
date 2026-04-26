import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Buffer } from 'npm:buffer@6.0.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    // Only trigger on actual client_signed_date updates
    if (!event.data?.client_signed_date) {
      return Response.json({ skipped: true });
    }

    const proposalId = event.entity_id;
    const proposal = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId }).then(d => d[0]);

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Get advisor email from Proposal or derive from advisor_name
    const advisorName = proposal.advisor_name || 'Unknown Advisor';
    const advisorEmail = getAdvisorEmail(advisorName);

    if (!advisorEmail) {
      return Response.json({ error: 'Advisor email not found' }, { status: 400 });
    }

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build MIME message
    const subject = `Client Signature Complete — ${proposal.reference}`;
    const htmlBody = `
      <p>Hi ${advisorName},</p>
      <p>Great news! Your client <strong>${proposal.client_name}</strong> has completed the digital signature on their proposal.</p>
      <p><strong>Proposal Details:</strong></p>
      <ul>
        <li>Reference: ${proposal.reference}</li>
        <li>Client: ${proposal.client_name}</li>
        <li>Signed: ${new Date(proposal.client_signed_date).toLocaleDateString()}</li>
      </ul>
      <p>You can now proceed with next steps in the proposal workflow.</p>
      <p>Best regards,<br>WealthWorks Advisory Portal</p>
    `;

    const mimeMessage = buildMimeMessage(advisorEmail, subject, htmlBody);
    const encodedMessage = Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Send via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!sendResponse.ok) {
      throw new Error(`Gmail API error: ${sendResponse.statusText}`);
    }

    return Response.json({ sent: true, to: advisorEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getAdvisorEmail(name) {
  const advisorMap = {
    'Trevor Fine': 'trevor@wealthworks.co.za',
    'Roger Eskinazi': 'roger@wealthworks.co.za',
    'Malcolm Munsamy': 'malcolm@wealthworks.co.za',
  };
  return advisorMap[name] || null;
}

function buildMimeMessage(to, subject, htmlBody) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
  ];

  return headers.join('\r\n') + '\r\n\r\n' + htmlBody;
}