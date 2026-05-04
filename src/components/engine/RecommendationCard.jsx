import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REC_CATEGORIES, REC_PROVIDERS } from '@/lib/constants';

const variants = {
  primary:   { border: 'border-t-2 border-t-ocean', badge: 'bg-ocean' },
  secondary: { border: 'border-t-2 border-t-teal',  badge: 'bg-teal' },
  tertiary:  { border: 'border-t-2 border-t-gold',  badge: 'bg-gold' }
};

export default function RecommendationCard({ num, variant = 'primary', data, onChange, optional = false }) {
  const v = variants[variant];
  const prefix = `rec${num}_`;
  const get = (field) => data[prefix + field] || '';
  const set = (field, val) => onChange(prefix + field, val);

  return (
    <div className={`border border-border bg-card mb-3 overflow-hidden ${v.border}`}>
      <div className="px-4 py-3 border-b border-border bg-muted flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[.06em] uppercase text-navy">
          Recommendation {num}
          {optional && <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground ml-2">Optional</span>}
        </span>
        <span className={`text-[9px] font-medium text-white px-2.5 py-1 tracking-[.06em] uppercase ${v.badge}`}>
          {get('category') || (optional ? 'Optional' : num === 1 ? 'Risk cover' : 'Additional')}
        </span>
      </div>
      <div className="p-4 space-y-0">
        <Row label="Category">
          <Select value={get('category')} onValueChange={v => set('category', v)}>
            <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {REC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Provider">
          {num === 3 ? (
            <input
              className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
              value={get('provider')} onChange={e => set('provider', e.target.value)}
              placeholder="Provider or specialist"
            />
          ) : (
            <Select value={get('provider')} onValueChange={v => set('provider', v)}>
              <SelectTrigger className="border-0 border-b border-border rounded-none bg-transparent px-0 h-auto py-1 text-sm">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {REC_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </Row>
        <Row label={num === 3 ? 'Amount / contribution' : 'Cover / amount'}>
          <input
            className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
            value={get('amount')} onChange={e => set('amount', e.target.value)}
            placeholder={num === 3 ? 'e.g. R2,000 pm' : 'e.g. R3,500,000 sum assured'}
          />
        </Row>
        {num !== 3 && (
          <Row label="Monthly premium / contribution">
            <input
              className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
              value={get('premium')} onChange={e => set('premium', e.target.value)}
              placeholder="e.g. R2,800"
            />
          </Row>
        )}
        <Row label={num === 3 ? 'Fee' : 'Annual fee (TIC / all-in)'}>
          <input
            className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
            value={get('fee')} onChange={e => set('fee', e.target.value)}
            placeholder="e.g. 0.95% p.a."
          />
        </Row>
        {num !== 3 && (
          <Row label="WW advisory fee">
            <input
              className="border-0 border-b border-border bg-transparent font-raleway text-sm text-foreground w-full outline-none py-1 focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic"
              value={get('wwfee')} onChange={e => set('wwfee', e.target.value)}
              placeholder="e.g. 0.50% p.a."
            />
          </Row>
        )}
        <div className="pt-2">
          <textarea
            className="border border-border bg-muted font-raleway text-[13px] text-foreground w-full outline-none p-3 resize-y min-h-[70px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
            value={get('rationale')} onChange={e => set('rationale', e.target.value)}
            placeholder="Suitability rationale — explain why this recommendation is appropriate..."
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-2.5 py-2 border-b border-border items-center last:border-b-0">
      <div className="text-[10px] font-medium tracking-[.08em] uppercase text-muted-foreground min-w-[140px] flex-shrink-0">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
