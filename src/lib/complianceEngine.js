import { base44 } from '@/api/base44Client';

export const REGISTER_TYPES = [
  'CDD',
  'EDD',
  'FICA_Exception',
  'STR',
  'TPR',
  'Sanctions',
  'FICA_Training',
  'RMCP_Review',
  'Advice',
  'Product_Replacement',
  'Complaint',
  'Compliance_Breach',
  'Conflict_of_Interest',
  'Gift_Register',
  'CPD',
  'Representative',
  'Debarment',
  'POPIA_Breach',
  'Mandate',
  'Third_Party',
  'Audit',
  'BRA',
];

export const CATEGORY_BY_REGISTER = {
  CDD: 'FICA',
  EDD: 'FICA',
  FICA_Exception: 'FICA',
  STR: 'FICA',
  TPR: 'FICA',
  Sanctions: 'FICA',
  FICA_Training: 'FICA',
  RMCP_Review: 'FICA',
  Advice: 'FAIS',
  Product_Replacement: 'FAIS',
  Complaint: 'FAIS',
  Compliance_Breach: 'Internal',
  Conflict_of_Interest: 'FAIS',
  Gift_Register: 'FAIS',
  CPD: 'FAIS',
  Representative: 'FAIS',
  Debarment: 'FAIS',
  POPIA_Breach: 'POPIA',
  Mandate: 'FAIS',
  Third_Party: 'Internal',
  Audit: 'Internal',
  BRA: 'FICA',
};

