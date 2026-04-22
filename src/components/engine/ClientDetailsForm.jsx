import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RISK_PROFILES, BUDGETS, HORIZONS } from '@/lib/constants';
import { ChevronRight } from 'lucide-react';

const LIQUIDITY_OPTIONS = ['Immediate access required', 'Within 1 year', '1–3 years', '3+ years', 'No liquidity requirements'];
const TAX_RESIDENCY_OPTIONS = ['South Africa', 'United Kingdom', 'United States', 'Australia', 'Other'];

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

export default function ClientDetailsForm({ data, onChange, onProceed }) {
  const canProceed = data.client_name?.trim();

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
          <Field label="ID / Passport number">
            <Input value={data.client_id_number || ''} onChange={e => onChange('client_id_number', e.target.value)} placeholder="ID or passport" className="rounded-sm" />
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

      {/* Section: Financial profile */}
      <div className="border border-border bg-card mb-4">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="text-[9px] font-medium tracking-[.14em] uppercase text-navy">03 — Financial profile</div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Risk profile">
            <Select value={data.risk_profile || ''} onValueChange={v => onChange('risk_profile', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {RISK_PROFILES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monthly budget">
            <Select value={data.monthly_budget || ''} onValueChange={v => onChange('monthly_budget', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Investment horizon">
            <Select value={data.time_horizon || ''} onValueChange={v => onChange('time_horizon', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {HORIZONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Liquidity needs">
            <Select value={data.client_liquidity_needs || ''} onValueChange={v => onChange('client_liquidity_needs', v)}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {LIQUIDITY_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label="Needs identified">
              <Input value={data.needs_identified || ''} onChange={e => onChange('needs_identified', e.target.value)} placeholder="e.g. Life cover, Retirement planning, Offshore investment" className="rounded-sm" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes">
              <Textarea value={data.notes || ''} onChange={e => onChange('notes', e.target.value)} placeholder="Any additional context..." className="rounded-sm min-h-[70px]" />
            </Field>
          </div>
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!canProceed}
        className="w-full bg-navy text-white py-4 text-[13px] font-medium tracking-[.1em] uppercase hover:bg-ocean transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Proceed to recommendations <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}