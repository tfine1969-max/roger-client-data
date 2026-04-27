import { useState } from "react";
import { base44 } from "@/api/base44Client";

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const STATUS_COLOURS = {
  Pending:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  Submitted:  { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  Verified:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  Incomplete: { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
};

const DOCUMENT_INDEX = [
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

export default function ClientDocumentRepository({ client, onStatusUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusStyle = STATUS_COLOURS[client?.doc_status] || STATUS_COLOURS.Pending;

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const allClients = await base44.entities.Clients.list();
      const clientRecord = allClients.find(c => c.id === client.id);
      if (clientRecord) {
        await base44.entities.Clients.update(client.id, { doc_status: newStatus });
        if (onStatusUpdate) onStatusUpdate();
      }
    } catch (err) {
      console.error(err);
    }
    setUpdatingStatus(false);
  };

  const uploadedCount = DOCUMENT_INDEX.filter(d => !!client?.[d.key]).length;
  const requiredCount = DOCUMENT_INDEX.filter(d => d.required).length;
  const requiredUploaded = DOCUMENT_INDEX.filter(d => d.required && !!client?.[d.key]).length;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '28px 32px',
      marginTop: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
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
            {uploadedCount} of {DOCUMENT_INDEX.length} documents uploaded
            {' · '}{requiredUploaded} of {requiredCount} required
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Doc status badge */}
          <span style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            border: `1px solid ${statusStyle.border}`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {client?.doc_status || 'Pending'}
          </span>

          {/* Advisor status update dropdown */}
          <select
            value={client?.doc_status || 'Pending'}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            style={{
              border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px 10px', fontSize: 12, color: '#334155',
              background: '#f8fafc', cursor: 'pointer',
            }}
          >
            <option value="Pending">Pending</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Incomplete">Incomplete</option>
          </select>
        </div>
      </div>

      {/* Submission timestamp */}
      {client?.doc_submitted_at && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontSize: 12, color: '#166534',
        }}>
          ✓ Documents submitted by client on {formatDateTime(client.doc_submitted_at)}
        </div>
      )}

      {!client?.doc_submitted_at && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontSize: 12, color: '#92400e',
        }}>
          ⏳ Client has not yet submitted documents via onboarding.
        </div>
      )}

      {/* Document index table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#94a3b8', width: 40 }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#94a3b8' }}>Document</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#94a3b8', width: 80 }}>Required</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10,
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#94a3b8', width: 80 }}>Status</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10,
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#94a3b8', width: 120 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {DOCUMENT_INDEX.map((doc, i) => {
            const fileUrl = client?.[doc.key];
            const uploaded = !!fileUrl;
            return (
              <tr key={doc.key} style={{
                borderBottom: '1px solid #f1f5f9',
                background: i % 2 === 0 ? '#ffffff' : '#fafafa',
              }}>
                <td style={{ padding: '14px 12px', color: '#94a3b8',
                  fontSize: 11, fontWeight: 700 }}>
                  {doc.index}
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <p style={{ fontWeight: 600, color: '#1e3a5f',
                    margin: '0 0 2px 0', fontSize: 13 }}>
                    {doc.label}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    {doc.description}
                  </p>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: doc.required ? '#9f1239' : '#64748b',
                  }}>
                    {doc.required ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  {uploaded ? (
                    <span style={{
                      background: '#f0fdf4', color: '#166534',
                      border: '1px solid #bbf7d0',
                      borderRadius: 20, padding: '3px 10px',
                      fontSize: 11, fontWeight: 700,
                    }}>✓ Uploaded</span>
                  ) : (
                    <span style={{
                      background: '#fff1f2', color: '#9f1239',
                      border: '1px solid #fecdd3',
                      borderRadius: 20, padding: '3px 10px',
                      fontSize: 11, fontWeight: 700,
                    }}>✗ Missing</span>
                  )}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  {uploaded ? (
                    <button
                      onClick={() => window.open(fileUrl, '_blank')}
                      style={{
                        background: '#1e3a5f', color: '#ffffff',
                        borderRadius: 6, padding: '6px 14px',
                        fontSize: 11, fontWeight: 700,
                        textDecoration: 'none', display: 'inline-block',
                        letterSpacing: '0.5px',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      ↓ View / Download
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                      Not uploaded
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
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