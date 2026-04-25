import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-medium text-navy">{value || '—'}</p>
    </div>
  );
}

const statusBadge = {
  new: { bg: 'bg-amber-50', text: 'text-amber-900', label: 'New' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'In Progress' },
  signed: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'Signed' },
  sent: { bg: 'bg-green-50', text: 'text-green-900', label: 'Sent' },
  client_signed: { bg: 'bg-green-100', text: 'text-green-900', label: 'Client Signed' },
};

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const list = await base44.entities.Proposal.list();
      const found = list.find(p => p.id === id);
      if (found) return { ...found, _entity: 'Proposal' };
      const list2 = await base44.entities.Proposals.list();
      const found2 = list2.find(p => p.id === id);
      return found2 ? { ...found2, _entity: 'Proposals' } : null;
    },
    enabled: !!id,
  });

  const { data: client } = useQuery({
    queryKey: ['client', proposal?.client_id],
    queryFn: async () => {
      if (!proposal?.client_id) return null;
      const list = await base44.entities.Clients.list();
      return list.find(c => c.id === proposal.client_id) || null;
    },
    enabled: !!proposal?.client_id,
  });

  if (isLoading || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  const isEntity = client?.client_type === 'Company' || client?.client_type === 'Trust';
  const clientName = isEntity
    ? (client?.entity_name || client?.trust_name || proposal.client_name)
    : (client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : proposal.client_name) || '—';

  const badge = statusBadge[proposal.status] || statusBadge.new;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{clientName}</h1>
          <p className="text-white/60 text-xs font-mono mt-0.5">{proposal.reference}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-sm ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <button
            onClick={() => navigate('/proposals')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/30 rounded-sm hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inbox
          </button>
        </div>
      </div>

      {/* Step navbar */}
      <div className="bg-card border-b border-border px-6">
        <div className="flex">
          {['01 · Client Details', '02 · Recommendations', '03 · Suitability & Sign', '04 · Review & Send'].map((label, i) => (
            <div key={i} className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 whitespace-nowrap ${
              i === 0 ? 'border-navy text-navy' : 'border-transparent text-muted-foreground'
            }`}>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Client summary */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-muted border-b border-border">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider">Client</h2>
          </div>
          <div className="p-5 grid grid-cols-4 gap-x-6 gap-y-4">
            <Field label="Name" value={clientName} />
            <Field label={isEntity ? 'Reg / IT No.' : 'ID Number'} value={isEntity ? (client?.trust_number || client?.registration_number) : (client?.sa_id_number || client?.passport_number)} />
            <Field label="Email" value={client?.email || proposal.client_email} />
            <Field label="Mobile" value={client?.mobile_number || proposal.client_mobile} />
            <Field label="Risk Profile" value={proposal.risk_profile || client?.risk_profile} />
            <Field label="Time Horizon" value={proposal.time_horizon || client?.time_horizon} />
            <Field label="Advisor" value={proposal.advisor_name} />
            <Field label="Mandate" value={proposal.mandate_included || 'No'} />
          </div>
        </div>

        {/* Advisory needs */}
        {((proposal.advisory_needs || client?.advisory_needs)?.length > 0) && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Advisory Needs</h2>
            <div className="flex flex-wrap gap-2">
              {(proposal.advisory_needs || client?.advisory_needs || []).map(n => (
                <span key={n} className="px-2.5 py-1 bg-secondary text-navy text-xs font-medium rounded-sm">{n}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {proposal.notes && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Notes</h2>
            <p className="text-sm text-foreground">{proposal.notes}</p>
          </div>
        )}

        {/* Proceed to Step 2 */}
        <button
          onClick={() => navigate(`/proposal/${id}/engine`, { state: { step: 'recommendations' } })}
          className="w-full bg-navy hover:bg-ocean text-white py-3.5 text-[11px] font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
        >
          Proceed to Step 2: Recommendations <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}