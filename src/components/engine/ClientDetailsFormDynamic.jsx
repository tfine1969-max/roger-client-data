import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { NEEDS_OPTIONS } from '@/lib/constants';
import { ChevronRight } from 'lucide-react';

const TAX_RESIDENCY_OPTIONS = ['South Africa', 'United Kingdom', 'United States', 'Australia', 'Other'];

// Extract DOB from SA ID (YYMMDD...)
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

export default function ClientDetailsFormDynamic({ data, onChange, onProceed }) {
  const canProceed = data.client_name?.trim();
  
  // Parse needs array
  const needs = Array.isArray(data.needs_array) ? data.needs_array : [];
  const clientType = data.client_type || 'natural_person';
  const idType = data.identification_type || '';

  const toggleNeed = (id) => {
    const updated = needs.includes(id) ? needs.filter(n => n !== id) : [...needs, id];
    onChange('needs_array', updated);
    const labels = updated.map(n => NEEDS_OPTIONS.find(o => o.id === n)?.label).filter(Boolean);
    onChange('needs_identified', labels.join(', '));
  };

  // Handle SA ID change with auto-extraction
  const handleSaIdChange = (val) => {
    onChange('client_id_number', val);
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length === 13 && val === digitsOnly) {
      const dob = dobFromSAId(digitsOnly);
      if (dob) onChange('client_dob', dob);
    }
  };

  const val = data.client_id_number || '';
  const digitsOnly = val.replace(/\D/g, '');
  const isPureDigits = val.length > 0 && val === digitsOnly;
  const idError = clientType === 'natural_person' && idType === 'sa_id' && isPureDigits && digitsOnly.length > 0 && digitsOnly.length < 13
    ? `${digitsOnly.length}/13 digits`
    : null;

  return (
    <div className="w-full">
      {/* Client Type Selection */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">01 — Client type</div>
        </div>
        <div className="p-5">
          <Field label="Client type" required>
            <Select value={clientType} onValueChange={v => onChange('client_type', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select client type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="natural_person">Natural Person</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="trust">Trust</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* NATURAL PERSON */}
      {clientType === 'natural_person' && (
        <>
          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">02 — Client identity</div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Full name" required>
                <Input value={data.client_name || ''} onChange={e => onChange('client_name', e.target.value)} placeholder="Full name" className="rounded-sm" />
              </Field>
              <Field label="Identification type" required>
                <Select value={idType} onValueChange={v => onChange('identification_type', v)}>
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select ID type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sa_id">South African ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {idType === 'sa_id' && (
                <>
                  <Field label="SA ID Number" required>
                    <Input
                      value={data.client_id_number || ''}
                      onChange={e => handleSaIdChange(e.target.value)}
                      placeholder="13-digit SA ID"
                      maxLength={20}
                      className={`rounded-sm font-mono tracking-wider ${idError ? 'border-destructive' : ''}`}
                    />
                    {idError && <p className="text-[10px] text-destructive mt-0.5">{idError}</p>}
                  </Field>
                </>
              )}

              {idType === 'passport' && (
                <>
                  <Field label="Passport Number" required>
                    <Input
                      value={data.client_id_number || ''}
                      onChange={e => onChange('client_id_number', e.target.value)}
                      placeholder="Passport number"
                      className="rounded-sm font-mono tracking-wider"
                    />
                  </Field>
                </>
              )}

              {idType && (
                <Field label="Date of birth" required>
                  <Input type="date" value={data.client_dob || ''} onChange={e => onChange('client_dob', e.target.value)} className="rounded-sm" />
                </Field>
              )}

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

          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">03 — Contact details</div>
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
        </>
      )}

      {/* COMPANY */}
      {clientType === 'company' && (
        <>
          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">02 — Company details</div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Registered company name" required>
                <Input value={data.client_name || ''} onChange={e => onChange('client_name', e.target.value)} placeholder="Legal company name" className="rounded-sm" />
              </Field>
              <Field label="CIPC registration number" required>
                <Input value={data.company_registration_number || ''} onChange={e => onChange('company_registration_number', e.target.value)} placeholder="e.g. 2021/123456" className="rounded-sm" />
              </Field>
              <Field label="Trading name (if applicable)">
                <Input value={data.company_trading_name || ''} onChange={e => onChange('company_trading_name', e.target.value)} placeholder="Trading name" className="rounded-sm" />
              </Field>
              <Field label="Country of incorporation">
                <Input value={data.company_incorporation_country || ''} onChange={e => onChange('company_incorporation_country', e.target.value)} placeholder="South Africa" className="rounded-sm" />
              </Field>
              <Field label="Date of incorporation">
                <Input type="date" value={data.company_incorporation_date || ''} onChange={e => onChange('company_incorporation_date', e.target.value)} className="rounded-sm" />
              </Field>
              <Field label="VAT number (if applicable)">
                <Input value={data.company_vat_number || ''} onChange={e => onChange('company_vat_number', e.target.value)} placeholder="VAT number" className="rounded-sm" />
              </Field>
              <Field label="Industry / nature of business">
                <Input value={data.company_industry || ''} onChange={e => onChange('company_industry', e.target.value)} placeholder="e.g. Retail, Financial Services" className="rounded-sm col-span-2" />
              </Field>
            </div>
          </div>

          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">03 — Contact details</div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Email address">
                <Input type="email" value={data.client_email || ''} onChange={e => onChange('client_email', e.target.value)} placeholder="company@email.com" className="rounded-sm" />
              </Field>
              <Field label="Contact number">
                <Input type="tel" value={data.client_mobile || ''} onChange={e => onChange('client_mobile', e.target.value)} placeholder="+27" className="rounded-sm" />
              </Field>
            </div>
          </div>
        </>
      )}

      {/* TRUST */}
      {clientType === 'trust' && (
        <>
          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">02 — Trust details</div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Trust name" required>
                <Input value={data.client_name || ''} onChange={e => onChange('client_name', e.target.value)} placeholder="Legal trust name" className="rounded-sm" />
              </Field>
              <Field label="Trust registration / master's reference" required>
                <Input value={data.trust_registration_number || ''} onChange={e => onChange('trust_registration_number', e.target.value)} placeholder="Reference number" className="rounded-sm" />
              </Field>
              <Field label="Country of formation">
                <Input value={data.trust_formation_country || ''} onChange={e => onChange('trust_formation_country', e.target.value)} placeholder="South Africa" className="rounded-sm" />
              </Field>
              <Field label="Date of creation">
                <Input type="date" value={data.trust_creation_date || ''} onChange={e => onChange('trust_creation_date', e.target.value)} className="rounded-sm" />
              </Field>
              <Field label="Nature / purpose of trust">
                <Input value={data.trust_purpose || ''} onChange={e => onChange('trust_purpose', e.target.value)} placeholder="e.g. Family trust, Charitable trust" className="rounded-sm col-span-2" />
              </Field>
            </div>
          </div>

          <div className="border border-border bg-card mb-4">
            <div className="px-5 py-3 bg-muted border-b border-border">
              <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">03 — Contact details</div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Email address">
                <Input type="email" value={data.client_email || ''} onChange={e => onChange('client_email', e.target.value)} placeholder="trust@email.com" className="rounded-sm" />
              </Field>
              <Field label="Contact number">
                <Input type="tel" value={data.client_mobile || ''} onChange={e => onChange('client_mobile', e.target.value)} placeholder="+27" className="rounded-sm" />
              </Field>
            </div>
          </div>
        </>
      )}

      {/* Needs Identified (common to all client types) */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">04 — Needs identified</div>
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

      {/* Additional Notes */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">05 — Additional notes</div>
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