export const clientDisplayName = (client = {}) =>
  client.full_name ||
  client.entity_name ||
  client.trust_name ||
  `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
  client.client_name ||
  'Client';

export const normalizeRisk = (value) => {
  const risk = String(value || '').toLowerCase();
  if (risk.includes('high') || risk.includes('prohibited')) return 'High';
  if (risk.includes('medium') || risk.includes('moderate')) return 'Medium';
  return 'Low';
};

export const daysOpen = (entry = {}) => {
  const raw = entry.created_date || entry.complaint_date || entry.date || entry.sent_at;
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const auditEntry = (action, actor, notes = '', previousStatus = '', newStatus = '') => ({
  action,
  actor: actor?.email || actor?.full_name || actor || 'System',
  timestamp: new Date().toISOString(),
  notes,
  previous_status: previousStatus,
  new_status: newStatus,
});

export async function upsertComplianceRegister(entry, actor = null) {
  const now = new Date().toISOString();
  const sourceKey = entry.source_key;
  if (sourceKey) {
    const existing = await base44.entities.Compliance_Registers.filter({ source_key: sourceKey });
    if (existing?.length) return existing[0];
  }

  const status =
    entry.status ||
    (entry.risk_level === 'High' || entry.register_type === 'STR' ? 'Escalated' : 'Open');

  return base44.entities.Compliance_Registers.create({
    ...entry,
    category: entry.category || CATEGORY_BY_REGISTER[entry.register_type] || 'Internal',
    status,
    risk_level: entry.risk_level || 'Low',
    documents: entry.documents || [],
    audit_trail: [
      auditEntry('Created', actor, entry.source_event || 'Compliance register entry created', '', status),
    ],
    created_by: actor?.email || entry.created_by || 'System',
    last_updated: now,
  });
}

export async function updateComplianceRegister(entry, updates, actor = null, notes = '') {
  const previousStatus = entry.status || '';
  const newStatus = updates.status || previousStatus;
  const auditTrail = Array.isArray(entry.audit_trail) ? entry.audit_trail : [];
  const next = {
    ...updates,
    last_updated: new Date().toISOString(),
    audit_trail: [
      ...auditTrail,
      auditEntry(updates.audit_action || 'Updated', actor, notes, previousStatus, newStatus),
    ],
  };
  delete next.audit_action;
  return base44.entities.Compliance_Registers.update(entry.id, next);
}

export async function createOnboardingComplianceEntries(client, actor = null) {
  if (!client?.id) return [];
  const name = clientDisplayName(client);
  const advisor = client.advisor_name || client.linked_advisor || 'Trevor Fine';
  const risk = normalizeRisk(client.rmcp_risk_band || client.fica_risk_band || client.risk_profile);
  const entries = [
    {
      register_type: 'CDD',
      linked_client_id: client.id,
      linked_client_name: name,
      linked_advisor: advisor,
      risk_level: risk,
      description: `CDD record opened for ${name}.`,
      action_required: client.fica_status === 'Approved' ? 'Maintain evidence and review on trigger events.' : 'Review FICA status and outstanding documents.',
      source_event: 'Client onboarding',
      source_key: `onboarding:${client.id}:CDD`,
    },
    {
      register_type: 'RMCP_Review',
      linked_client_id: client.id,
      linked_client_name: name,
      linked_advisor: advisor,
      risk_level: risk,
      status: risk === 'High' ? 'Escalated' : 'Open',
      description: `RMCP risk rating captured for ${name}.`,
      action_required: risk === 'High' ? 'Compliance officer review and enhanced due diligence required.' : 'Retain risk assessment evidence.',
      source_event: 'Client onboarding risk rating',
      source_key: `onboarding:${client.id}:RMCP_Review`,
    },
    {
      register_type: 'Sanctions',
      linked_client_id: client.id,
      linked_client_name: name,
      linked_advisor: advisor,
      risk_level: client.aml_pep_clear === false ? 'High' : risk,
      status: client.aml_pep_clear === false ? 'Escalated' : 'Open',
      description: `Sanctions, PEP and adverse media screening record for ${name}.`,
      action_required: client.aml_pep_clear === false ? 'Investigate match and document outcome.' : 'Retain screening result evidence.',
      source_event: 'Client onboarding screening',
      source_key: `onboarding:${client.id}:Sanctions`,
    },
  ];

  if (risk === 'High') {
    entries.push({
      register_type: 'EDD',
      linked_client_id: client.id,
      linked_client_name: name,
      linked_advisor: advisor,
      risk_level: 'High',
      status: 'Escalated',
      description: `EDD required for high-risk client ${name}.`,
      action_required: 'Apply enhanced due diligence and record approval decision.',
      source_event: 'High-risk onboarding',
      source_key: `onboarding:${client.id}:EDD`,
    });
  }

  if (client.fica_status && client.fica_status !== 'Approved') {
    entries.push({
      register_type: 'FICA_Exception',
      linked_client_id: client.id,
      linked_client_name: name,
      linked_advisor: advisor,
      risk_level: 'High',
      status: 'Escalated',
      description: `FICA verification returned ${client.fica_status} for ${name}.`,
      action_required: client.fica_failure_reason || 'Resolve verification exception before final approval.',
      source_event: 'FICA verification failure',
      source_key: `onboarding:${client.id}:FICA_Exception`,
    });
  }

  return Promise.all(entries.map(entry => upsertComplianceRegister(entry, actor)));
}

export async function createAdviceComplianceEntry({ proposal, client, actor = null }) {
  if (!proposal?.id) return null;
  const name = clientDisplayName(client || proposal);
  return upsertComplianceRegister({
    register_type: 'Advice',
    linked_client_id: proposal.client_id,
    linked_client_name: name,
    linked_proposal_id: proposal.id,
    linked_advisor: proposal.advisor_name,
    risk_level: normalizeRisk(proposal.rmcp_risk_band || proposal.fica_risk_band),
    description: `Advice record generated for proposal ${proposal.reference || proposal.id}.`,
    action_required: 'Retain advice record, disclosures, suitability rationale and signed proposal pack.',
    source_event: 'Proposal PDF generation',
    source_key: `proposal:${proposal.id}:Advice`,
  }, actor);
}

export async function createProductReplacementComplianceEntries({ proposal, client, actor = null }) {
  if (!proposal?.id || !proposal.is_replacement) return [];
  const replacements = Array.isArray(proposal.replacement_products) ? proposal.replacement_products : [];
  if (!replacements.length) return [];
  const name = clientDisplayName(client || proposal);
  const created = [];
  for (let index = 0; index < replacements.length; index += 1) {
    const item = replacements[index] || {};
    const existingProduct = [item.existing_product_provider, item.existing_product_type, item.existing_policy_number].filter(Boolean).join(' - ') || 'Existing product';
    const riskLevel = item.penalties_disclosed === false || item.waiting_periods_disclosed === false ? 'High' : 'Medium';
    const register = await upsertComplianceRegister({
      register_type: 'Product_Replacement',
      linked_client_id: proposal.client_id,
      linked_client_name: name,
      linked_proposal_id: proposal.id,
      linked_advisor: proposal.advisor_name,
      risk_level: riskLevel,
      status: riskLevel === 'High' ? 'Escalated' : 'Open',
      description: `Product replacement identified for ${name}: ${existingProduct}.`,
      action_required: 'Confirm replacement disclosure, risks, fees, penalties and client acknowledgement.',
      source_event: 'Product replacement',
      source_key: `proposal:${proposal.id}:Product_Replacement:${index}`,
    }, actor);
    created.push(register);

    const existing = await base44.entities.Product_Replacement_Register.filter({ linked_register_id: register.id });
    if (!existing?.length) {
      await base44.entities.Product_Replacement_Register.create({
        client_id: proposal.client_id,
        client_name: name,
        existing_product: existingProduct,
        new_product: proposal.reference || 'New recommendation',
        reason: item.replacement_reason || 'Replacement identified in advice flow',
        disclosure_given: item.penalties_disclosed && item.waiting_periods_disclosed ? 'Yes' : 'No',
        replacement_risk_flag: riskLevel,
        advisor: proposal.advisor_name,
        date: new Date().toISOString().split('T')[0],
        linked_register_id: register.id,
      });
    }
  }
  return created;
}

export function exportRows(filename, rows) {
  const header = Object.keys(rows[0] || { report: 'No data' });
  const csv = [
    header.join(','),
    ...rows.map(row => header.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
