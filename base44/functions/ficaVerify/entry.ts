import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://www.verifynow.co.za/api/external/';

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

    // PING ACTION: return metadata without calling external API
    if (action === 'ping') {
      const keyPrefix = apiKey.substring(0, 10);
      console.log(`[ficaVerify] Ping test: key prefix = ${keyPrefix}, BASE_URL = ${BASE_URL}`);
      return Response.json({
        data: { pong: true, key_prefix: keyPrefix, url: BASE_URL },
        error: null,
      });
    }

    // Build request body based on action type
    let requestBody;

    if (action === 'verifyId') {
      requestBody = {
        reportType: 'said_verification',
        idNumber: payload.id_number,
        mode: 'sandbox',
      };
    } else if (action === 'homeAffairsPhoto') {
      requestBody = {
        reportType: 'home_affairs_id_photo',
        idNumber: payload.id_number,
        mode: 'sandbox',
      };
    } else if (action === 'screenAml') {
      requestBody = {
        reportType: 'aml_screening',
        idNumber: payload.id_number,
        mode: 'sandbox',
      };
    } else if (action === 'authenticateDoc') {
      requestBody = {
        reportType: 'document_verification',
        idNumber: payload.id_number,
        mode: 'sandbox',
      };
    } else if (action === 'faceMatch') {
      requestBody = {
        reportType: 'face_match',
        idNumber: payload.id_number,
        selfieImage: payload.selfie_image,
        mode: 'sandbox',
      };
    } else if (action === 'verifyAvs') {
      requestBody = {
        reportType: 'bank_verification',
        idNumber: payload.id_number,
        accountNumber: payload.account_number,
        mode: 'sandbox',
      };
    } else {
      const errMsg = `Unknown action: ${action}`;
      console.error(`[ficaVerify] ${errMsg}`);
      return Response.json({ data: null, error: errMsg }, { status: 400 });
    }

    console.log(`[ficaVerify] Calling ${BASE_URL} with action=${action}`, { requestBody });

    let response;
    try {
      response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': `unique-request-id-${Date.now()}`,
        },
        body: JSON.stringify(requestBody),
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