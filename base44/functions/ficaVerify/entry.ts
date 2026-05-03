const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const VERIFYNOW_MODE = Deno.env.get('VERIFYNOW_MODE') || 'sandbox';
const VERIFYNOW_API_BASE_URL =
  (Deno.env.get('VERIFYNOW_API_BASE_URL') || 'https://www.verifynow.co.za/api/external').replace(/\/+$/, '');
const VERIFYNOW_VERIFY_URL = Deno.env.get('VERIFYNOW_VERIFY_URL') || `${VERIFYNOW_API_BASE_URL}/verify`;
const VERIFYNOW_CIPC_URL = Deno.env.get('VERIFYNOW_CIPC_URL') || `${VERIFYNOW_API_BASE_URL}/cipc`;
const VERIFYNOW_AML_URL = Deno.env.get('VERIFYNOW_AML_URL') || `${VERIFYNOW_API_BASE_URL}/aml-screening`;
const VERIFYNOW_DOCUMENT_URL = Deno.env.get('VERIFYNOW_DOCUMENT_URL') || `${VERIFYNOW_API_BASE_URL}/id-document-verify`;
const VERIFYNOW_LIVENESS_URL = Deno.env.get('VERIFYNOW_LIVENESS_URL') || `${VERIFYNOW_API_BASE_URL}/passive-liveness`;

type VerifyPayload = Record<string, any>;

function idempotencyKey(payload: VerifyPayload = {}) {
  return payload.reference || `ww-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizeId(payload: VerifyPayload = {}) {
  return payload.id_number || payload.idNumber || payload.sa_id_number || payload.identity_number || '';
}

function normalizeBase64(value = '') {
  if (!value) return '';
  const commaIndex = value.indexOf(',');
  return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

function normalizeDocumentType(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('passport')) return 'Passport';
  if (normalized.includes('driver')) return "Driver's License";
  return 'Identity Card';
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchFileAsBase64(fileUrl: string) {
  if (!fileUrl) return '';
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch uploaded document (${response.status})`);
  }
  return arrayBufferToBase64(await response.arrayBuffer());
}

async function getDocumentImageBase64(payload: VerifyPayload = {}) {
  if (payload.front_image_base64) return normalizeBase64(payload.front_image_base64);
  if (payload.image_base64) return normalizeBase64(payload.image_base64);
  if (payload.document_url) return await fetchFileAsBase64(payload.document_url);
  if (payload.file_url) return await fetchFileAsBase64(payload.file_url);
  return '';
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function postJson(url: string, body: VerifyPayload, payload: VerifyPayload = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey(payload),
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
      console.error(`[VerifyNow ${response.status} ${url}]:`, text);
      return { data: null, error: `VerifyNow ${response.status}: ${text}` };
    }

    return { data: json, error: null };
  } catch (err) {
    const message = errorMessage(err);
    console.error('[VerifyNow Error]:', message);
    return { data: null, error: `VerifyNow Error: ${message}` };
  }
}

async function callVerify(body: VerifyPayload, payload: VerifyPayload = {}) {
  return await postJson(VERIFYNOW_VERIFY_URL, body, payload);
}

async function callAml(body: VerifyPayload, payload: VerifyPayload = {}) {
  return await postJson(VERIFYNOW_AML_URL, body, payload);
}

async function callCipc(body: VerifyPayload, payload: VerifyPayload = {}) {
  return await postJson(VERIFYNOW_CIPC_URL, body, payload);
}

async function callDocumentOcr(body: VerifyPayload, payload: VerifyPayload = {}) {
  return await postJson(VERIFYNOW_DOCUMENT_URL, body, payload);
}

async function callLiveness(body: VerifyPayload, payload: VerifyPayload = {}) {
  return await postJson(VERIFYNOW_LIVENESS_URL, body, payload);
}

