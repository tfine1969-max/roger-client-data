import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RISK_PROFILES, BUDGETS, HORIZONS, INVESTMENT_PROVIDERS_LOCAL, INVESTMENT_PROVIDERS_OFFSHORE, OFFSHORE_CURRENCIES } from '@/lib/constants';

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

function InlineInput({ value, onChange, placeholder, isPercent }) {
  const handleChange = (e) => {
    let v = e.target.value;
    if (isPercent) {
      // Strip any existing % and non-numeric chars except dot
      v = v.replace(/%/g, '').replace(/[^0-9.]/g, '');
      if (v !== '') v = v + '%';
    }
    onChange(v);
  };

  const displayValue = isPercent && value ? value : value;

  return (
    <input
      className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
}

export default function InvestmentCard({ data, onChange }) {
  const isOffshore = data.investment_type === 'offshore';
  const providers = isOffshore ? INVESTMENT_PROVIDERS_OFFSHORE : INVESTMENT_PROVIDERS_LOCAL;

  return (
    <div className="border border-border bg-card mb-3 overflow-hidden border-t-2 border-t-ocean">
      <div className="px-4 py-3 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[.06em] uppercase text-navy">Investment recommendation</span>
        <span className="text-[9px] font-medium text-white px-2.5 py-1 tracking-[.06em] uppercase bg-ocean">Investment</span>
      </div>
      <div className="p-4 space-y-0">
        {/* Financial profile */}
        <div className="mb-3 pb-3 border-b border-border">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-muted-foreground mb-2">Client financial profile</div>
          <Row label="Risk profile">
            <Select value={data.risk_profile || ''} onValueChange={v => onChange('risk_profile', v)}>
              <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {RISK_PROFILES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Monthly budget">
            <Select value={data.monthly_budget || ''} onValueChange={v => onChange('monthly_budget', v)}>
              <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Time horizon">
            <Select value={data.time_horizon || ''} onValueChange={v => onChange('time_horizon', v)}>
              <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
        </div>

        {/* Investment type */}
        <Row label="Local or offshore">
          <Select value={data.investment_type || ''} onValueChange={v => onChange('investment_type', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local (ZAR)</SelectItem>
              <SelectItem value="offshore">Offshore</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        {/* Currency — only for offshore */}
        {isOffshore && (
          <Row label="Currency">
            <Select value={data.investment_currency || ''} onValueChange={v => onChange('investment_currency', v)}>
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
          <Select value={data.investment_provider || ''} onValueChange={v => onChange('investment_provider', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder={data.investment_type ? 'Select provider' : 'Select local/offshore first'} />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Amount / contribution">
          <InlineInput
            value={data.investment_amount || ''}
            onChange={v => onChange('investment_amount', v)}
            placeholder="e.g. R5,000 pm"
          />
        </Row>
        <Row label="Annual fee (TIC / all-in)">
          <InlineInput
            value={data.investment_fee || ''}
            onChange={v => onChange('investment_fee', v)}
            placeholder="e.g. 0.95"
            isPercent
          />
        </Row>
        <Row label="WW advisory fee">
          <InlineInput
            value={data.investment_wwfee || ''}
            onChange={v => onChange('investment_wwfee', v)}
            placeholder="e.g. 0.50"
            isPercent
          />
        </Row>
        <div className="pt-2">
          <textarea
            className="border border-border bg-muted font-raleway text-[13px] text-foreground w-full outline-none p-3 resize-y min-h-[70px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
            value={data.investment_rationale || ''}
            onChange={e => onChange('investment_rationale', e.target.value)}
            placeholder="Suitability rationale — why this investment recommendation is appropriate..."
          />
        </div>
      </div>
    </div>
  );
}