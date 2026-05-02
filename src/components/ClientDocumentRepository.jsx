import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
};

const STATUS_COLOURS = {
  Pending:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  Submitted:  { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  Verified:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  Incomplete: { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
};

const DEFAULT_DOCUMENT_INDEX = [
  {
    key: 'doc_identity',
    index: '01',
    label: 'Identity Document',
    description: 'SA ID / Smart Card / Passport — front & back',
    required: true,
  },
  {
    key: 'doc_proof_of_address',
    index: '02',
    label: 'Proof of Address',
    description: 'Utility bill or bank statement showing name and address',
    required: true,
  },
  {
    key: 'doc_source_of_funds',
    index: '03',
    label: 'Income / Source of Funds',
    description: '3 months payslips or 6 months bank statements',
    required: true,
  },
  {
    key: 'doc_existing_policies',
    index: '04',
    label: 'Existing Policies',
    description: 'Current policy documents or statements',
    required: false,
  },
];

const getDocumentIndex = (clientType) => {
  if (clientType === 'Company') {
    return [
      { key: 'doc_identity', index: '01', label: 'CIPC Registration Certificate', description: 'CoR14.3 / CoR15.1A or equivalent', required: true },
      { key: 'doc_proof_of_address', index: '02', label: 'Proof of Registered Address', description: 'Utility bill or bank statement showing registered address', required: true },
      { key: 'doc_source_of_funds', index: '03', label: 'Financial Statements', description: 'Most recent audited or management accounts', required: true },
      { key: 'doc_existing_policies', index: '04', label: 'MOI / Memorandum of Incorporation', description: 'Certified copy of current MOI', required: false },
    ];
  }

  if (clientType === 'Trust') {
    return [
      { key: 'doc_identity', index: '01', label: 'Trust Deed', description: 'Certified copy of the trust deed', required: true },
      { key: 'doc_proof_of_address', index: '02', label: 'Proof of Registered Address', description: 'Utility bill or bank statement showing registered address', required: true },
      { key: 'doc_source_of_funds', index: '03', label: 'Trust Bank Statement', description: 'Most recent 3 months bank statements', required: true },
      { key: 'doc_existing_policies', index: '04', label: 'Letter of Authority', description: 'Master of the High Court letter', required: false },
    ];
  }

  return DEFAULT_DOCUMENT_INDEX;
};

const parseDocumentJson = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function ClientDocumentRepository({ client, proposals = [], attachments = [], investments = [], onStatusUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const documentIndex = getDocumentIndex(client?.client_type);

  // FICA is complete when the three required docs (01, 02, 03) are uploaded — doc 04 is optional
  const ficaComplete = !!(client?.doc_identity && client?.doc_proof_of_address && client?.doc_source_of_funds);
  const computedFicaStatus = ficaComplete ? 'Complete' : 'Incomplete';

  // Status for badge/dropdown: prefer computed when complete, otherwise fall back to stored doc_status
  const displayStatus = ficaComplete ? 'Complete' : (client?.doc_status || 'Pending');
  const STATUS_COLOURS_EXT = {
    ...STATUS_COLOURS,
    Complete: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  };
  const statusStyle = STATUS_COLOURS_EXT[displayStatus] || STATUS_COLOURS.Pending;

  // Auto-save Complete to Client entity when all required docs are present
  useEffect(() => {
    if (!client?.id) return;
    if (ficaComplete && client.doc_status !== 'Complete') {
      base44.entities.Clients.update(client.id, { doc_status: 'Complete' })
        .then(() => { if (onStatusUpdate) onStatusUpdate(); })
        .catch(() => {});
    }
  }, [ficaComplete, client?.id, client?.doc_status]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await base44.entities.Clients.update(client.id, { doc_status: newStatus });
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      console.error(err);
    }
    setUpdatingStatus(false);
  };

  // Build dynamic proposal rows
  const proposalRows = [];
  proposals.forEach((proposal, i) => {
    const baseIndex = 5 + (i * 2);

    if (proposal.pdf_generated_at || proposal.proposal_pdf_url) {
      proposalRows.push({
        index: String(baseIndex).padStart(2, '0'),
        label: `Proposal — ${proposal.reference || 'Draft'}`,
        description: `Financial Strategy & Recommendation Report · Generated: ${formatDateTime(proposal.pdf_generated_at)}`,
        fileUrl: proposal.proposal_pdf_url || null,
        statusOverride: proposal.proposal_pdf_url ? 'uploaded' : 'missing',
        tag: 'PROPOSAL PDF',
      });
    }

    if (proposal.signed_pdf_url || proposal.status === 'Signed') {
      proposalRows.push({
        index: String(baseIndex + 1).padStart(2, '0'),
        label: `Signed — ${proposal.reference || 'Draft'}`,
        description: `Signed by client on: ${formatDateTime(proposal.signed_at)}`,
        fileUrl: proposal.signed_pdf_url || null,
        statusOverride: proposal.signed_pdf_url ? 'uploaded' : 'missing',
        tag: 'SIGNED',
      });
    }
  });

  // Build investment attachment docs list
  const attachmentTypes = [
    { suffix: 'Quote', tag: 'QUOTE PDF', tagBg: '#eff6ff', tagColor: '#1e40af', tagBorder: '#bfdbfe' },
    { suffix: 'Application Form', tag: 'APP FORM', tagBg: '#fdf4ff', tagColor: '#7e22ce', tagBorder: '#e9d5ff' },
    { suffix: 'Supporting Doc', tag: 'SUPPORT DOC', tagBg: '#fffbeb', tagColor: '#92400e', tagBorder: '#fde68a' },
  ];
  const invDocs = [];
  investments.forEach(inv => {
    const invLabel = [inv.provider, inv.product_type].filter(Boolean).join(' — ') || 'Investment';
    attachmentTypes.forEach(({ suffix, tag, tagBg, tagColor, tagBorder }) => {
      const key = `${suffix}::${inv.id}`;
      const att = attachments.find(a => a.attachment_type === key);
      if (att?.file_url) {
        invDocs.push({ label: invLabel, tag, tagBg, tagColor, tagBorder, url: att.file_url });
      }
    });
  });

  const personsList = Array.isArray(client?.directors_list)
    ? client.directors_list
    : Array.isArray(client?.trustees_list)
    ? client.trustees_list
    : [];
  const personLabel = client?.client_type === 'Trust' ? 'Trustee' : 'Director';
  const indexedPersonDocs = client?.client_type === 'Trust'
    ? parseDocumentJson(client?.trustee_documents_json)
    : parseDocumentJson(client?.director_documents_json);
  const personDocSources = indexedPersonDocs.length > 0 ? indexedPersonDocs : personsList;
  const personDocs = [];
  personDocSources.forEach((person, personIndex) => {
    const sourceIndex = person.trustee_index ?? person.director_index ?? personIndex;
    const listPerson = personsList[sourceIndex] || {};
    const fullName = person.name || [person.first_name || listPerson.first_name, person.last_name || listPerson.last_name].filter(Boolean).join(' ') || `${personLabel} ${sourceIndex + 1}`;
    if (person.id_file_url) {
      personDocs.push({
        label: `${personLabel} ${sourceIndex + 1} ID / Passport - ${fullName}`,
        description: 'Certified identity document',
        fileUrl: person.id_file_url,
        tag: `${personLabel.toUpperCase()} DOC`,
      });
    }
    if (person.addr_file_url) {
      personDocs.push({
        label: `${personLabel} ${sourceIndex + 1} Proof of Address - ${fullName}`,
        description: 'Residential address verification document',
        fileUrl: person.addr_file_url,
        tag: `${personLabel.toUpperCase()} DOC`,
      });
    }
  });

  // Counts
  const ficaUploaded = documentIndex.filter(d => !!client?.[d.key]).length;
  const proposalUploaded = proposalRows.filter(d => d.statusOverride === 'uploaded').length;
  const totalRows = documentIndex.length + personDocs.length + proposalRows.length + invDocs.length;
  const totalUploaded = ficaUploaded + personDocs.length + proposalUploaded + invDocs.length;
  const requiredCount = documentIndex.filter(d => d.required).length;
  const requiredUploaded = documentIndex.filter(d => d.required && !!client?.[d.key]).length;

  const badgeUploaded = {
    background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
  };
  const badgeMissing = {
    background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3',
    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
  };
  const btnDownload = {
    background: '#1e3a5f', color: '#ffffff',
    borderRadius: 6, padding: '6px 14px',
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.5px', whiteSpace: 'nowrap',
    border: 'none', cursor: 'pointer',
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '28px 32px',
      marginTop: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'auto',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 20,
        paddingBottom: 16, borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1.2px',
            textTransform: 'uppercase', color: '#1e3a5f', margin: '0 0 4px 0'
          }}>
            FICA Document Repository
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {totalUploaded} of {totalRows} documents uploaded
            {' · '}{requiredUploaded} of {requiredCount} required
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: statusStyle.bg, color: statusStyle.color,
            border: `1px solid ${statusStyle.border}`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            {displayStatus}
          </span>

          <select
            value={displayStatus}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            style={{
              border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px 10px', fontSize: 12, color: '#334155',
              background: '#f8fafc', cursor: 'pointer',
            }}
          >
            <option value="Complete">Complete</option>
            <option value="Pending">Pending</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Incomplete">Incomplete</option>
          </select>
        </div>
      </div>

      {/* Submission timestamp */}
      {client?.doc_submitted_at ? (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontSize: 12, color: '#166534',
        }}>
          ✓ Documents submitted by client on {formatDateTime(client.doc_submitted_at)}
        </div>
      ) : (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontSize: 12, color: '#92400e',
        }}>
          ⏳ Client has not yet submitted documents via onboarding.
        </div>
      )}

      {/* Document index table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col />
          <col style={{ width: 90 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 170 }} />
        </colgroup>
        <thead>
        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#94a3b8' }}>#</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#94a3b8' }}>Document</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#94a3b8' }}>Required</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#94a3b8' }}>Status</th>
          <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#94a3b8' }}>Action</th>
        </tr>
        </thead>
        <tbody>
          {/* FICA rows */}
          {documentIndex.map((doc, i) => {
            const fileUrl = client?.[doc.key];
            const uploaded = !!fileUrl;
            return (
              <tr key={doc.key} style={{
                borderBottom: '1px solid #f1f5f9',
                background: i % 2 === 0 ? '#ffffff' : '#fafafa',
              }}>
                <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                  {doc.index}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <p style={{ fontWeight: 600, color: '#1e3a5f', margin: '0 0 2px 0', fontSize: 13 }}>
                    {doc.label}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    {doc.description}
                  </p>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: doc.required ? '#9f1239' : '#64748b' }}>
                    {doc.required ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                  {uploaded
                    ? <span style={badgeUploaded}>✓ Uploaded</span>
                    : <span style={badgeMissing}>✗ Missing</span>
                  }
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {uploaded ? (
                    <button onClick={() => window.open(fileUrl, '_blank')} style={btnDownload}>
                      ↓ View / Download
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>Not uploaded</span>
                  )}
                </td>
              </tr>
            );
          })}

          {personDocs.length > 0 && (
            <tr>
              <td colSpan={5} style={{
                padding: '10px 12px 6px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                color: '#94a3b8', background: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
              }}>
                {client?.client_type === 'Trust' ? 'Trustee Documents' : 'Director Documents'}
              </td>
            </tr>
          )}

          {personDocs.map((doc, i) => (
            <tr key={`persondoc-${i}`} style={{
              borderBottom: '1px solid #f1f5f9',
              background: i % 2 === 0 ? '#ffffff' : '#fafafa',
            }}>
              <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                {String(documentIndex.length + i + 1).padStart(2, '0')}
              </td>
              <td style={{ padding: '14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontWeight: 600, color: '#1e3a5f', margin: 0, fontSize: 13 }}>
                    {doc.label}
                  </p>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
                    textTransform: 'uppercase', padding: '2px 7px',
                    borderRadius: 10, whiteSpace: 'nowrap',
                    background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                  }}>
                    {doc.tag}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{doc.description}</p>
              </td>
              <td style={{ padding: '14px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9f1239' }}>Required</span>
              </td>
              <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                <span style={badgeUploaded}>âœ“ Uploaded</span>
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button onClick={() => window.open(doc.fileUrl, '_blank')} style={btnDownload}>
                  â†“ View / Download
                </button>
              </td>
            </tr>
          ))}

          {/* Proposal Documents section divider */}
          {proposalRows.length > 0 && (
            <tr>
              <td colSpan={5} style={{
                padding: '10px 12px 6px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                color: '#94a3b8', background: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
              }}>
                Proposal Documents
              </td>
            </tr>
          )}

          {/* Proposal rows */}
          {proposalRows.map((doc, i) => (
            <tr key={`proposal-${i}`} style={{
              borderBottom: '1px solid #f1f5f9',
              background: i % 2 === 0 ? '#ffffff' : '#fafafa',
            }}>
              <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                {String(documentIndex.length + personDocs.length + i + 1).padStart(2, '0')}
              </td>
              <td style={{ padding: '14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontWeight: 600, color: '#1e3a5f', margin: 0, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {doc.label}
                  </p>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
                    textTransform: 'uppercase', padding: '2px 7px',
                    borderRadius: 10, whiteSpace: 'nowrap',
                    background: doc.tag === 'SIGNED' ? '#f0fdf4' : '#eff6ff',
                    color: doc.tag === 'SIGNED' ? '#166534' : '#1e40af',
                    border: `1px solid ${doc.tag === 'SIGNED' ? '#bbf7d0' : '#bfdbfe'}`,
                  }}>
                    {doc.tag}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{doc.description}</p>
              </td>
              <td style={{ padding: '14px 12px' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Optional</span>
              </td>
              <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                {doc.statusOverride === 'uploaded'
                  ? <span style={badgeUploaded}>✓ Uploaded</span>
                  : <span style={badgeMissing}>✗ Missing</span>
                }
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {doc.fileUrl ? (
                  <button onClick={() => window.open(doc.fileUrl, '_blank')} style={btnDownload}>
                    ↓ View / Download
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>Not available</span>
                )}
              </td>
            </tr>
          ))}

          {/* Investment / Attachment Documents section */}
          {invDocs.length > 0 && (
            <>
              <tr>
                <td colSpan={5} style={{
                  padding: '10px 12px 6px',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  color: '#94a3b8', background: '#f8fafc',
                  borderTop: '2px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  Investment Documents
                </td>
              </tr>
              {invDocs.map((doc, i) => {
                const docNum = String(documentIndex.length + personDocs.length + proposalRows.length + i + 1).padStart(2, '0');
                return (
                  <tr key={`invdoc-${i}`} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}>
                    <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                      {docNum}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontWeight: 600, color: '#1e3a5f', margin: 0, fontSize: 13, whiteSpace: 'nowrap' }}>{doc.label}</p>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
                          textTransform: 'uppercase', padding: '2px 7px', borderRadius: 10,
                          whiteSpace: 'nowrap', flexShrink: 0,
                          background: doc.tagBg, color: doc.tagColor, border: `1px solid ${doc.tagBorder}`,
                        }}>{doc.tag}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Optional</span>
                    </td>
                    <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                      <span style={badgeUploaded}>✓ Uploaded</span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => window.open(doc.url, '_blank')} style={btnDownload}>
                        ↓ View / Download
                      </button>
                    </td>
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </table>

      {/* FICA compliance note */}
      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: '#f8fafc', borderRadius: 8,
        border: '1px solid #e2e8f0',
        fontSize: 11, color: '#64748b', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#334155' }}>Certification requirement:</strong>
        {' '}All copies must be certified by a Commissioner of Oaths, attorney, bank official, or notary.
        Documents are stored encrypted in compliance with FICA and POPIA obligations.
      </div>
    </div>
  );
}
