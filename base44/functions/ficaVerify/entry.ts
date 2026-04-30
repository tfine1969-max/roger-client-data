const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const VERIFY_URL = 'https://www.verifynow.co.za/api/external/verify';
const AML_URL = 'https://www.verifynow.co.za/api/external/aml-screening';

async function callVerifyNow(url: string, body: object) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY!,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'ww-' + Date.now(),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!response.ok) return { data: null, error: 'VerifyNow ' + response.status + ': ' + text };
  return { data: json, error: null };
}

Deno.serve(async (req) => {
  const { action, payload } = await req.json();

  if (action === 'ping') {
    return Response.json({ data: { pong: true, key_prefix: API_KEY?.substring(0, 10), verify_url: VERIFY_URL, aml_url: AML_URL }, error: null });
  }

  if (!API_KEY) {
    return Response.json({ data: null, error: 'VERIFYNOW_API_KEY not configured' }, { status: 400 });
  }

  if (action === 'verifyId') {
    const result = await callVerifyNow(VERIFY_URL, {
      reportType: 'said_verification',
      idNumber: payload.id_number,
      mode: 'sandbox',
    });
    return Response.json(result);
  }

  if (action === 'screenAml') {
    const result = await callVerifyNow(AML_URL, {
      mode: 'sandbox',
      name: payload.first_name + ' ' + payload.last_name,
      entity: 0,
      country: 'za',
      dataset: 'all',
    });
    return Response.json(result);
  }

  if (action === 'authenticateDoc') {
    const result = await callVerifyNow(VERIFY_URL, {
      reportType: 'document_verification',
      idNumber: payload.id_number,
      mode: 'sandbox',
    });
    return Response.json(result);
  }

  if (action === 'faceMatch') {
    const result = await callVerifyNow(VERIFY_URL, {
      reportType: 'face_match',
      idNumber: payload.id_number,
      selfieImage: payload.selfie_image,
      mode: 'sandbox',
    });
    return Response.json(result);
  }

  if (action === 'verifyAvs') {
    const result = await callVerifyNow(VERIFY_URL, {
      reportType: 'bank_verification',
      idNumber: payload.id_number,
      accountNumber: payload.account_number,
      mode: 'sandbox',
    });
    return Response.json(result);
  }

  return Response.json({ data: null, error: 'Unknown action: ' + action }, { status: 400 });
});