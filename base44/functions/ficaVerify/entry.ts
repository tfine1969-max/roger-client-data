const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const BASE_URL = 'https://www.verifynow.co.za';

async function callVerifyNow(endpoint, body) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `ww-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let responseJson = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`[VerifyNow ${response.status}] ${endpoint}:`, responseText);
      return {
        data: null,
        error: `VerifyNow ${response.status}: ${responseText}`,
      };
    }

    return { data: responseJson, error: null };
  } catch (err) {
    console.error(`[VerifyNow Error] ${endpoint}:`, err.message);
    return { data: null, error: `VerifyNow Error: ${err.message}` };
  }
}

Deno.serve(async (req) => {
  try {
    const { action, payload } = await req.json();

    if (action === 'ping') {
      return Response.json({
        data: {
          pong: true,
          key_prefix: API_KEY ? API_KEY.substring(0, 10) : 'NOT_SET',
          auth: 'Bearer',
          base_url: BASE_URL,
        },
        error: null,
      });
    }

    if (!API_KEY) {
      return Response.json({
        data: null,
        error: 'VERIFYNOW_API_KEY not configured',
      }, { status: 400 });
    }

    if (action === 'verifyId') {
      const result = await callVerifyNow('/verify', {
        idNumber: payload.id_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'screenAml') {
      const result = await callVerifyNow('/aml-pep', {
        name: `${payload.first_name} ${payload.last_name}`,
        idNumber: payload.id_number,
        country: 'ZA',
        dataset: 'all',
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'authenticateDoc') {
      const result = await callVerifyNow('/verify-document', {
        idNumber: payload.id_number,
        documentType: payload.document_type || 'sa_id',
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'faceMatch') {
      const result = await callVerifyNow('/face-match', {
        idNumber: payload.id_number,
        selfieImage: payload.selfie_image,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'verifyAvs') {
      const result = await callVerifyNow('/bank-account-verification', {
        idNumber: payload.id_number,
        accountNumber: payload.account_number,
        branchCode: payload.branch_code,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'consumerTrace') {
      const result = await callVerifyNow('/consumer-trace', {
        idNumber: payload.id_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    return Response.json({
      data: null,
      error: `Unknown action: ${action}`,
    }, { status: 400 });
  } catch (err) {
    console.error('[ficaVerify Error]', err);
    return Response.json({
      data: null,
      error: err.message || 'Internal server error',
    }, { status: 500 });
  }
});