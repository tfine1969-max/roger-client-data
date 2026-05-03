import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, ArrowLeft, Search, CheckCircle2, AlertTriangle, Clock, XCircle, FileText } from 'lucide-react';

const STATUS_FILTERS = [
  { key: 'all', label: 'All Submissions' },
  { key: 'new', label: 'New Submissions' },
  { key: 'manual_review', label: 'Manual Review Required' },
  { key: 'awaiting_documents', label: 'Awaiting Documents' },
  { key: 'ready', label: 'Ready for Approval' },
];

const getVerificationStatus = (client) => {
  if (!client) return 'unknown';
  const vs = (client.verification_status || '').toLowerCase().replace(/\s/g, '_');
  const ficaStatus = client.fica_status;
  if (ficaStatus === 'Approved' && client.onboarding_complete) return 'ready';
  if (vs === 'manual_review' || vs === 'manual review' || ficaStatus === 'Referred') return 'manual_review';
  if (vs === 'pending' || !client.onboarding_complete) return 'new';
  if (vs === 'awaiting_documents') return 'awaiting_documents';
  if (ficaStatus === 'Approved') return 'ready';
  return 'new';
};

const STATUS_STYLES = {
  ready: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/20', label: 'Ready for Approval', icon: CheckCircle2 },
  manual_review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Manual Review', icon: AlertTriangle },
  new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'New Submission', icon: FileText },
  awaiting_documents: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Awaiting Documents', icon: Clock },
  unknown: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border', label: 'Unknown', icon: Clock },
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ComplianceReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['compliance-clients'],
    queryFn: () => base44.entities.Clients.list('-created_date', 200),
  });

  // Only show clients who have started onboarding (have email)
  const onboardedClients = clients.filter(c => c.email && (c.onboarding_complete || c.fica_status || c.doc_status));

  const filtered = onboardedClients.filter(client => {
    const vs = getVerificationStatus(client);
    const matchesFilter = activeFilter === 'all' || vs === activeFilter;
    const name = (client.full_name || client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`).toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase()) || (client.email || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: onboardedClients.length,
    new: onboardedClients.filter(c => getVerificationStatus(c) === 'new').length,
    manual_review: onboardedClients.filter(c => getVerificationStatus(c) === 'manual_review').length,
    awaiting_documents: onboardedClients.filter(c => getVerificationStatus(c) === 'awaiting_documents').length,
    ready: onboardedClients.filter(c => getVerificationStatus(c) === 'ready').length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-navy border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/proposals')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Compliance Review</h1>
            <p className="text-white/60 text-xs">Onboarding Review Queue · Advisor Portal</p>
          </div>
        </div>
        <button
          onClick={() => base44.auth.logout('/')}
          className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="flex-1 p-4 md:p-7 max-w-7xl mx-auto w-full">
        {/* Filter tabs */}
        <div className="flex items-center gap-0 mb-6 border border-border rounded overflow-hidden bg-card w-fit">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-r border-border last:border-r-0 transition-colors ${activeFilter === f.key ? 'bg-navy text-white' : 'text-muted-foreground hover:text-navy hover:bg-secondary'}`}
            >
              {f.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>
                {counts[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-card w-full focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Table */}
        <div className="border border-border bg-card overflow-x-auto">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px] px-4 py-2.5 bg-muted border-b border-border min-w-[800px]">
            {['Client', 'Email', 'FICA Status', 'Doc Status', 'Submitted', 'Action'].map(h => (
              <div key={h} className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground">{h}</div>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No clients match this filter.</div>
          )}

          {!isLoading && filtered.map(client => {
            const vs = getVerificationStatus(client);
            const style = STATUS_STYLES[vs] || STATUS_STYLES.unknown;
            const Icon = style.icon;
            const name = client.full_name || client.entity_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || '—';
            return (
              <div key={client.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_120px] px-4 py-3 border-b border-border items-center min-w-[800px] hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-navy">{name}</p>
                  <p className="text-[10px] text-muted-foreground">{client.client_type || 'Natural Person'}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate pr-2">{client.email || '—'}</p>
                <div>
                  {client.fica_status ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${style.bg} ${style.text} ${style.border}`}>
                      {client.fica_status}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Pending</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">{client.doc_status || 'Pending'}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{formatDate(client.doc_submitted_at || client.created_date)}</p>
                <button
                  onClick={() => navigate(`/compliance-review/${client.id}`)}
                  className="px-3 py-1.5 bg-navy text-white text-[10px] font-bold uppercase tracking-wide hover:bg-ocean transition-colors rounded"
                >
                  Review →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}