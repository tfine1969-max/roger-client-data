import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  'Pending Review',
  'In Progress',
  'Awaiting Client Signature',
  'Signed',
  'Sent',
];

// Map proposal_status → status field used by inbox filter
const STATUS_MAP = {
  'Pending Review': 'new',
  'In Progress': 'in_progress',
  'Awaiting Client Signature': 'in_progress',
  'Signed': 'signed',
  'Sent': 'sent',
};

export default function ProposalHeader({ proposal, client, onUpdate, isSaving, onBack }) {
  const handleUpdate = async (field, value) => {
    await onUpdate(field, value);
    toast.success('Saved');
  };

  const handleMandateToggle = async (value) => {
    setMandateValue(value);
    const docType = value === 'Yes' ? 'Document B' : 'Document A';
    await onUpdate('mandate_included', value);
    await onUpdate('output_document_type', docType);
    toast.success('Saved');
  };

  const handleStatusChange = async (value) => {
    // Update both proposal_status (display) and status (inbox filter)
    await onUpdate('proposal_status', value);
    await onUpdate('status', STATUS_MAP[value] || 'new');
    toast.success('Saved');
  };

  const clientName = client
    ? (client.entity_name || client.trust_name || client.company_name || client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim())
    : (proposal.client_name || 'Client');
  const idNumber = client?.sa_id_number || client?.passport_number || client?.registration_number || client?.trust_number || '';
  const riskProfile = proposal.risk_profile || client?.risk_profile || '';

  // Resolve displayed status — normalise 'new' and 'Pending Review' to same value
  const displayStatus = proposal.proposal_status ||
    (proposal.status === 'new' ? 'Pending Review' : proposal.status) || '';

  // Mandate defaults to 'No' if not yet set
  const [mandateValue, setMandateValue] = React.useState(proposal.mandate_included || 'No');

  React.useEffect(() => {
    setMandateValue(proposal.mandate_included || 'No');
  }, [proposal.mandate_included]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Blue header banner */}
      <div className="bg-navy text-white px-5 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{clientName}</h1>
            <p className="text-white/60 text-xs font-mono mt-0.5">{proposal.reference}</p>
            {idNumber && <p className="text-white/50 text-xs mt-0.5">{idNumber}</p>}
            {riskProfile && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">
                Risk: {riskProfile}
              </span>
            )}
          </div>
          <div className="flex items-start gap-3 shrink-0">
            {isSaving && (
              <div className="flex items-center gap-2 text-white/60 text-xs mt-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                Saving...
              </div>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/30 rounded-sm hover:bg-white/10 hover:text-white transition-colors"
              >
                ← Back to Inbox
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Advisor */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Advisor</label>
          <Select value={proposal.advisor_name || ''} onValueChange={(v) => handleUpdate('advisor_name', v)}>
            <SelectTrigger className="h-8 text-xs rounded-sm">
              <SelectValue placeholder="Select advisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Trevor Fine">Trevor Fine</SelectItem>
              <SelectItem value="Roger Eskinazi">Roger Eskinazi</SelectItem>
              <SelectItem value="Malcolm Munsamy">Malcolm Munsamy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mandate toggle */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Mandate Included</label>
          <div className="flex gap-2 h-8 items-center">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleMandateToggle(opt)}
                className={`px-3 h-8 text-xs font-medium border rounded-sm transition-all ${
                  mandateValue === opt
                    ? 'bg-navy text-white border-navy'
                    : 'bg-card text-navy border-border hover:border-navy'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {mandateValue === 'Yes' ? 'Doc B — CDM' : 'Doc A — Disclosure & ROA'}
          </p>
        </div>

        {/* Proposal Status */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Status</label>
          <Select value={displayStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}