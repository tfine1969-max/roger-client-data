import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizeEmail = (email = '') => email.toLowerCase().trim();

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

const sendOtpEmail = async (base44: any, email: string, otp: string, mode = 'onboarding') => {
  const subject = mode === 'login'
    ? 'Your WealthWorks login verification code'
    : 'Your WealthWorks verification code';

  const text = mode === 'login'
    ? `Your WealthWorks verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this code, please ignore this email.`
    : `Your WealthWorks onboarding verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`;

  return base44.asServiceRole.functions.invoke('sendTransactionalEmail', {
    to: email,
    subject,
    text,
  });
};

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
      const otp = generateOtp();
      const updateData = {
        email,
        mobile_number: mobile,
        client_type: clientTypeMap[entityType as keyof typeof clientTypeMap] || 'Natural Person',
        client_status: existing?.client_status || 'Draft',
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      };

      const client = existing
        ? await base44.asServiceRole.entities.Clients.update(existing.id, updateData)
        : await base44.asServiceRole.entities.Clients.create(updateData);

      await sendOtpEmail(base44, email, otp, 'onboarding');

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

      const otp = generateOtp();
      await base44.asServiceRole.entities.Clients.update(client.id, {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      });

      await sendOtpEmail(base44, email, otp, 'login');

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

      const otp = generateOtp();
      await base44.asServiceRole.entities.Clients.update(clientId, {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp_verified: false,
      });

      await sendOtpEmail(base44, email, otp, 'login');
      return Response.json({ success: true });
    }

    if (action === 'verify') {
      const clientId = payload.clientId;
      const otp = String(payload.otp || '').trim();
      if (!clientId || !otp) {
        return Response.json({ error: 'Client ID and OTP are required' }, { status: 400 });
      }

      const allClients = await base44.asServiceRole.entities.Clients.list();
      const client = allClients.find((c: any) => c.id === clientId);
      if (!client?.otp_code || client.otp_code !== otp) {
        return Response.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      if (client.otp_expires_at && new Date(client.otp_expires_at).getTime() < Date.now()) {
        return Response.json({ error: 'OTP code has expired. Please request a new code.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Clients.update(clientId, {
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});
