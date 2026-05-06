import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
// Map legacy 'live' value to 'production' as required by the VerifyNow API
const _rawMode = Deno.env.get('VERIFYNOW_MODE') || 'sandbox';
const VERIFYNOW_MODE = _rawMode === 'live' ? 'production' : _rawMode;
const BASE = (Deno.env.get('VERIFYNOW_API_BASE_URL') || 'https://www.verifynow.co.za/api/external').replace(/\/+$/, '');

function uid() {
  return `ww-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function authHeaders() {
  return {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': uid(),
  };
}

function normalizeId(payload = {}) {
  return payload.id_number || payload.idNumber || payload.sa_id_number || payload.identity_number || '';
}

function normalizeBase64(value = '') {
  if (!value) return '';
  const i = value.indexOf(',');
  return value.startsWith('data:') && i >= 0 ? value.slice(i + 1) : value;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function fetchBase64(url) {
  if (!url) return '';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch document (${res.status})`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function getImageBase64(payload, frontKey = 'document_url', base64Key = 'front_image_base64') {
  if (payload[base64Key]) return normalizeBase64(payload[base64Key]);
  if (payload.image_base64) return normalizeBase64(payload.image_base64);
  if (payload[frontKey]) return await fetchBase64(payload[frontKey]);
  if (payload.file_url) return await fetchBase64(payload.file_url);
  return '';
}

async function post(endpoint, body) {
  const url = `${BASE}/${endpoint}`;
  console.log(`[ficaVerify] POST ${url}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...body, mode: VERIFYNOW_MODE }),
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) {
      console.error(`[ficaVerify] ${endpoint} ${res.status}:`, text.slice(0, 500));
      return { data: null, error: `VerifyNow ${res.status}: ${text}` };
    }
    console.log(`[ficaVerify] ${endpoint} OK`);
    return { data: json, error: null };
  } catch (err) {
    console.error(`[ficaVerify] ${endpoint} network error:`, err.message);
    return { data: null, error: `Network error: ${err.message}` };
  }
}

Deno.serve(async (req) => {
  try {
    const { action, payload = {} } = await req.json();

    // Diagnostic ping - no auth needed
    if (action === 'ping') {
      return Response.json({
        data: {
          pong: true,
          mode: VERIFYNOW_MODE,
          key_prefix: API_KEY ? API_KEY.substring(0, 10) : 'NOT_SET',
          base: BASE,
          endpoints: {
            verify: `${BASE}/verify`,
            consumer_trace: `${BASE}/consumer-trace`,
            aml_pep: `${BASE}/aml-pep`,
            verify_document: `${BASE}/verify-document`,
            face_match: `${BASE}/face-match`,
            cipc_company: `${BASE}/cipc/company`,
          },
        },
        error: null,
      });
    }

    if (!API_KEY) {
      return Response.json({ data: null, error: 'VERIFYNOW_API_KEY not configured' }, { status: 400 });
    }

    // POST /verify — SA ID verification
    if (action === 'verifyId') {
      const result = await post('verify', {
        bundle: 'id_verification',
        idNumber: normalizeId(payload),
        firstName: payload.first_name || payload.firstName,
        lastName: payload.last_name || payload.lastName,
        dateOfBirth: payload.date_of_birth || payload.dateOfBirth,
      });
      return Response.json(result);
    }

    // POST /consumer-trace — address + employment trace
    if (action === 'consumerTrace') {
      const result = await post('consumer-trace', {
        idNumber: normalizeId(payload),
        firstName: payload.first_name || payload.firstName,
        lastName: payload.last_name || payload.lastName,
        streetAddress: payload.street_address || payload.streetAddress,
        suburb: payload.suburb,
        city: payload.city,
        province: payload.province,
        postalCode: payload.postal_code || payload.postalCode,
      });
      return Response.json(result);
    }

    // POST /aml-pep — AML/PEP/sanctions screening
    if (action === 'screenAml') {
      const result = await post('aml-pep', {
        name: payload.name,
        entity: payload.entity ?? 0,
        country: payload.country || 'za',
        dataset: payload.dataset || 'all',
        idNumber: normalizeId(payload) || undefined,
        dateOfBirth: payload.date_of_birth || payload.dateOfBirth,
      });
      return Response.json(result);
    }

    // POST /verify-document — ID document OCR + fraud signals
    if (action === 'authenticateDoc') {
      const frontImageBase64 = await getImageBase64(payload, 'document_url', 'front_image_base64');
      if (!frontImageBase64) {
        return Response.json({ data: null, error: 'Front document image required' }, { status: 400 });
      }
      const backImageBase64 = payload.back_document_url
        ? await fetchBase64(payload.back_document_url)
        : (payload.back_image_base64 ? normalizeBase64(payload.back_image_base64) : undefined);

      const docType = String(payload.document_type || '').toLowerCase().includes('passport') ? 'Passport' : 'Identity Card';
      const result = await post('verify-document', {
        frontImageBase64,
        backImageBase64: backImageBase64 || undefined,
        documentType: docType,
        issuingCountry: payload.issuing_country || 'ZAF',
        idNumber: normalizeId(payload) || undefined,
      });
      return Response.json(result);
    }

    // POST /face-match — selfie-to-ID biometric match
    if (action === 'faceMatch') {
      const selfieBase64 = normalizeBase64(payload.selfie_image || payload.selfie_image_base64 || '');
      if (!selfieBase64) {
        return Response.json({ data: null, error: 'Selfie image required' }, { status: 400 });
      }
      const result = await post('face-match', {
        selfieBase64,
        idNumber: normalizeId(payload) || undefined,
      });
      if (result.data?.confidenceScore != null) {
        result.data.confidence_score = result.data.confidenceScore;
      }
      return Response.json(result);
    }

    // POST /cipc/company — company registration check
    if (action === 'verifyCipc') {
      const result = await post('cipc/company', {
        registrationNumber: payload.registration_number || payload.registrationNumber,
      });
      return Response.json(result);
    }

    // POST /bank-account-verification — AVS
    if (action === 'verifyAvs') {
      const result = await post('bank-account-verification', {
        idNumber: normalizeId(payload),
        accountNumber: payload.account_number || payload.accountNumber,
        branchCode: payload.branch_code || payload.branchCode,
        accountType: payload.account_type || payload.accountType,
      });
      return Response.json(result);
    }

    return Response.json({ data: null, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[ficaVerify Error]', err.message);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
});