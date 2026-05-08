import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, ChevronRight, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
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

const FICA_STATUS_STYLES = {
  'Approved': { icon: CheckCircle2, bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'Verified' },
  'Referred': { icon: AlertTriangle, bg: '#fef3c7', border: '#fcd34d', text: '#b45309', label: 'EDD Required' },
  'Declined': { icon: XCircle, bg: '#fef2f2', border: '#fecdd3', text: '#991b1b', label: 'Not Verified' },
};

const getParsedFailedCheck = (ficaChecksJson) => {
  if (!ficaChecksJson) return null;
  try {
    const checks = typeof ficaChecksJson === 'string' ? JSON.parse(ficaChecksJson) : ficaChecksJson;
    for (const [key, check] of Object.entries(checks)) {
      if (check.status === 'fail') {
        return check.label || key;
      }
    }
  } catch {}
  return null;
};

const FicaStatusIndicator = ({ client }) => {
  if (!client) return null;

  const status = client.fica_status;
  const styles = FICA_STATUS_STYLES[status];

  if (styles) {
    const Icon = styles.icon;
    const failedCheck = status === 'Declined' ? getParsedFailedCheck(client.fica_checks_json) : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={failedCheck ? `Failed: ${failedCheck}` : ''}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: styles.bg, border: `1px solid ${styles.border}` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: styles.text }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: styles.text }}>{styles.label}</span>
        </div>
        {failedCheck && <span style={{ fontSize: 9, color: '#64748b' }}>({failedCheck})</span>}
      </div>
    );
  }

  // Pending (null/empty)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: '#f3f4f6', border: '1px solid #d1d5db' }}>
      <Clock className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280' }}>Pending</span>
    </div>
  );
};

const formatTimestamp = (value) => {
  if (!value) return '-';
  const raw = String(value);
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const d = new Date(hasTimezone ? raw : `${raw}Z`);
  if (Number.isNaN(d.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
};

export default function InboxTable({ proposals, clientMap = {}, statusFilter = null, ficaFilter = null, onClearFilter }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    setDeletingId(id);
    await base44.entities.Proposal.delete(id);
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setDeletingId(null);
  };

  let filtered = statusFilter
    ? proposals.filter(p =>
        (STATUS_MAP[statusFilter] || []).map(s => s.toLowerCase()).includes((p.status || '').toLowerCase())
      )
    : proposals;

  if (ficaFilter && ficaFilter !== 'All clients') {
    filtered = filtered.filter(p => {
      const client = clientMap[p.client_id];
      if (!client) return ficaFilter === 'Pending verification';
      if (ficaFilter === 'Verified only') return client.fica_status === 'Approved';
      if (ficaFilter === 'EDD Required') return client.fica_status === 'Referred';
      if (ficaFilter === 'Not Verified') return client.fica_status === 'Declined';
      if (ficaFilter === 'Pending verification') return !client.fica_status;
      return true;
    });
  }

  if (sortBy === 'fica') {
    const order = { 'Approved': 3, 'Referred': 2, 'Declined': 1 };
    filtered = [...filtered].sort((a, b) => {
      const aStatus = clientMap[a.client_id]?.fica_status;
      const bStatus = clientMap[b.client_id]?.fica_status;
      return (order[bStatus] || 0) - (order[aStatus] || 0);
    });
  }

  // Mobile card layout
  const MobileCards = () => (
    <div className="space-y-2">
      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {statusFilter ? 'No proposals match this filter.' : 'No proposals yet.'}
        </div>
      )}
      {filtered.map(p => {
        const badgeStyle = STATUS_BADGE_STYLES[p.status] || DEFAULT_BADGE;
        const client = clientMap[p.client_id] || clientMap[p.client] || null;
        const clientName = client
          ? client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.full_name
          : p.client_name || '—';
        return (
          <div key={p.id} onClick={() => navigate(`/proposal/${p.id}/engine`)}
            className="bg-card border border-border rounded-lg p-3 cursor-pointer active:bg-secondary/50">
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <p className="text-sm font-semibold text-navy">{clientName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{p.reference}</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: badgeStyle.bg, color: badgeStyle.color }}>
                {p.status || 'Draft'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <FicaStatusIndicator client={client} />
              <button onClick={(e) => handleDelete(e, p.id)} disabled={deletingId === p.id}
                className="hit-area text-muted-foreground hover:text-danger transition-colors disabled:opacity-40">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {statusFilter && onClearFilter && (
        <button
          onClick={onClearFilter}
          style={{
            background: '#1e3a5f', border: 'none', color: '#ffffff',
            cursor: 'pointer', marginBottom: 12, fontSize: 12, padding: '7px 16px',
            borderRadius: 6, fontWeight: 700, letterSpacing: '0.5px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          ← View all clients
        </button>
      )}

      {/* Mobile cards */}
      <div className="md:hidden">
        <MobileCards />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-border bg-card overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[1.7fr_1.7fr_1.2fr_1fr_0.9fr_120px] px-4 py-2.5 bg-muted border-b border-border min-w-[820px]">
          {['Client', 'Needs Identified', 'FICA Status', 'Created / Updated', 'Status', ''].map((h, i) => (
            <div key={i} className="text-[9px] font-medium tracking-[.1em] uppercase text-muted-foreground flex items-center gap-1" style={{ cursor: h === 'FICA Status' ? 'pointer' : 'default' }} onClick={() => h === 'FICA Status' && setSortBy(sortBy === 'fica' ? null : 'fica')}>
              {h}
              {h === 'FICA Status' && sortBy === 'fica' && <span>↓</span>}
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
               className="grid grid-cols-[1.7fr_1.7fr_1.2fr_1fr_0.9fr_120px] px-4 py-3.5 border-b border-border cursor-pointer hover:bg-blue-50/50 transition-colors items-center min-w-[820px]"
             >
              <div>
                <div className="text-[13px] font-medium text-navy">{clientName}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.reference}</div>
              </div>

              <div className="text-xs text-foreground pr-4">{needs}</div>

              <div className="flex items-center justify-start">
                <FicaStatusIndicator client={client} />
              </div>

              <div className="text-[11px] text-muted-foreground">
                {(() => {
                  const pUpdated = p.updated_date;
                  const pCreated = p.created_date;
                  // Use proposal updated_date if it differs from created (i.e. proposal was modified)
                  const hasUpdate = pUpdated && pUpdated !== pCreated;
                  return formatTimestamp(hasUpdate ? pUpdated : pCreated);
                })()}
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
                  className="hit-area text-muted-foreground hover:text-danger transition-colors disabled:opacity-40"
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