import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://verifynow.co.za/api/v1';
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

    console.log(`[ficaVerify] Received action: ${action}`, { payload });

    if (!action || !payload) {
      const errMsg = 'action and payload are required';
      console.error(`[ficaVerify] ${errMsg}`);
      return Response.json({ data: null, error: errMsg }, { status: 400 });
    }

    const apiKey = Deno.env.get('VERIFYNOW_API_KEY');
    if (!apiKey) {
      const errMsg = 'VERIFYNOW_API_KEY secret not configured';
      console.error(`[ficaVerify] ${errMsg}`);
      throw new Error(errMsg);
    }

    // TEST ACTION: ping — returns API key prefix and base URL without calling external API
    if (action === 'ping') {
      const keyPrefix = apiKey.substring(0, 6);
      console.log(`[ficaVerify] Ping test: key prefix = ${keyPrefix}, BASE_URL = ${BASE_URL}`);
      return Response.json({
        data: { apiKeyPrefix: keyPrefix, baseUrl: BASE_URL, timestamp: new Date().toISOString() },
        error: null,
      });
    }

    const endpoint = ENDPOINTS[action];
    if (!endpoint) {
      const errMsg = `Unknown action: ${action}`;
      console.error(`[ficaVerify] ${errMsg}`);
      return Response.json({ data: null, error: errMsg }, { status: 400 });
    }

    const url = `${BASE_URL}${endpoint}`;
    console.log(`[ficaVerify] Fetching ${url} with action=${action}`);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log(`[ficaVerify] Fetch succeeded: status=${response.status}`);
    } catch (fetchErr) {
      const errMsg = `Fetch failed for ${action}: ${fetchErr.message}`;
      console.error(`[ficaVerify] ${errMsg}`, { error: fetchErr });
      return Response.json({ data: null, error: errMsg }, { status: 500 });
    }

    let responseBody;
    try {
      responseBody = await response.json();
      console.log(`[ficaVerify] Response JSON parsed successfully`, { data: responseBody });
    } catch (parseErr) {
      // If JSON parse fails, try to read as text
      try {
        const textBody = await response.text();
        console.error(`[ficaVerify] Failed to parse JSON, response as text: ${textBody}`);
        const errMsg = `API returned non-JSON response (${response.status}): ${textBody}`;
        return Response.json({ data: null, error: errMsg }, { status: 500 });
      } catch (textErr) {
        const errMsg = `Failed to parse response: ${parseErr.message}`;
        console.error(`[ficaVerify] ${errMsg}`);
        return Response.json({ data: null, error: errMsg }, { status: 500 });
      }
    }

    if (!response.ok) {
      const errMsg = `API error ${response.status}: ${responseBody.message || responseBody.error || JSON.stringify(responseBody)}`;
      console.error(`[ficaVerify] ${errMsg}`);
      return Response.json({ data: null, error: errMsg }, { status: response.status });
    }

    console.log(`[ficaVerify] Success for action=${action}`);
    return Response.json({ data: responseBody, error: null });
  } catch (error) {
    const errMsg = `Unexpected error: ${error.message || error}`;
    console.error(`[ficaVerify] ${errMsg}`, { error });
    return Response.json({ data: null, error: errMsg }, { status: 500 });
  }
});