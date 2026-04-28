import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, ChevronRight } from 'lucide-react';

const statusBadge = {
  'In Progress':                 { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'In Progress' },
  'PDF Ready':                   { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'PDF Ready' },
  'Sent':                        { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Sent' },
  'Awaiting Client Signature':   { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Awaiting Signature' },
  'Signed':                      { bg: 'bg-green-100',  text: 'text-green-900',  label: 'Signed' },
  'Outdated':                    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Outdated' },
  // Legacy lowercase fallbacks
  'new':         { bg: 'bg-slate-100', text: 'text-slate-700', label: 'In Progress' },
  'in_progress': { bg: 'bg-slate-100', text: 'text-slate-700', label: 'In Progress' },
  'sent':        { bg: 'bg-blue-100',  text: 'text-blue-800',  label: 'Sent' },
  'signed':      { bg: 'bg-green-100', text: 'text-green-900', label: 'Signed' },
};

const STATUS_GROUPS = {
  new: ['new', 'In Progress', 'in_progress', null, undefined],
  in_progress: ['Awaiting Client Signature', 'Sent', 'sent', 'Outdated', 'PDF Ready'],
  sent: ['Signed', 'signed', 'client_signed'],
};

export default function InboxTable({ proposals, clientMap = {}, statusFilter = null }) {
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
    ? proposals.filter(p => (STATUS_GROUPS[statusFilter] || []).includes(p.status))
    : proposals;

  return (
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
        const badge = statusBadge[p.status] || statusBadge['In Progress'];
        const client = clientMap[p.client_id] || clientMap[p.client] || null;

        const clientName = client
          ? client.entity_name || client.trust_name || client.company_name
            || `${client.first_name || ''} ${client.last_name || ''}`.trim()
            || client.full_name
          : p.client_name || '—';

        // Pull advisory needs from proposal first, then client
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
                // FICA complete = only the three mandatory docs uploaded (doc 04 is optional, never blocks)
                const ficaComplete = client && client.doc_identity && client.doc_proof_of_address && client.doc_source_of_funds;
                if (!client) return null;
                if (ficaComplete) return (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#166534',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 10, padding: '2px 8px',
                  }}>FICA ✓</span>
                );
                if (client.doc_status === 'Submitted') return (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#1e40af',
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 10, padding: '2px 8px',
                  }}>FICA ⏳</span>
                );
                if (client.doc_status === 'Incomplete') return (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#9f1239',
                    background: '#fff1f2', border: '1px solid #fecdd3',
                    borderRadius: 10, padding: '2px 8px',
                  }}>FICA ✗</span>
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
              <span className={`text-[9px] font-medium tracking-[.07em] uppercase px-2 py-1 ${badge.bg} ${badge.text}`}>
                {badge.label}
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
  );
}