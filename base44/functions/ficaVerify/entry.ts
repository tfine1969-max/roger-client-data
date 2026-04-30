const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const BASE_URL = 'https://www.verifynow.co.za/api/external/verify';

Deno.serve(async (req) => {
  const { action, payload } = await req.json();

  if (action === 'ping') {
    return Response.json({ data: { pong: true, key_prefix: API_KEY?.substring(0, 10), url: BASE_URL }, error: null });
  }

  if (!API_KEY) {
    return Response.json({ data: null, error: 'VERIFYNOW_API_KEY not configured' }, { status: 400 });
  }

  const reportTypeMap = {
    verifyId:       { reportType: 'said_verification' },
    screenAml:      { reportType: 'aml_screening' },
    authenticateDoc:{ reportType: 'document_verification' },
    faceMatch:      { reportType: 'face_match' },
    verifyAvs:      { reportType: 'bank_verification' },
  };

  const mapping = reportTypeMap[action];
  if (!mapping) {
    return Response.json({ data: null, error: 'Unknown action: ' + action }, { status: 400 });
  }

  const body = {
    reportType: mapping.reportType,
    idNumber: payload.id_number,
    mode: 'sandbox',
    ...(payload.selfie_image && { selfieImage: payload.selfie_image }),
    ...(payload.account_number && { accountNumber: payload.account_number }),
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'ww-' + Date.now(),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!response.ok) {
      return Response.json({ data: null, error: 'VerifyNow error ' + response.status + ': ' + text }, { status: response.status });
    }

    return Response.json({ data: json, error: null });
  } catch (err) {
    return Response.json({ data: null, error: 'Fetch failed: ' + err.message }, { status: 500 });
  }
});