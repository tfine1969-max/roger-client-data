import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const step = body.step;

    if (step === 'register') {
      // Simulate Client Registration: create Clients record
      const clientRecord = await base44.asServiceRole.entities.Clients.create({
        email: 'testflow@example.com',
        mobile_number: '+27791234567',
        client_status: 'Draft',
        otp_verified: false
      });
      
      return Response.json({
        step: 'register',
        clientId: clientRecord.id,
        email: clientRecord.email,
        otpVerified: clientRecord.otp_verified
      });
    }

    if (step === 'verify_otp') {
      // Simulate OTP Verification: update otp_verified to true
      const clientId = body.clientId;
      const updated = await base44.asServiceRole.entities.Clients.update(clientId, {
        otp_verified: true
      });
      
      return Response.json({
        step: 'verify_otp',
        clientId: updated.id,
        otpVerified: updated.otp_verified
      });
    }

    if (step === 'onboard') {
      // Simulate Client Onboarding: update Clients record with profile data
      const clientId = body.clientId;
      const updated = await base44.asServiceRole.entities.Clients.update(clientId, {
        client_type: 'Natural Person',
        identity_type: 'SA ID',
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        sa_id_number: '9001015555555',
        date_of_birth: '1990-01-01',
        residential_address: '123 Test Street',
        client_status: 'Onboarded'
      });
      
      return Response.json({
        step: 'onboard',
        clientId: updated.id,
        clientStatus: updated.client_status,
        clientType: updated.client_type
      });
    }

    if (step === 'fetch') {
      // Fetch current client record state
      const clientId = body.clientId;
      const client = await base44.asServiceRole.entities.Clients.list('-updated_date', 1, { id: clientId });
      if (client.length > 0) {
        return Response.json({
          step: 'fetch',
          client: client[0]
        });
      }
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    return Response.json({ error: 'Unknown step' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});