import React from 'react';
import { Edit2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_OPTIONS = ['Pending Review', 'In Progress', 'Awaiting Client Signature', 'Signed', 'Sent'];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-medium text-navy">{value || '—'}</p>
    </div>
  );
}

export default function Step01ClientDetails({ data, onFieldChange, onNext }) {
  const qc = useQueryClient();
  const proposalId = data.id;

  const isEntity = data.client_type === 'trust' || data.client_type === 'company'
    || data.client_type === 'Trust' || data.client_type === 'Company';

  const idLabel = data.client_type === 'trust' || data.client_type === 'Trust'
    ? 'IT / Trust Reg No.'
    : data.client_type === 'company' || data.client_type === 'Company'
    ? 'Company Reg No.'
    : 'ID Number';

  const mandateValue = data.mandate_included !== null && data.mandate_included !== undefined ? data.mandate_included : 'No';
  const displayStatus = data.proposal_status || (data.status === 'new' ? 'Pending Review' : data.status) || '';

  const handleMandateToggle = async (value) => {
    const outputDocType = value === 'Yes' ? 'Document B' : 'Document A';
    onFieldChange('mandate_included', value);
    onFieldChange('output_document_type', outputDocType);
    // Save mandate_included directly to Proposal
    await base44.entities.Proposal.update(proposalId, {
      mandate_included: value,
      output_document_type: outputDocType
    });
    qc.invalidateQueries({ queryKey: ['proposal', proposalId] });
  };

  const handleStatusChange = (value) => {
    const statusMap = { 'Pending Review': 'new', 'In Progress': 'in_progress', 'Awaiting Client Signature': 'in_progress', 'Signed': 'signed', 'Sent': 'sent' };
    onFieldChange('proposal_status', value);
    onFieldChange('status', statusMap[value] || 'new');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Client Summary */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-navy">Client Summary</span>
          <button type="button" onClick={() => window.history.back()}
            className="flex items-center gap-1 text-[10px] text-ocean hover:text-navy font-medium">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="p-5 grid grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Full Name" value={data.client_name} />
          <Field label={idLabel} value={data.client_id_number} />
          {isEntity ? (
            <>
              <Field label="Email" value={data.client_email} />
              <Field label="Mobile" value={data.client_mobile} />
            </>
          ) : (
            <>
              <Field label="Date of Birth" value={data.client_dob} />
              <Field label="ID Type" value={
                data.identification_type === 'sa_id' ? 'SA ID'
                : data.identification_type === 'passport' ? 'Passport' : '—'
              } />
            </>
          )}
          <Field label="Email" value={data.client_email} />
          <Field label="Mobile" value={data.client_mobile} />
          <Field label="Risk Profile" value={data.risk_profile} />
          <Field label="Time Horizon" value={data.time_horizon} />
          {Array.isArray(data.advisory_needs) && data.advisory_needs.length > 0 && (
            <div className="col-span-4">
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">Advisory Needs</p>
              <p className="text-xs font-medium text-navy">{data.advisory_needs.join(' · ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Advisor / Mandate / Status */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Advisor</label>
            <Select value={data.advisor_name || ''} onValueChange={v => onFieldChange('advisor_name', v)}>
              <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select advisor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Trevor Fine">Trevor Fine</SelectItem>
                <SelectItem value="Roger Eskinazi">Roger Eskinazi</SelectItem>
                <SelectItem value="Malcolm Munsamy">Malcolm Munsamy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Mandate Included</label>
            <div className="flex gap-2">
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button" onClick={() => handleMandateToggle(opt)}
                  className={`px-3 h-8 text-xs font-medium border rounded-sm transition-all ${
                    mandateValue === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{mandateValue === 'Yes' ? 'Doc B — CDM' : 'Doc A — Disclosure & ROA'}</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Status</label>
            <Select value={displayStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full bg-navy text-white py-3.5 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Add Recommendations →
      </button>
    </div>
  );
}