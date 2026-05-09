const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || Deno.env.get('ADVISOR_NOTIFICATION_NAME') || 'Trevor Fine';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || 'trevor@wealthworks.co.za';
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    const { to, subject, html, text, body } = await req.json();

    if (!to || !subject) {
      return Response.json({ error: 'Missing required fields: to and subject' }, { status: 400 });
    }

    const content = html || body || text;
    if (!content) {
      return Response.json({ error: 'Missing email content: provide html, text, or body' }, { status: 400 });
    }

    const emailPayload = {
      from: FROM_ADDRESS,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    const trimmed = content.trim();
    if (trimmed.startsWith('<') || trimmed.includes('</') || trimmed.includes('<br')) {
      emailPayload.html = content;
    } else {
      emailPayload.html = `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${content}</pre>`;
      emailPayload.text = content;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Resend Error]:', JSON.stringify(result));
      return Response.json({
        error: 'Failed to send email',
        details: result.message || result.name || 'Unknown error',
        status: response.status,
        from: FROM_ADDRESS,
      }, { status: response.status });
    }

    console.log(`[sendTransactionalEmail] Sent to ${Array.isArray(to) ? to.join(', ') : to} - id: ${result.id}`);
    return Response.json({ success: true, id: result.id });
  } catch (err) {
    console.error('[sendTransactionalEmail Error]:', err.message);
    return Response.json({ error: 'Email send failed: ' + err.message }, { status: 500 });
  }
});
