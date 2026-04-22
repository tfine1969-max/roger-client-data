import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { NEEDS_OPTIONS, RISK_COVER_TYPES } from '@/lib/constants';
import { ChevronRight } from 'lucide-react';

const LIQUIDITY_OPTIONS = ['Immediate access required', 'Within 1 year', '1–3 years', '3+ years', 'No liquidity requirements'];
const TAX_RESIDENCY_OPTIONS = ['South Africa', 'United Kingdom', 'United States', 'Australia', 'Other'];

// Extract DOB from SA ID number (YYMMDD...)
function dobFromSAId(idNumber) {
  if (!idNumber || idNumber.length < 6) return '';
  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  if (!/^\d{6}/.test(idNumber)) return '';
  const year = parseInt(yy) <= 25 ? `20${yy}` : `19${yy}`;
  return `${year}-${mm}-${dd}`;
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">
        {label} {required && <span className="text-ocean">*</span>}
      </Label>
      {children}
    </div>
  );
}

function CheckboxItem({ id, label, checked, onChange }) {
  return (
    <label key={id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${checked ? 'border-navy bg-navy/5' : 'border-border bg-card hover:border-ocean/50'}`}>
      <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-navy border-navy' : 'border-border'}`}>
        {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
      </div>
      <span className="text-[13px] font-medium text-navy">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

export default function ClientDetailsForm({ data, onChange, onProceed }) {
  const canProceed = data.client_name?.trim();

  // Parse needs array
  const needs = Array.isArray(data.needs_array) ? data.needs_array : [];
  const riskCoverTypes = Array.isArray(data.risk_cover_types) ? data.risk_cover_types : [];
  const hasInvestment = needs.includes('investment');
  const hasRiskCover = needs.includes('risk_cover');

  const toggleNeed = (id) => {
    const updated = needs.includes(id) ? needs.filter(n => n !== id) : [...needs, id];
    onChange('needs_array', updated);
    // Sync text field for display
    const labels = updated.map(n => NEEDS_OPTIONS.find(o => o.id === n)?.label).filter(Boolean);
    onChange('needs_identified', labels.join(', '));
  };

  const toggleRiskCoverType = (id) => {
    const updated = riskCoverTypes.includes(id) ? riskCoverTypes.filter(t => t !== id) : [...riskCoverTypes, id];
    onChange('risk_cover_types', updated);
  };

  // Auto-extract DOB from SA ID (13 digits) or accept passport
  const handleIdChange = (val) => {
    onChange('client_id_number', val);
    // Only extract DOB if exactly 13 digits (SA ID)
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length === 13 && val === digitsOnly) {
      const dob = dobFromSAId(digitsOnly);
      if (dob) onChange('client_dob', dob);
    }
  };

  const val = data.client_id_number || '';
  const digitsOnly = val.replace(/\D/g, '');
  // Show digit count hint only when input is all digits and not yet 13
  const isPureDigits = val.length > 0 && val === digitsOnly;
  const idError = isPureDigits && digitsOnly.length > 0 && digitsOnly.length < 13
    ? `${digitsOnly.length}/13 digits`
    : null;

  return (
    <div className="max-w-2xl">
      {/* Section: Identity */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">01 — Client identity</div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Full name" required>
            <Input value={data.client_name || ''} onChange={e => onChange('client_name', e.target.value)} placeholder="Full name" className="rounded-sm" />
          </Field>
          <Field label="SA ID / Passport number">
            <Input
              value={data.client_id_number || ''}
              onChange={e => handleIdChange(e.target.value)}
              placeholder="SA ID (13 digits) or passport"
              className={`rounded-sm font-mono tracking-wider ${idError ? 'border-destructive' : ''}`}
            />
            {idError && <p className="text-[10px] text-destructive mt-0.5">{idError}</p>}
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={data.client_dob || ''} onChange={e => onChange('client_dob', e.target.value)} className="rounded-sm" />
          </Field>
          <Field label="Tax residency">
            <Select value={data.client_tax_residency || ''} onValueChange={v => onChange('client_tax_residency', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {TAX_RESIDENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Section: Contact */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">02 — Contact details</div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Email address">
            <Input type="email" value={data.client_email || ''} onChange={e => onChange('client_email', e.target.value)} placeholder="client@email.com" className="rounded-sm" />
          </Field>
          <Field label="Mobile number">
            <Input type="tel" value={data.client_mobile || ''} onChange={e => onChange('client_mobile', e.target.value)} placeholder="+27" className="rounded-sm" />
          </Field>
        </div>
      </div>

      {/* Section: Needs identified (multi-select) */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">03 — Needs identified</div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {NEEDS_OPTIONS.map(opt => (
              <CheckboxItem
                key={opt.id}
                id={opt.id}
                label={opt.label}
                checked={needs.includes(opt.id)}
                onChange={() => toggleNeed(opt.id)}
              />
            ))}
          </div>


        </div>
      </div>

      {/* Section: Additional notes */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">04 — Additional notes</div>
        </div>
        <div className="p-5">
          <Textarea value={data.notes || ''} onChange={e => onChange('notes', e.target.value)} placeholder="Any additional context..." className="rounded-sm min-h-[70px]" />
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!canProceed || needs.length === 0}
        className="w-full bg-navy text-white py-4 text-[13px] font-medium tracking-[.1em] uppercase hover:bg-ocean transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Proceed to recommendations <ChevronRight className="w-4 h-4" />
      </button>
      {canProceed && needs.length === 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-2">Please select at least one need to continue</p>
      )}
    </div>
  );
}