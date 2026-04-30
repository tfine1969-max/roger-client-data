const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');

async function callVerify(body) {
  const url = 'https://www.verifynow.co.za/api/external/verify';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': `ww-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      console.error(`[callVerify ${response.status}]:`, text);
      return { data: null, error: `VerifyNow ${response.status}: ${text}` };
    }

    return { data: json, error: null };
  } catch (err) {
    console.error('[callVerify Error]:', err.message);
    return { data: null, error: `VerifyNow Error: ${err.message}` };
  }
}

async function callAml(body) {
  const url = 'https://www.verifynow.co.za/aml-screening';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': `ww-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      console.error(`[callAml ${response.status}]:`, text);
      return { data: null, error: `VerifyNow ${response.status}: ${text}` };
    }

    return { data: json, error: null };
  } catch (err) {
    console.error('[callAml Error]:', err.message);
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
          endpoints: {
            verify: 'https://www.verifynow.co.za/api/external/verify',
            aml: 'https://www.verifynow.co.za/aml-screening',
          },
        },
        error: null,
      });
    }

    if (!API_KEY) {
      return Response.json(
        { data: null, error: 'VERIFYNOW_API_KEY not configured' },
        { status: 400 }
      );
    }

    if (action === 'verifyId') {
      const result = await callVerify({
        reportType: 'said_verification',
        idNumber: payload.id_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'verifyIdPhoto') {
      const result = await callVerify({
        reportType: 'home_affairs_id_photo',
        idNumber: payload.id_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'screenAml') {
      const result = await callAml({
        mode: 'sandbox',
        name: payload.name,
        entity: 0,
        country: 'za',
        dataset: 'all',
      });
      return Response.json(result);
    }

    if (action === 'consumerTrace') {
      const result = await callVerify({
        reportType: 'consumer_trace',
        idNumber: payload.id_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    if (action === 'authenticateDoc') {
      const url = 'https://www.verifynow.co.za/api/external/verify';
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': `ww-${Date.now()}`,
          },
          body: JSON.stringify({
            bundle: 'id_document_verification',
            mode: 'sandbox',
            front_image_base64: payload.front_image_base64,
            document_type: payload.document_type || 'Identity Card',
            issuing_country: 'ZAF',
          }),
        });

        const text = await response.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }

        if (!response.ok) {
          console.error(`[authenticateDoc ${response.status}]:`, text);
          return Response.json({
            data: null,
            error: `VerifyNow ${response.status}: ${text}`,
          });
        }

        return Response.json({ data: json, error: null });
      } catch (err) {
        console.error('[authenticateDoc Error]:', err.message);
        return Response.json({
          data: null,
          error: `VerifyNow Error: ${err.message}`,
        });
      }
    }

    if (action === 'verifyAvs') {
      const result = await callVerify({
        reportType: 'bank_verification',
        idNumber: payload.id_number,
        accountNumber: payload.account_number,
        mode: 'sandbox',
      });
      return Response.json(result);
    }

    return Response.json(
      { data: null, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('[ficaVerify Error]', err);
    return Response.json(
      { data: null, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
});