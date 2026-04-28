import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientDocumentRepository from '@/components/ClientDocumentRepository';
import { base44 } from '@/api/base44Client';

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), d.getFullYear()].join('-');
  } catch { return iso; }
};

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-medium text-navy">{value || '—'}</p>
    </div>
  );
}

export default function Step01ClientDetails({ data, onFieldChange, onNext, proposal, client, onClientStatusUpdate }) {
  const [clientProposals, setClientProposals] = useState([]);

  useEffect(() => {
    if (!client?.id) return;
    base44.entities.Proposal.list().then(all => {
      setClientProposals(all.filter(p => p.client_id === client.id));
    });
  }, [client?.id]);

  const isEntity = data.client_type === 'trust' || data.client_type === 'company'
    || data.client_type === 'Trust' || data.client_type === 'Company';

  const idLabel = data.client_type === 'trust' || data.client_type === 'Trust'
    ? 'IT / Trust Reg No.'
    : data.client_type === 'company' || data.client_type === 'Company'
    ? 'Company Reg No.'
    : 'ID Number';

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

      {/* Advisor */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Advisor</label>
            <Select value={data.advisor_name || ''} onValueChange={v => onFieldChange('advisor_name', v)}>
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
        </div>
      </div>

      {/* FICA Document Repository */}
      {client && (
        <ClientDocumentRepository
          client={client}
          proposals={clientProposals}
          onStatusUpdate={onClientStatusUpdate}
        />
      )}

      {/* Next button */}
      <button
        onClick={() => {
          if (data.status === 'Outdated') {
            alert('The PDF is outdated due to recent changes. Please regenerate the PDF before proceeding.');
            return;
          }
          onNext();
        }}
        className="w-full bg-navy text-white py-3.5 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Add Recommendations →
      </button>

    </div>
  );
}