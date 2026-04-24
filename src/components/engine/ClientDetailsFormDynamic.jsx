import React from 'react';
import { NEEDS_OPTIONS } from '@/lib/constants';
import { ChevronRight, Edit2 } from 'lucide-react';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="text-xs font-medium text-navy mt-0.5">{value || '—'}</p>
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

  return (
    <div className="w-full">
      <div className="border border-border bg-card mb-3">
        <div className="px-4 py-2 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-navy">Client Summary</span>
          <button type="button" onClick={() => window.history.back()} className="flex items-center gap-1 text-[10px] text-ocean hover:text-navy font-medium">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2.5">
          <Field label="Full Name" value={data.client_name} />
          <Field label="ID Number" value={data.client_id_number} />
          <Field label="Date of Birth" value={data.client_dob} />
          <Field label="ID Type" value={data.identification_type === 'sa_id' ? 'SA ID' : 'Passport'} />
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

      <div className="border border-border bg-card mb-3">
        <div className="px-4 py-2 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-navy">Needs Identified</span>
          <span className="text-[9px] text-muted-foreground">Select all that apply</span>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {NEEDS_OPTIONS.map(opt => (
            <label key={opt.id} className={`flex items-center gap-2 p-2 border cursor-pointer text-xs font-medium transition-colors ${needs.includes(opt.id) ? 'border-navy bg-navy/5 text-navy' : 'border-border text-muted-foreground hover:border-navy/40'}`}>
              <div className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center ${needs.includes(opt.id) ? 'bg-navy border-navy' : 'border-muted-foreground'}`}>
                {needs.includes(opt.id) && <span className="text-white text-[7px] font-bold">✓</span>}
              </div>
              {opt.label}
              <input type="checkbox" checked={needs.includes(opt.id)} onChange={() => toggleNeed(opt.id)} className="sr-only" />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={needs.length === 0}
        className="w-full bg-navy text-white py-3 text-[11px] font-medium tracking-[.1em] uppercase hover:bg-ocean transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Proceed to recommendations <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}