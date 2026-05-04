const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS = 'WealthWorks <noreply@wealthworks.co.za>';

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    const { to, subject, body, html } = await req.json();

    if (!to || !subject || (!body && !html)) {
      return Response.json({ error: 'Missing required fields: to, subject, and body or html' }, { status: 400 });
    }

    const emailBody = {
      from: FROM_ADDRESS,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    // If body looks like HTML, send as html; otherwise send as text
    const content = html || body;
    if (content.trim().startsWith('<') || content.includes('</')) {
      emailBody.html = content;
    } else {
      emailBody.text = content;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Resend Error]:', result);
      return Response.json({ error: 'Failed to send email', details: result.message || result.name || 'Unknown error' }, { status: response.status });
    }

    return Response.json({ success: true, id: result.id });
  } catch (err) {
    console.error('[sendTransactionalEmail Error]:', err.message);
    return Response.json({ error: 'Email send failed: ' + err.message }, { status: 500 });
  }
});