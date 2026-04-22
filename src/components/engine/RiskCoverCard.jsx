import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RISK_COVER_PROVIDERS, RISK_COVER_TYPES } from '@/lib/constants';

function Row({ label, children }) {
  return (
    <div className="flex gap-2.5 py-2 border-b border-border items-center last:border-b-0">
      <div className="text-[10px] font-medium tracking-[.08em] uppercase text-muted-foreground min-w-[160px] flex-shrink-0">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function formatNumber(raw) {
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return raw;
  return num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InlineInput({ value, onChange, placeholder, isAmount, isPercent }) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    let v = e.target.value;
    if (isPercent) {
      v = v.replace(/%/g, '').replace(/[^0-9.]/g, '');
      if (v !== '') v = v + '%';
    }
    onChange(v);
  };

  const displayValue = isAmount && !focused && value ? formatNumber(value) : value;

  return (
    <input
      className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
    />
  );
}

function CheckTag({ label, checked, onChange }) {
  return (
    <label className={`flex items-center gap-2 px-3 py-1.5 border cursor-pointer text-[11px] font-medium transition-colors ${checked ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:border-teal/40'}`}>
      <div className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-teal border-teal' : 'border-muted-foreground'}`}>
        {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
      </div>
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

// Types that need their own sum assured field (shown AFTER the Life Cover sum assured row)
const NEEDS_OWN_AMOUNT = ['dread_disease', 'lump_sum_disability', 'income_disability'];

export default function RiskCoverCard({ data, onChange }) {
  const riskCoverTypes = Array.isArray(data.risk_cover_types) ? data.risk_cover_types : [];
  const coverAmounts = data.risk_cover_amounts || {};

  const toggleType = (id) => {
    const updated = riskCoverTypes.includes(id)
      ? riskCoverTypes.filter(t => t !== id)
      : [...riskCoverTypes, id];
    onChange('risk_cover_types', updated);
  };

  const handleCoverAmount = (id, val) => {
    onChange('risk_cover_amounts', { ...coverAmounts, [id]: val });
  };

  const selectedSpecialTypes = riskCoverTypes.filter(t => NEEDS_OWN_AMOUNT.includes(t));

  return (
    <div className="border border-border bg-card mb-3 overflow-hidden border-t-2 border-t-teal">
      <div className="px-4 py-3 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[.06em] uppercase text-navy">Risk cover recommendation</span>
        <span className="text-[9px] font-medium text-white px-2.5 py-1 tracking-[.06em] uppercase bg-teal">Risk cover</span>
      </div>
      <div className="p-4 space-y-0">
        {/* Cover types */}
        <div className="mb-3 pb-3 border-b border-border">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-muted-foreground mb-2">Cover types included</div>
          <div className="flex flex-wrap gap-2">
            {RISK_COVER_TYPES.map(t => (
              <CheckTag
                key={t.id}
                label={t.label}
                checked={riskCoverTypes.includes(t.id)}
                onChange={() => toggleType(t.id)}
              />
            ))}
          </div>
        </div>

        <Row label="Provider">
          <Select value={data.risk_cover_provider || ''} onValueChange={v => onChange('risk_cover_provider', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {RISK_COVER_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        {/* Life Cover sum assured — renamed per brief */}
        <Row label="Life cover sum assured / cover">
          <InlineInput
            value={data.risk_cover_amount || ''}
            onChange={v => onChange('risk_cover_amount', v)}
            placeholder="e.g. R3,500,000"
            isAmount
          />
        </Row>

        {/* Per-type sum assured for dread disease / disability — shown UNDER life cover row */}
        {selectedSpecialTypes.map(typeId => {
          const typeLabel = RISK_COVER_TYPES.find(t => t.id === typeId)?.label || typeId;
          const rowLabel = typeId === 'income_disability'
            ? `${typeLabel} — SUM ASSURED (p.m)`
            : `${typeLabel} — sum assured`;
          return (
            <Row key={typeId} label={rowLabel}>
              <InlineInput
                value={coverAmounts[typeId] || ''}
                onChange={v => handleCoverAmount(typeId, v)}
                placeholder="e.g. R1,500,000"
                isAmount
              />
            </Row>
          );
        })}

        <Row label="Monthly premium">
          <InlineInput
            value={data.risk_cover_premium || ''}
            onChange={v => onChange('risk_cover_premium', v)}
            placeholder="e.g. 5,000.00"
            isAmount
          />
        </Row>
        <Row label="Annual premium increase %">
          <InlineInput
            value={data.risk_cover_premium_increase || ''}
            onChange={v => onChange('risk_cover_premium_increase', v)}
            placeholder="e.g. 5%"
            isPercent
          />
        </Row>
        <Row label="Annual cover increase %">
          <InlineInput
            value={data.risk_cover_cover_increase || ''}
            onChange={v => onChange('risk_cover_cover_increase', v)}
            placeholder="e.g. 5%"
            isPercent
          />
        </Row>
        <div className="pt-2">
          <textarea
            className="border border-border bg-muted font-raleway text-[13px] text-foreground w-full outline-none p-3 resize-y min-h-[70px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
            value={data.risk_cover_rationale || ''}
            onChange={e => onChange('risk_cover_rationale', e.target.value)}
            placeholder="Suitability rationale — why this risk cover recommendation is appropriate..."
          />
        </div>
      </div>
    </div>
  );
}