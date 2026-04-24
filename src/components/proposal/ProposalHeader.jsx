import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ProposalHeader({ proposal, client, onUpdate, isSaving }) {
  const handleUpdate = async (field, value) => {
    await onUpdate(field, value);
    toast.success('Saved');
  };

  const handleMandateToggle = async (value) => {
    const docType = value === 'Yes' ? 'Document B' : 'Document A';
    await onUpdate('mandate_included', value);
    await onUpdate('output_document_type', docType);
    toast.success('Saved');
  };

  const clientName = client
    ? (client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim())
    : (proposal.client_name || 'Client');
  const idNumber = client?.sa_id_number || client?.passport_number || '';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Blue header banner */}
      <div className="bg-navy text-white px-5 py-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{proposal.reference}</h1>
            <p className="text-white/80 text-sm font-medium mt-0.5">{clientName}</p>
            {idNumber && <p className="text-white/50 text-xs mt-0.5">{idNumber}</p>}
            {client?.risk_profile && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">
                Risk: {client.risk_profile}
              </span>
            )}
          </div>
          {isSaving && (
            <div className="flex items-center gap-2 text-white/60 text-xs mt-1">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
              Saving...
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Mandate toggle — drives document type automatically */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Mandate Included</label>
          <div className="flex gap-2 h-8 items-center">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleMandateToggle(opt)}
                className={`px-3 h-8 text-xs font-medium border rounded-sm transition-all ${
                  proposal.mandate_included === opt
                    ? 'bg-navy text-white border-navy'
                    : 'bg-card text-navy border-border hover:border-navy'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {proposal.mandate_included === 'Yes' ? 'Doc B — CDM' : 'Doc A — Disclosure & ROA'}
          </p>
        </div>

        {/* PDF Status */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">PDF Status</label>
          <div className={`px-3 h-8 flex items-center rounded-sm text-xs font-medium ${
            proposal.pdf_status === 'Current'
              ? 'bg-green-100 text-green-700'
              : proposal.pdf_status === 'Outdated'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-muted text-muted-foreground'
          }`}>
            {proposal.pdf_status || 'No PDF'}
          </div>
        </div>

        {/* Proposal Status */}
        <div>
          <label className="text-[10px] font-semibold text-navy uppercase tracking-wide block mb-1">Status</label>
          <Select value={proposal.proposal_status || proposal.status || ''} onValueChange={(v) => handleUpdate('proposal_status', v)}>
            <SelectTrigger className="h-8 text-xs rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Awaiting Client Signature">Awaiting Client Signature</SelectItem>
              <SelectItem value="Signed">Signed</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}