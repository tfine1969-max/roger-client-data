import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

const statusBadge = {
  new: { bg: 'bg-amber-50', text: 'text-amber-900', label: 'New' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'In progress' },
  signed: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'Signed' },
  sent: { bg: 'bg-green-50', text: 'text-green-900', label: 'Sent' },
  client_signed: { bg: 'bg-green-100', text: 'text-green-900', label: 'Client signed' },
  'Pending Review': { bg: 'bg-amber-50', text: 'text-amber-900', label: 'Pending Review' },
};

const STATUS_GROUPS = {
  new: ['new', 'Pending Review'],
  in_progress: ['in_progress', 'signed'],
  sent: ['sent', 'client_signed'],
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
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_32px] px-4 py-2.5 bg-muted border-b border-border min-w-[600px]">
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
        const badge = statusBadge[p.status] || statusBadge.new;
        const client = clientMap[p.client_id] || clientMap[p.client] || null;

        const clientName = client
          ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.full_name
          : p.client_name || '—';

        // Pull advisory needs from linked client record
        const needs = Array.isArray(p.advisory_needs) && p.advisory_needs.length > 0
          ? p.advisory_needs.join(', ')
          : Array.isArray(client?.advisory_needs) && client.advisory_needs.length > 0
          ? client.advisory_needs.join(', ')
          : '—';

        return (
          <div
            key={p.id}
            onClick={() => navigate(`/proposal/${p.id}`)}
            className="grid grid-cols-[2fr_2fr_1fr_1fr_32px] px-4 py-3.5 border-b border-border cursor-pointer hover:bg-blue-50/50 transition-colors items-center min-w-[600px]"
          >
            <div>
              <div className="text-[13px] font-medium text-navy">{clientName}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.reference}</div>
            </div>
            <div className="text-xs text-foreground pr-4">{needs}</div>
            <div className="text-xs text-muted-foreground">
              {p.created_date ? (() => {
                const d = new Date(p.created_date);
                const sast = new Date(d.getTime() + 2 * 60 * 60 * 1000);
                return format(sast, 'dd MMM yyyy HH:mm');
              })() : '—'}
            </div>
            <div>
              <span className={`text-[9px] font-medium tracking-[.07em] uppercase px-2 py-1 ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex justify-end">
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