Deno.serve(async (req) => {
  try {
    const { action, payload = {} } = await req.json();

    if (action === 'ping') {
      return Response.json({
        data: {
          pong: true,
          mode: VERIFYNOW_MODE,
          key_prefix: API_KEY ? API_KEY.substring(0, 10) : 'NOT_SET',
          endpoints: {
            verify: VERIFYNOW_VERIFY_URL,
            cipc: VERIFYNOW_CIPC_URL,
            aml: VERIFYNOW_AML_URL,
            document_ocr: VERIFYNOW_DOCUMENT_URL,
            liveness: VERIFYNOW_LIVENESS_URL,
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

    if (action === 'verifyCipc') {
      const primaryBody = {
        reportType: 'cipc_company_match',
        registration_number: payload.registration_number || payload.registrationNumber,
        sole_prop_id_number: payload.sole_prop_id_number || payload.solePropIdNumber,
        mode: VERIFYNOW_MODE,
      };
      const result = await callCipc(primaryBody, payload);
      return Response.json(result);
    }

    if (action === 'verifyId') {
      const result = await callVerify({
        reportType: 'said_verification',
        idNumber: normalizeId(payload),
        firstName: payload.first_name || payload.firstName,
        lastName: payload.last_name || payload.lastName,
        dateOfBirth: payload.date_of_birth || payload.dateOfBirth,
        mode: VERIFYNOW_MODE,
      }, payload);
      return Response.json(result);
    }

    if (action === 'verifyIdPhoto') {
      const result = await callVerify({
        reportType: 'home_affairs_id_photo',
        idNumber: normalizeId(payload),
        mode: VERIFYNOW_MODE,
      }, payload);
      return Response.json(result);
    }

    if (action === 'screenAml') {
      const result = await callAml({
        mode: VERIFYNOW_MODE,
        name: payload.name,
        entity: payload.entity ?? 0,
        country: payload.country || 'za',
        dataset: payload.dataset || 'all',
        idNumber: normalizeId(payload) || undefined,
        registrationNumber: payload.registration_number || payload.registrationNumber,
        dateOfBirth: payload.date_of_birth || payload.dateOfBirth,
      }, payload);
      return Response.json(result);
    }

    if (action === 'consumerTrace') {
      const result = await callVerify({
        reportType: 'consumer_trace',
        idNumber: normalizeId(payload),
        firstName: payload.first_name || payload.firstName,
        lastName: payload.last_name || payload.lastName,
        streetAddress: payload.street_address || payload.streetAddress,
        suburb: payload.suburb,
        city: payload.city,
        province: payload.province,
        postalCode: payload.postal_code || payload.postalCode,
        mode: VERIFYNOW_MODE,
      }, payload);
      return Response.json(result);
    }

    if (action === 'authenticateDoc') {
      try {
        const frontImageBase64 = await getDocumentImageBase64(payload);
        if (!frontImageBase64) {
          return Response.json(
            { data: null, error: 'Uploaded ID document image is required for document OCR/authentication' },
            { status: 400 }
          );
        }

        const result = await callDocumentOcr({
          bundle: 'id_document_verification',
          mode: VERIFYNOW_MODE,
          front_image_base64: frontImageBase64,
          back_image_base64: payload.back_image_base64 ? normalizeBase64(payload.back_image_base64) : undefined,
          document_type: normalizeDocumentType(payload.document_type || payload.documentType),
          issuing_country: payload.issuing_country || payload.issuingCountry || 'ZAF',
        }, payload);
        return Response.json(result);
      } catch (err) {
        const message = errorMessage(err);
        console.error('[authenticateDoc Error]:', message);
        return Response.json({
          data: null,
          error: `VerifyNow Error: ${message}`,
        });
      }
    }

    if (action === 'faceMatch') {
      const selfieBase64 = normalizeBase64(payload.selfie_image || payload.selfie_image_base64 || '');
      if (!selfieBase64) {
        return Response.json(
          { data: null, error: 'Selfie image is required for face match' },
          { status: 400 }
        );
      }
      const result = await callLiveness({
        mode: VERIFYNOW_MODE,
        image_base64: selfieBase64,
      }, payload);
      if (result.data?.results?.liveness?.score != null) {
        result.data.confidence_score = result.data.results.liveness.score;
        result.data.liveness_status = result.data.results.liveness.status;
      }
      return Response.json(result);
    }

    if (action === 'passiveLiveness') {
      const imageBase64 = normalizeBase64(payload.image_base64 || payload.selfie_image || '');
      if (!imageBase64) {
        return Response.json(
          { data: null, error: 'Image is required for passive liveness' },
          { status: 400 }
        );
      }
      const result = await callLiveness({
        mode: VERIFYNOW_MODE,
        image_base64: imageBase64,
      }, payload);
      return Response.json(result);
    }

    if (action === 'verifyAvs') {
      const result = await callVerify({
        reportType: 'bank_verification',
        idNumber: normalizeId(payload),
        accountNumber: payload.account_number || payload.accountNumber,
        branchCode: payload.branch_code || payload.branchCode,
        accountType: payload.account_type || payload.accountType,
        mode: VERIFYNOW_MODE,
      }, payload);
      return Response.json(result);
    }

    return Response.json(
      { data: null, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message = errorMessage(err);
    console.error('[ficaVerify Error]', err);
    return Response.json(
      { data: null, error: message || 'Internal server error' },
      { status: 500 }
    );
  }
});
