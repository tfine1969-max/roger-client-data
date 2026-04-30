import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://sandbox.verifynow.co.za/v1';
const ENDPOINTS = {
  verifyId: '/identity/verify',
  screenAml: '/aml/screen',
  authenticateDoc: '/document/authenticate',
  faceMatch: '/biometric/face-match',
  verifyAvs: '/banking/avs',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload } = await req.json();

    if (!action || !payload) {
      return Response.json({ data: null, error: 'action and payload are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('VERIFYNOW_API_KEY');
    if (!apiKey) {
      throw new Error('VERIFYNOW_API_KEY secret not configured');
    }

    const endpoint = ENDPOINTS[action];
    if (!endpoint) {
      return Response.json({ data: null, error: `Unknown action: ${action}` }, { status: 400 });
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      return Response.json({
        data: null,
        error: responseJson.message || responseJson.error || `API error: ${response.status}`,
      });
    }

    return Response.json({ data: responseJson, error: null });
  } catch (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 });
  }
});