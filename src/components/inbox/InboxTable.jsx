import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, ChevronRight } from 'lucide-react';
import { STATUS_MAP } from '@/components/inbox/InboxMetrics';

const STATUS_BADGE_STYLES = {
  'Draft':                     { bg: '#f0f0f0', color: '#666' },
  'In Progress':               { bg: '#fff3cd', color: '#856404' },
  'PDF Ready':                 { bg: '#fff3cd', color: '#856404' },
  'PDF READY':                 { bg: '#fff3cd', color: '#856404' },
  'Awaiting Review':           { bg: '#cce5ff', color: '#004085' },
  'Submitted':                 { bg: '#cce5ff', color: '#004085' },
  'Pending Review':            { bg: '#cce5ff', color: '#004085' },
  'Sent':                      { bg: '#d1ecf1', color: '#0c5460' },
  'Sent for Signature':        { bg: '#d1ecf1', color: '#0c5460' },
  'Awaiting Client Signature': { bg: '#d1ecf1', color: '#0c5460' },
  'Signed':                    { bg: '#d4edda', color: '#155724' },
  'Completed':                 { bg: '#d4edda', color: '#155724' },
  'Finalised':                 { bg: '#d4edda', color: '#155724' },
  // legacy
  'new':           { bg: '#fff3cd', color: '#856404' },
  'in_progress':   { bg: '#fff3cd', color: '#856404' },
  'sent':          { bg: '#d1ecf1', color: '#0c5460' },
  'signed':        { bg: '#d4edda', color: '#155724' },
  'client_signed': { bg: '#d4edda', color: '#155724' },
};

const DEFAULT_BADGE = { bg: '#f0f0f0', color: '#666' };

export default function InboxTable({ proposals, clientMap = {}, statusFilter = null, onClearFilter }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    setDeletingId(id);
    await base44.entities.Proposal.delete(id);
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setDeletingId(null);
  };

  const filtered = statusFilter
    ? proposals.filter(p =>
        (STATUS_MAP[statusFilter] || []).map(s => s.toLowerCase()).includes((p.status || '').toLowerCase())
      )
    : proposals;

  return (
    <div>
      {statusFilter && onClearFilter && (
        <button
          onClick={onClearFilter}
          style={{
            background: 'none', border: 'none', color: '#26547C',
            cursor: 'pointer', marginBottom: 12, fontSize: 13, padding: 0,
          }}
        >
          ← View all clients
        </button>
      )}

      <div className="border border-border bg-card overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_120px] px-4 py-2.5 bg-muted border-b border-border min-w-[600px]">
          {['Client', 'Needs Identified', 'Created', 'Status', ''].map((h, i) => (
            <div key={i} className="text-[9px] font-medium tracking-[.1em] uppercase text-muted-foreground">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {statusFilter ? 'No proposals match this filter.' : 'No proposals yet. Create your first one above.'}
          </div>
        )}

        {filtered.map(p => {
          const badgeStyle = STATUS_BADGE_STYLES[p.status] || DEFAULT_BADGE;
          const client = clientMap[p.client_id] || clientMap[p.client] || null;

          const clientName = client
            ? client.entity_name || client.trust_name || client.company_name
              || `${client.first_name || ''} ${client.last_name || ''}`.trim()
              || client.full_name
            : p.client_name || '—';

          const rawNeeds = (Array.isArray(p.advisory_needs) && p.advisory_needs.length > 0)
            ? p.advisory_needs
            : (Array.isArray(client?.advisory_needs) && client.advisory_needs.length > 0)
            ? client.advisory_needs
            : null;
          const needs = rawNeeds ? rawNeeds.join(', ') : '—';

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/proposal/${p.id}/engine`)}
              className="grid grid-cols-[2fr_2fr_1fr_1fr_120px] px-4 py-3.5 border-b border-border cursor-pointer hover:bg-blue-50/50 transition-colors items-center min-w-[600px]"
            >
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[13px] font-medium text-navy">{clientName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.reference}</div>
                </div>
                {(() => {
                  const ficaComplete = client && (
                    client.doc_status === 'Complete' ||
                    (client.doc_identity && client.doc_proof_of_address && client.doc_source_of_funds)
                  );
                  if (!client) return null;
                  if (ficaComplete) return (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '2px 8px' }}>FICA ✓</span>
                  );
                  if (client.doc_status === 'Submitted') return (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '2px 8px' }}>FICA ⏳</span>
                  );
                  if (client.doc_status === 'Incomplete') return (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9f1239', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '2px 8px' }}>FICA ✗</span>
                  );
                  return null;
                })()}
              </div>

              <div className="text-xs text-foreground pr-4">{needs}</div>

              <div className="text-xs text-muted-foreground">
                {p.created_date ? (() => {
                  const d = new Date(p.created_date);
                  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                })() : '—'}
              </div>

              <div>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 4,
                  background: badgeStyle.bg, color: badgeStyle.color,
                }}>
                  {p.status || 'Draft'}
                </span>
              </div>

              <div className="flex justify-end items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/proposal/${p.id}/engine`); }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-navy text-white text-[10px] font-semibold uppercase tracking-wide hover:bg-ocean transition-colors"
                >
                  Build <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  disabled={deletingId === p.id}
                  className="p-1 text-muted-foreground hover:text-danger transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}