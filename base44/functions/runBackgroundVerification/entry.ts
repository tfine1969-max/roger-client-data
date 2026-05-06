import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const VERIFYNOW_MODE = Deno.env.get('VERIFYNOW_MODE') || 'sandbox';
const BASE = (Deno.env.get('VERIFYNOW_API_BASE_URL') || 'https://www.verifynow.co.za/api/external').replace(/\/+$/, '');
const ADVISOR_EMAIL = Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || '';

function makeRef() {
  return 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
}

function authHeaders() {
  return {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
    'Idempotency-Key': `ww-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

async function post(endpoint, body) {
  const url = `${BASE}/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...body, mode: VERIFYNOW_MODE }),
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    console.log(`[bgVerify] ${endpoint} status=${res.status} body=${text.slice(0, 300)}`);
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.error(`[bgVerify] ${endpoint} network error:`, err.message);
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

async function fetchBase64(fileUrl) {
  if (!fileUrl) return null;
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  } catch { return null; }
}

async function verifyIndividual(client) {
  const checks = {};
  const now = new Date().toISOString();

  // SA ID verification — POST /verify
  if (client.sa_id_number) {
    const r = await post('verify', {
      bundle: 'id_verification',
      idNumber: client.sa_id_number,
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: client.date_of_birth,
    });
    checks.said_verification = {
      status: r.ok ? (r.data?.data?.status || r.data?.status || 'Unknown') : 'Error',
      timestamp: now,
    };
  }

  // Consumer trace — POST /consumer-trace
  if (client.sa_id_number && client.street_address) {
    const r = await post('consumer-trace', {
      idNumber: client.sa_id_number,
      firstName: client.first_name,
      lastName: client.last_name,
      streetAddress: client.street_address,
      suburb: client.suburb,
      city: client.city,
      province: client.province,
      postalCode: client.postal_code,
    });
    checks.consumer_trace = {
      status: r.ok ? (r.data?.data?.status || r.data?.status || 'Unknown') : 'Error',
      timestamp: now,
    };
  }

  // AML/PEP screening — POST /aml-pep
  if (client.first_name && client.last_name) {
    const r = await post('aml-screening', {
      name: `${client.first_name} ${client.last_name}`,
      entity: 0,
      country: 'za',
      dataset: 'all',
    });
    const hits = r.data?.data?.totalHits ?? r.data?.totalHits ?? 0;
    checks.aml_pep = {
      status: r.ok ? (hits > 0 ? 'Match' : 'Clear') : 'Error',
      total_hits: hits,
      timestamp: now,
    };
  }

  // Document OCR — POST /verify-document
  if (client.doc_identity) {
    const frontBase64 = await fetchBase64(client.doc_identity);
    const backBase64 = client.doc_identity_back ? await fetchBase64(client.doc_identity_back) : null;
    if (frontBase64) {
      const r = await post('verify-document', {
        frontImageBase64: frontBase64,
        backImageBase64: backBase64 || undefined,
        documentType: client.identity_type === 'Passport' ? 'Passport' : 'Identity Card',
        issuingCountry: 'ZAF',
        idNumber: client.sa_id_number || undefined,
      });
      checks.document_ocr = {
        status: r.ok ? (r.data?.data?.status || r.data?.status || 'Unknown') : 'Error',
        timestamp: now,
      };
    }
  }

  const idOk = checks.said_verification?.status === 'Success' || checks.said_verification?.status === 'Verified';
  const amlClear = !checks.aml_pep || checks.aml_pep?.status !== 'Match';
  const verificationStatus = (idOk && amlClear) ? 'Verified' : 'Manual Review';

  return {
    fica_reference: makeRef(),
    fica_verified_at: now,
    fica_checks_json: JSON.stringify(checks),
    verification_status: verificationStatus,
    home_affairs_verified: idOk,
    aml_pep_clear: amlClear,
    fica_status: verificationStatus === 'Verified' ? 'Approved' : 'Referred',
  };
}

