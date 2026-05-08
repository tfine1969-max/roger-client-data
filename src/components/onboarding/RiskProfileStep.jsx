import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ADVISORY_NEEDS = [
  'Local and offshore investments', 'Retirement planning', 'Life & risk cover',
  'Estate planning', 'Tax planning', 'Business assurance', 'Education planning'
];

const INVESTMENT_NEEDS = ['Local and offshore investments', 'Retirement planning', 'Education planning'];

const scoreToProfile = (score) => {
  if (score <= 2) return 'Conservative';
  if (score <= 4) return 'Cautious';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Growth';
  return 'Aggressive';
};

export default function RiskProfileStep({
  formData,
  handleChange,
  toggleArrayItem,
  riskScore,
  profileOverridden,
  setProfileOverridden,
}) {
  const needsRiskQuestionnaire = (formData.advisory_needs || []).some(n => INVESTMENT_NEEDS.includes(n));

  return (
    <div className="space-y-3">
      {/* Advisory Needs — always shown first */}
      <div className="border border-border rounded p-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">ADVISORY NEEDS</h3>
          <span className="text-[10px] text-muted-foreground">SELECT ALL THAT APPLY</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ADVISORY_NEEDS.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded hover:bg-secondary/50 text-xs">
              <input
                type="checkbox"
                checked={(formData.advisory_needs || []).includes(item)}
                onChange={() => toggleArrayItem('advisory_needs', item)}
                className="w-3.5 h-3.5 accent-ocean"
              />
              {item}
            </label>
          ))}
        </div>
        {!needsRiskQuestionnaire && (formData.advisory_needs || []).length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Select <strong>Local and offshore investments</strong>, <strong>Retirement planning</strong>, or <strong>Education planning</strong> to complete the risk questionnaire.
          </p>
        )}
      </div>

      {/* Risk Tolerance Questionnaire — only visible when investment needs selected */}
      {needsRiskQuestionnaire && (
        <div className="border border-border rounded p-3">
          <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">RISK TOLERANCE QUESTIONNAIRE *</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">IF YOUR PORTFOLIO FELL 20% IN 3 MONTHS *</Label>
              <Select value={formData.portfolio_drop_response || undefined} onValueChange={v => handleChange('portfolio_drop_response', v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select your response" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sell immediately">Sell immediately - protect what's left</SelectItem>
                  <SelectItem value="Hold">Hold - wait for recovery</SelectItem>
                  <SelectItem value="Buy more">Buy more - take the opportunity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PRIMARY INVESTMENT OBJECTIVE *</Label>
              <Select value={formData.primary_investment_objective || undefined} onValueChange={v => handleChange('primary_investment_objective', v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Capital preservation', 'Income generation', 'Moderate growth', 'Aggressive growth', 'Speculation'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TIME HORIZON *</Label>
              <Select value={formData.time_horizon || undefined} onValueChange={v => handleChange('time_horizon', v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">LIQUIDITY REQUIREMENT *</Label>
              <Select value={formData.liquidity_requirement || undefined} onValueChange={v => handleChange('liquidity_requirement', v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Immediate access required', 'Access within 1 year', 'Access within 3 years', 'Long-term - no immediate need'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {(formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) && (
            <div className="mt-2 p-2 bg-ocean/5 border border-ocean/20 rounded">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold tracking-wider text-ocean uppercase">CALCULATED RISK SCORE</span>
                <span className="text-sm font-bold text-ocean">{riskScore} / 10</span>
              </div>
              <div className="w-full bg-border rounded-full h-1.5 my-1">
                <div className="h-1.5 rounded-full bg-ocean transition-all" style={{ width: `${riskScore * 10}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Based on your answers — auto-selecting <strong>{scoreToProfile(riskScore)}</strong></p>
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">RISK PROFILE *</Label>
              {profileOverridden && (
                <button type="button" onClick={() => setProfileOverridden(false)} className="text-[10px] text-ocean hover:underline">Reset to calculated</button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { value: 'Conservative', sub: 'Capital protection' },
                { value: 'Cautious', sub: 'Low risk' },
                { value: 'Moderate', sub: 'Balanced' },
                { value: 'Growth', sub: 'Long-term' },
                { value: 'Aggressive', sub: 'Max growth' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { setProfileOverridden(true); handleChange('risk_profile', opt.value); }}
                  className={`p-2 border rounded text-left transition-all ${formData.risk_profile === opt.value ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
                  <p className={`text-xs font-semibold ${formData.risk_profile === opt.value ? 'text-ocean' : 'text-navy'}`}>{opt.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</p>
                  {formData.risk_profile === opt.value && <div className="h-0.5 bg-ocean mt-1 rounded" />}
                </button>
              ))}
            </div>
            {profileOverridden && (
              <p className="text-[10px] text-warn mt-1">Profile manually overridden — calculated profile: <strong>{scoreToProfile(riskScore)}</strong></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}