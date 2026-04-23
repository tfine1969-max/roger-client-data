import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProposalHeader({ proposal, client, onUpdate, isSaving }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-navy text-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{proposal.reference}</h1>
            <p className="text-white/60 text-sm mt-1">{client?.full_name || 'Client'}</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Advisor Name */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Advisor
          </label>
          <Select value={proposal.advisor_name || ''} onValueChange={(v) => onUpdate('advisor_name', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select advisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Trevor Fine">Trevor Fine</SelectItem>
              <SelectItem value="Roger Eskinazi">Roger Eskinazi</SelectItem>
              <SelectItem value="Malcolm Munsamy">Malcolm Munsamy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mandate Included */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Mandate Included
          </label>
          <Select value={proposal.mandate_included || ''} onValueChange={(v) => onUpdate('mandate_included', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Document Type */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Document Type
          </label>
          <Select value={proposal.output_document_type || ''} onValueChange={(v) => onUpdate('output_document_type', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Document A">Document A</SelectItem>
              <SelectItem value="Document B">Document B</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PDF Status */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            PDF Status
          </label>
          <div className={`px-4 py-2 rounded-sm text-sm font-medium text-center ${
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
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-2">
            Status
          </label>
          <Select value={proposal.proposal_status || ''} onValueChange={(v) => onUpdate('proposal_status', v)}>
            <SelectTrigger className="rounded-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Modified">Modified</SelectItem>
              <SelectItem value="PDF Generated">PDF Generated</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Saving Indicator */}
        {isSaving && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <div className="w-2 h-2 bg-ocean rounded-full animate-pulse" />
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}