async function verifyEntity(client, clientType) {
  const checks = {};
  const now = new Date().toISOString();

  // CIPC check — POST /cipc/company
  if (clientType === 'company' && client.registration_number) {
    const r = await post('cipc/company', {
      registrationNumber: client.registration_number,
    });
    checks.cipc = {
      status: r.ok ? (r.data?.data?.status || r.data?.status || 'Unknown') : 'Error',
      timestamp: now,
    };
  }

  const persons = clientType === 'company'
    ? (client.directors_list || [])
    : (client.trustees_list || []);

  const personChecks = [];
  for (const person of persons) {
    if (!person.first_name || !person.id_number) continue;
    const personResult = { name: `${person.first_name} ${person.last_name}` };

    const idR = await post('verify', {
      bundle: 'id_verification',
      idNumber: person.id_number,
      firstName: person.first_name,
      lastName: person.last_name,
      dateOfBirth: person.date_of_birth,
    });
    const idStatus = idR.data?.data?.status || idR.data?.status || 'Unknown';
    personResult.said_verification = { status: idR.ok ? idStatus : 'Error', timestamp: now };

    const amlR = await post('aml-screening', {
      name: `${person.first_name} ${person.last_name}`,
      entity: 0,
      country: 'za',
      dataset: 'all',
    });
    const hits = amlR.data?.data?.totalHits ?? amlR.data?.totalHits ?? 0;
    personResult.aml_pep = { status: amlR.ok ? (hits > 0 ? 'Match' : 'Clear') : 'Error', total_hits: hits, timestamp: now };

    personChecks.push(personResult);
  }

  checks.persons = personChecks;

  const cipcOk = !checks.cipc || ['Success', 'Active', 'Verified'].includes(checks.cipc.status);
  const personsOk = personChecks.length === 0 || personChecks.every(p =>
    ['Success', 'Verified'].includes(p.said_verification?.status) && p.aml_pep?.status !== 'Match'
  );
  const verificationStatus = (cipcOk && personsOk) ? 'Verified' : 'Manual Review';

  return {
    fica_reference: makeRef(),
    fica_verified_at: now,
    fica_checks_json: JSON.stringify(checks),
    verification_status: verificationStatus,
    entity_aml_clear: personsOk,
    cipc_verified: cipcOk,
    fica_status: verificationStatus === 'Verified' ? 'Approved' : 'Referred',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const client_id = body.client_id;
    const client_type = body.client_type;

    // Diagnostic ping
    if (client_id === '__ping__') {
      return Response.json({
        pong: true,
        mode: VERIFYNOW_MODE,
        api_key_set: !!API_KEY,
        api_key_prefix: API_KEY ? API_KEY.substring(0, 10) : 'NOT_SET',
        base_url: BASE,
      });
    }

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    const clients = await base44.asServiceRole.entities.Clients.list();
    const client = clients.find(c => c.id === client_id);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    console.log(`[bgVerify] Starting for client ${client_id} type=${client_type}`);

    const type = client_type || client.client_type || 'Natural Person';
    let verificationData;

    if (type === 'Company') {
      verificationData = await verifyEntity(client, 'company');
    } else if (type === 'Trust') {
      verificationData = await verifyEntity(client, 'trust');
    } else {
      verificationData = await verifyIndividual(client);
    }

    await base44.asServiceRole.entities.Clients.update(client_id, verificationData);
    console.log(`[bgVerify] Done: ${verificationData.verification_status} ref=${verificationData.fica_reference}`);

    if (verificationData.fica_status === 'Referred' && ADVISOR_EMAIL) {
      const clientName = client.full_name || client.entity_name || client.email || 'Unknown';
      await base44.functions.invoke('sendTransactionalEmail', {
        to: ADVISOR_EMAIL,
        subject: `Verification Referred - ${clientName}`,
        text: `Background verification for ${clientName} (${type}) returned: Referred\n\nFICA Reference: ${verificationData.fica_reference}\nTimestamp: ${verificationData.fica_verified_at}\n\nLog in to the WealthWorks Advisor Portal to review.`,
      });
    }

    return Response.json({
      success: true,
      verification_status: verificationData.verification_status,
      fica_reference: verificationData.fica_reference,
    });
  } catch (err) {
    console.error('[bgVerify] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});