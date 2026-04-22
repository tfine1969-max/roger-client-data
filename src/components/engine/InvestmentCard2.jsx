import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVESTMENT_PROVIDERS_LOCAL, INVESTMENT_PROVIDERS_OFFSHORE, OFFSHORE_CURRENCIES } from '@/lib/constants';
import { X } from 'lucide-react';

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

function formatAmount(raw) {
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return raw;
  return num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InlineInput({ value, onChange, placeholder, isPercent, isAmount }) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    let v = e.target.value;
    if (isPercent) {
      v = v.replace(/%/g, '').replace(/[^0-9.]/g, '');
      if (v !== '') v = v + '%';
    }
    onChange(v);
  };

  const displayValue = isAmount && !focused && value ? formatAmount(value) : value;

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

export default function InvestmentCard2({ data, onChange, onRemove }) {
  const isOffshore = data.investment2_type === 'offshore';
  const providers = isOffshore ? INVESTMENT_PROVIDERS_OFFSHORE : INVESTMENT_PROVIDERS_LOCAL;

  return (
    <div className="border border-border bg-card mb-3 overflow-hidden border-t-2 border-t-ocean">
      <div className="px-4 py-3 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[.06em] uppercase text-navy">Investment recommendation 2</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium text-white px-2.5 py-1 tracking-[.06em] uppercase bg-ocean">Investment</span>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-0">
        <Row label="Local or offshore">
          <Select value={data.investment2_type || ''} onValueChange={v => onChange('investment2_type', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local (ZAR)</SelectItem>
              <SelectItem value="offshore">Offshore</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        {isOffshore && (
          <Row label="Currency">
            <Select value={data.investment2_currency || ''} onValueChange={v => onChange('investment2_currency', v)}>
              <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {OFFSHORE_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
        )}

        <Row label="Provider">
          <Select value={data.investment2_provider || ''} onValueChange={v => onChange('investment2_provider', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder={data.investment2_type ? 'Select provider' : 'Select local/offshore first'} />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Amount / contribution">
          <InlineInput
            value={data.investment2_amount || ''}
            onChange={v => onChange('investment2_amount', v)}
            placeholder="e.g. 1000000"
            isAmount
          />
        </Row>
        <Row label="Annual fee (TIC / all-in)">
          <InlineInput
            value={data.investment2_fee || ''}
            onChange={v => onChange('investment2_fee', v)}
            placeholder="e.g. 0.95"
            isPercent
          />
        </Row>
        <Row label="WW advisory fee">
          <InlineInput
            value={data.investment2_wwfee || ''}
            onChange={v => onChange('investment2_wwfee', v)}
            placeholder="e.g. 0.50"
            isPercent
          />
        </Row>
        <div className="pt-2">
          <textarea
            className="border border-border bg-muted font-raleway text-[13px] text-foreground w-full outline-none p-3 resize-y min-h-[70px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
            value={data.investment2_rationale || ''}
            onChange={e => onChange('investment2_rationale', e.target.value)}
            placeholder="Suitability rationale — why this second investment recommendation is appropriate..."
          />
        </div>
      </div>
    </div>
  );
}