import React from 'react';
import { NEEDS_OPTIONS } from '@/lib/constants';
import { ChevronRight, Edit2 } from 'lucide-react';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-medium text-navy">{value || '—'}</p>
    </div>
  );
}

export default function ClientDetailsFormDynamic({ data, onChange, onProceed }) {
  const needs = Array.isArray(data.needs_array) ? data.needs_array : [];

  const toggleNeed = (id) => {
    const updated = needs.includes(id) ? needs.filter(n => n !== id) : [...needs, id];
    onChange('needs_array', updated);
    const labels = updated.map(n => NEEDS_OPTIONS.find(o => o.id === n)?.label).filter(Boolean);
    onChange('needs_identified', labels.join(', '));
  };

  // Determine if this is an entity client (trust or company)
  const clientType = data.client_type;
  const isEntity = clientType === 'trust' || clientType === 'company' ||
    clientType === 'Trust' || clientType === 'Company';

  // For entity: show registration/trust number; for natural person: show ID + DOB
  const regNumber = data.client_id_number || data.trust_registration_number ||
    data.company_registration_number || data.trust_number || '';

  const idLabel = clientType === 'trust' || clientType === 'Trust'
    ? 'IT / Trust Reg No.'
    : clientType === 'company' || clientType === 'Company'
    ? 'Company Reg No.'
    : 'ID Number';

  return (
    <div className="w-full">
      <div className="border border-border bg-card mb-3">
        <div className="px-4 py-2 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-navy">Client Summary</span>
          <button type="button" onClick={() => window.history.back()} className="flex items-center gap-1 text-[10px] text-ocean hover:text-navy font-medium">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="p-5 grid grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Full Name" value={data.client_name} />
          <Field label={idLabel} value={regNumber} />
          {isEntity ? (
            <>
              <Field label="Email" value={data.client_email} />
              <Field label="Mobile" value={data.client_mobile} />
            </>
          ) : (
            <>
              <Field label="Date of Birth" value={data.client_dob} />
              <Field label="ID Type" value={data.identification_type === 'sa_id' ? 'SA ID' : data.identification_type === 'passport' ? 'Passport' : '—'} />
            </>
          )}
          <Field label="Email" value={data.client_email} />
          <Field label="Mobile" value={data.client_mobile} />
          <Field label="Risk Profile" value={data.risk_profile} />
          <Field label="Time Horizon" value={data.time_horizon} />
          {Array.isArray(data.advisory_needs) && data.advisory_needs.length > 0 && (
            <div className="col-span-4">
              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">Advisory Needs</p>
              <p className="text-xs font-medium text-navy mt-0.5">{data.advisory_needs.join(' · ')}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onProceed}
        className="w-full bg-navy text-white py-3 text-[11px] font-medium tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Proceed to recommendations <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}