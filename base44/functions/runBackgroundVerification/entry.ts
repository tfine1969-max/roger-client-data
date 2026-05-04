import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFYNOW_API_KEY = Deno.env.get('VERIFYNOW_API_KEY');
const VERIFYNOW_MODE = Deno.env.get('VERIFYNOW_MODE') || 'test';
const VERIFYNOW_API_BASE = (Deno.env.get('VERIFYNOW_API_BASE_URL') || 'https://www.verifynow.co.za/api/external').replace(/\/+$/, '');
const ADVISOR_EMAIL = Deno.env.get('ADVISOR_NOTIFICATION_EMAIL') || '';

function makeRef() {
  return 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
}

async function postVerify(endpoint, body) {
  const url = `${VERIFYNOW_API_BASE}/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': VERIFYNOW_API_KEY || '',
        'Content-Type': 'application/json',
        'Idempotency-Key': `ww-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify({ ...body, mode: VERIFYNOW_MODE }),
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch (_e) { json = { raw: text }; }
    console.log(`[bgVerify] ${endpoint} status=${res.status}`);
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
  } catch (_e) { return null; }
}

async function verifyIndividual(client) {
  const checks = {};
  const now = new Date().toISOString();

  if (client.sa_id_number) {
    const r = await postVerify('verify', {
      reportType: 'said_verification',
      idNumber: client.sa_id_number,
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: client.date_of_birth,
    });
    checks.said_verification = {
      status: r.ok ? (r.data?.results?.said_verification?.Status || 'Unknown') : 'Error',
      timestamp: now,
    };
  }

  if (client.sa_id_number && client.street_address) {
    const r = await postVerify('verify', {
      reportType: 'consumer_trace',
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
      status: r.ok ? (r.data?.results?.consumer_trace?.Status || 'Unknown') : 'Error',
      timestamp: now,
    };
  }

  if (client.first_name && client.last_name) {
    const r = await postVerify('aml-screening', {
      name: `${client.first_name} ${client.last_name}`,
      entity: 0,
      country: 'za',
      dataset: 'all',
    });
    checks.aml_pep = {
      status: r.ok ? ((r.data?.totalHits > 0) ? 'Match' : 'Clear') : 'Error',
      total_hits: r.data?.totalHits || 0,
      timestamp: now,
    };
  }

  if (client.doc_identity) {
    const frontBase64 = await fetchBase64(client.doc_identity);
    const backBase64 = client.doc_identity_back ? await fetchBase64(client.doc_identity_back) : null;
    if (frontBase64) {
      const r = await postVerify('id-document-verify', {
        bundle: 'id_document_verification',
        front_image_base64: frontBase64,
        back_image_base64: backBase64 || undefined,
        document_type: client.identity_type === 'Passport' ? 'Passport' : 'Identity Card',
        issuing_country: 'ZAF',
      });
      checks.document_ocr = {
        status: r.ok ? (r.data?.results?.document_verification?.Status || r.data?.results?.id_verification?.Status || 'Unknown') : 'Error',
        timestamp: now,
      };
    }
  }

  const idOk = checks.said_verification?.status === 'Success';
  const amlClear = !checks.aml_pep || checks.aml_pep?.status !== 'Match';
  const verificationStatus = (idOk && amlClear) ? 'Verified' : 'Referred';

  return {
    fica_reference: makeRef(),
    fica_verified_at: now,
    fica_checks_json: JSON.stringify(checks),
    verification_status: verificationStatus,
    home_affairs_verified: idOk,
    aml_pep_clear: checks.aml_pep?.status === 'Clear',
    fica_status: verificationStatus === 'Verified' ? 'Approved' : 'Referred',
  };
}

async function verifyEntity(client, clientType) {
  const checks = {};
  const now = new Date().toISOString();

  if (clientType === 'company' && client.registration_number) {
    const r = await postVerify('cipc', {
      reportType: 'cipc_company_match',
      registration_number: client.registration_number,
    });
    const cipcData = r.data?.results || {};
    const cipcMatch = cipcData.cipc_company_match || cipcData.cipc_verification || {};
    checks.cipc = {
      status: r.ok ? (cipcMatch.Status || 'Unknown') : 'Error',
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

    const idR = await postVerify('verify', {
      reportType: 'said_verification',
      idNumber: person.id_number,
      firstName: person.first_name,
      lastName: person.last_name,
      dateOfBirth: person.date_of_birth,
    });
    personResult.said_verification = {
      status: idR.ok ? (idR.data?.results?.said_verification?.Status || 'Unknown') : 'Error',
      timestamp: now,
    };

    const amlR = await postVerify('aml-screening', {
      name: `${person.first_name} ${person.last_name}`,
      entity: 0,
      country: 'za',
      dataset: 'all',
    });
    personResult.aml_pep = {
      status: amlR.ok ? ((amlR.data?.totalHits > 0) ? 'Match' : 'Clear') : 'Error',
      total_hits: amlR.data?.totalHits || 0,
      timestamp: now,
    };

    personChecks.push(personResult);
  }

  checks.persons = personChecks;

  const cipcOk = !checks.cipc || ['Success', 'Active'].includes(checks.cipc.status);
  const personsOk = personChecks.every(p =>
    p.said_verification?.status === 'Success' && p.aml_pep?.status !== 'Match'
  );
  const verificationStatus = (cipcOk && personsOk) ? 'Verified' : 'Referred';

  return {
    fica_reference: makeRef(),
    fica_verified_at: now,
    fica_checks_json: JSON.stringify(checks),
    verification_status: verificationStatus,
    entity_aml_clear: personsOk,
    cipc_verified: ['Success', 'Active'].includes(checks.cipc?.status),
    fica_status: verificationStatus === 'Verified' ? 'Approved' : 'Referred',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const client_id = body.client_id;
    const client_type = body.client_type;

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