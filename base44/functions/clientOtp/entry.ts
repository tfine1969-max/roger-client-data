import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const OTP_SECRET = Deno.env.get('OTP_SECRET') || RESEND_API_KEY || 'wealthworks-otp-fallback';
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || Deno.env.get('ADVISOR_NOTIFICATION_NAME') || 'Trevor Fine';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || 'trevor@wealthworks.co.za';
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;

const normalizeEmail = (email = '') => email.toLowerCase().trim();
const normalizeOtp = (otp = '') => String(otp).replace(/\D/g, '').trim();
const otpBucket = (offset = 0) => Math.floor(Date.now() / (15 * 60 * 1000)) + offset;

const clientTypeMap = {
  Individual: 'Natural Person',
  Trust: 'Trust',
  Company: 'Company',
};

const getOnboardingRoute = (entityType: string) => {
  if (entityType === 'Trust') return '/client-onboarding-trust';
  if (entityType === 'Company') return '/client-onboarding-company';
  return '/client-onboarding';
};

async function generateOtp(email: string, offset = 0) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OTP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${normalizeEmail(email)}:${otpBucket(offset)}`));
  const bytes = new Uint8Array(signature);
  const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (value % 900000));
}

async function isValidOtp(email: string, otp: string) {
  const normalizedOtp = normalizeOtp(otp);
  const validCodes = await Promise.all([
    generateOtp(email, 0),
    generateOtp(email, -1),
  ]);
  return validCodes.includes(normalizedOtp);
}

async function sendOtpEmail(email: string, otp: string, mode = 'onboarding') {
  if (!RESEND_API_KEY) {
    return { ok: false, status: 500, error: 'RESEND_API_KEY is not configured' };
  }

  const subject = mode === 'login'
    ? 'Your WealthWorks login verification code'
    : 'Your WealthWorks verification code';

  const text = mode === 'login'
    ? `Your WealthWorks verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this code, please ignore this email.`
    : `Your WealthWorks onboarding verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [email],
      subject,
      text,
      html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${text}</pre>`,
    }),
  });

  const raw = await response.text();
  let result: any = {};
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch (_err) {
    result = { raw };
  }

  if (!response.ok) {
    console.error('[clientOtp Resend Error]:', JSON.stringify(result));
    return {
      ok: false,
      status: response.status,
      error: result.message || result.name || result.error || 'Resend rejected the email',
      details: result,
      from: FROM_ADDRESS,
    };
  }

  return { ok: true, status: response.status, id: result.id };
}

function emailFailureResponse(emailResult: any) {
  return Response.json({
    error: 'Failed to send OTP email',
    details: emailResult.error || 'Unknown email error',
    resend_status: emailResult.status,
    from: emailResult.from || FROM_ADDRESS,
  }, { status: emailResult.status || 500 });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const action = payload.action;

    if (action === 'register') {
      const email = normalizeEmail(payload.email);
      const mobile = String(payload.mobile || '').trim();
      const entityType = payload.entityType || 'Individual';

      if (!email || !mobile) {
        return Response.json({ error: 'Email and mobile are required' }, { status: 400 });
      }

      const allClients = await base44.asServiceRole.entities.Clients.list();
      const existing = allClients.find((c: any) => normalizeEmail(c.email || c.client_email) === email);
      const otp = await generateOtp(email);
      const updateData = {
        email,
        mobile_number: mobile,
        client_type: clientTypeMap[entityType as keyof typeof clientTypeMap] || 'Natural Person',
        client_status: existing?.client_status || 'Draft',
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      };

      const client = existing
        ? await base44.asServiceRole.entities.Clients.update(existing.id, updateData)
        : await base44.asServiceRole.entities.Clients.create(updateData);

      const emailResult = await sendOtpEmail(email, otp, 'onboarding');
      if (!emailResult.ok) return emailFailureResponse(emailResult);

      return Response.json({
        success: true,
        client_id: client.id || existing?.id,
        email,
        onboarding_route: getOnboardingRoute(entityType),
        existing: !!existing,
      });
    }

    if (action === 'login') {
      const email = normalizeEmail(payload.email);
      if (!email) {
        return Response.json({ error: 'Email is required' }, { status: 400 });
      }

      const allClients = await base44.asServiceRole.entities.Clients.list();
      const client = allClients.find((c: any) => normalizeEmail(c.email || c.client_email) === email);
      if (!client) {
        return Response.json({ error: 'No account found with this email address' }, { status: 404 });
      }

      const otp = await generateOtp(email);
      await base44.asServiceRole.entities.Clients.update(client.id, {
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      });

      const emailResult = await sendOtpEmail(email, otp, 'login');
      if (!emailResult.ok) return emailFailureResponse(emailResult);

      return Response.json({
        success: true,
        client_id: client.id,
        email,
        onboarding_route: client.onboarding_complete === true ? '/client-dashboard' : '/client-onboarding',
      });
    }

    if (action === 'resend') {
      const clientId = payload.clientId;
      const email = normalizeEmail(payload.email);
      if (!clientId || !email) {
        return Response.json({ error: 'Client ID and email are required' }, { status: 400 });
      }

      const allClients = await base44.asServiceRole.entities.Clients.list();
      const client = allClients.find((c: any) => c.id === clientId)
        || allClients.find((c: any) => normalizeEmail(c.email || c.client_email) === email);

      if (!client) {
        return Response.json({ error: 'Client session not found. Please register or log in again.' }, { status: 404 });
      }

      const otp = await generateOtp(email);
      await base44.asServiceRole.entities.Clients.update(client.id, {
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      });

      const emailResult = await sendOtpEmail(email, otp, 'login');
      if (!emailResult.ok) return emailFailureResponse(emailResult);
      return Response.json({ success: true });
    }

    if (action === 'verify') {
      const clientId = payload.clientId;
      const email = normalizeEmail(payload.email);
      const otp = normalizeOtp(payload.otp || '');
      if ((!clientId && !email) || !otp) {
        return Response.json({ error: 'Client session and OTP are required' }, { status: 400 });
      }

      const allClients = await base44.asServiceRole.entities.Clients.list();
      const candidates = allClients.filter((c: any) =>
        (clientId && c.id === clientId) || (email && normalizeEmail(c.email || c.client_email) === email)
      );

      const client = candidates.find((c: any) => normalizeEmail(c.email || c.client_email) === email) || candidates[0];
      if (!client) {
        return Response.json({ error: 'Client session not found. Please register or log in again.' }, { status: 404 });
      }

      const verifyEmail = normalizeEmail(client.email || client.client_email || email);
      if (!await isValidOtp(verifyEmail, otp)) {
        return Response.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      if (client.otp_expires_at && new Date(client.otp_expires_at).getTime() < Date.now()) {
        return Response.json({ error: 'OTP code has expired. Please request a new code.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Clients.update(client.id, {
        otp_verified: true,
        otp_code: '',
        otp_expires_at: '',
      });

      return Response.json({
        success: true,
        email: client.email || client.client_email || '',
        onboarding_complete: client.onboarding_complete === true,
      });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[clientOtp Error]:', error.message);
    return Response.json({
      error: 'Client OTP function failed',
      details: error.message,
    }, { status: 500 });
  }
});
