import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PhraseLibrary, { LibraryButton } from '@/components/engine/PhraseLibrary';

const LOCAL_PROVIDERS = ['Investec', 'Sanlam', 'Allan Gray', 'Coronation', 'Ninety One'];
const OFFSHORE_PROVIDERS = ['Vanguard', 'Blackrock', 'Fidelity', 'Charles Schwab', 'Interactive Brokers'];
const CURRENCIES_OFFSHORE = ['USD', 'GBP', 'EUR'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];
const UNDERLYING_FUNDS_OPTIONS = ['Index Fund', 'Balanced Fund', 'Equity Fund', 'Bond Fund', 'Multi-Asset Fund'];
const PRODUCT_TYPES = [
  'Retirement Annuity', 'Living Annuity', 'Endowment', 'Tax-Free Savings Account',
  'Unit Trust / CIS', 'Preservation Fund', 'Pension Fund', 'Provident Fund',
  'Offshore Investment Bond', 'Discretionary Portfolio', 'Model Portfolio',
];

const detectAnnexure = (productType, jurisdiction, currency) => {
  const pt  = String(productType  || '').toLowerCase();
  const jur = String(jurisdiction || '').toLowerCase();
  const cur = String(currency     || '').toUpperCase();
  if (pt.includes('model portfolio') || pt.includes('discretionary portfolio')) return 'A';
  if (
    pt.includes('unit trust') || pt.includes('cis') || pt.includes('collective') ||
    jur.includes('off') || (cur !== 'ZAR' && cur !== '' && cur !== 'R')
  ) return 'B';
  if (
    pt.includes('private equity') || pt.includes('real estate') || pt.includes('unlisted') ||
    pt.includes('alternative') || pt.includes('share') || pt.includes('etf') ||
    pt.includes('direct securities')
  ) return 'C';
  return '';
};

const ANNEXURE_LABELS = {
  A: 'Annexure A — Model Portfolios',
  B: 'Annexure B — Collective Investments & Offshore Platforms',
  C: 'Annexure C — Alternative Investments & Direct Securities',
};

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Mandate — top of form, default No
    investment_mandate: 'No',
    applicable_annexure: '',
    // Annexure A fees
    initial_fee_percent: '',
    annual_advice_fee_percent: '',
    platform_fee_percent: '',
    // Annexure B fees
    management_fee_percent: '',
    performance_fee_percent: '',
    hurdle_rate_percent: '',
    // Annexure C fees
    structuring_fee_percent: '',
    raising_fee_percent: '',
    carry_fee_percent: '',
    carry_hurdle_percent: '',
    // Investment details
    jurisdiction: 'Local',
    currency: 'ZAR',
    provider: '',
    product_type: '',
    underlying_funds: [],
    custom_fund: '',
    lump_sum: false,
    recurring: false,
    lump_sum_amount: '',
    recurring_amount: '',
    frequency: '',
    reason_for_recommendation: '',
  });

  const [amountDisplay,    setAmountDisplay]    = useState('');
  const [recurringDisplay, setRecurringDisplay] = useState('');
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [libraryOpen,      setLibraryOpen]      = useState(false);

  const { data: investment } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => investmentId
      ? base44.entities.Investments.filter({ id: investmentId }).then(d => d[0])
      : null,
    enabled: !!investmentId,
  });

  useEffect(() => {
    if (investment) {
      const isRecurring = investment.contribution_type === 'Recurring' || investment.contribution_type === 'Both';
      const isLump      = investment.contribution_type === 'Lump Sum'  || investment.contribution_type === 'Both';
      setFormData({
        investment_mandate:        investment.investment_mandate        || 'No',
        applicable_annexure:       investment.applicable_annexure       || '',
        initial_fee_percent:       investment.initial_fee_percent       || '',
        annual_advice_fee_percent: investment.annual_advice_fee_percent || '',
        platform_fee_percent:      investment.platform_fee_percent      || '',
        management_fee_percent:    investment.management_fee_percent    || '',
        performance_fee_percent:   investment.performance_fee_percent   || '',
        hurdle_rate_percent:       investment.hurdle_rate_percent       || '',
        structuring_fee_percent:   investment.structuring_fee_percent   || '',
        raising_fee_percent:       investment.raising_fee_percent       || '',
        carry_fee_percent:         investment.carry_fee_percent         || '',
        carry_hurdle_percent:      investment.carry_hurdle_percent      || '',
        jurisdiction:              investment.jurisdiction              || 'Local',
        currency:                  investment.currency                  || 'ZAR',
        provider:                  investment.provider                  || '',
        product_type:              investment.product_type              || '',
        underlying_funds:          Array.isArray(investment.underlying_funds) ? investment.underlying_funds : [],
        custom_fund:               investment.custom_fund               || '',
        lump_sum:                  isLump,
        recurring:                 isRecurring,
        lump_sum_amount:           investment.amount                    || '',
        recurring_amount:          investment.recurring_amount          || '',
        frequency:                 investment.frequency                 || '',
        reason_for_recommendation: investment.reason_for_recommendation || '',
      });
      if (investment.amount)           setAmountDisplay(Number(investment.amount).toLocaleString('en-ZA'));
      if (investment.recurring_amount) setRecurringDisplay(Number(investment.recurring_amount).toLocaleString('en-ZA'));
    }
  }, [investment]);

  // Auto-detect annexure when product/jurisdiction/currency changes and mandate is Yes
  useEffect(() => {
    if (formData.investment_mandate === 'Yes' && !formData.applicable_annexure) {
      const detected = detectAnnexure(formData.product_type, formData.jurisdiction, formData.currency);
      if (detected) setFormData(prev => ({ ...prev, applicable_annexure: detected }));
    }
  }, [formData.product_type, formData.jurisdiction, formData.currency, formData.investment_mandate]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) {
        await base44.entities.Investments.update(investmentId, data);
      } else {
        await base44.entities.Investments.create({ ...data, proposal_id: proposalId });
      }
      const allInvestments = await base44.entities.Investments.filter({ proposal_id: proposalId });
      const mandateInvs    = allInvestments.filter(inv => inv.investment_mandate === 'Yes');
      await base44.entities.Proposal.update(proposalId, {
        mandate_included:   mandateInvs.length > 0 ? 'Yes' : 'No',
        include_annexure_A: mandateInvs.some(inv => inv.applicable_annexure === 'A'),
        include_annexure_B: mandateInvs.some(inv => inv.applicable_annexure === 'B'),
        include_annexure_C: mandateInvs.some(inv => inv.applicable_annexure === 'C'),
      });
    },
    onSuccess: () => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const contribType = formData.lump_sum && formData.recurring ? 'Both'
      : formData.lump_sum ? 'Lump Sum' : 'Recurring';
    const dataToSave = {
      investment_mandate:        formData.investment_mandate,
      applicable_annexure:       formData.investment_mandate === 'Yes' ? (formData.applicable_annexure || detectAnnexure(formData.product_type, formData.jurisdiction, formData.currency)) : null,
      // Standard fees (Annexure A / no mandate)
      initial_fee_percent:       formData.investment_mandate !== 'Yes' || formData.applicable_annexure === 'A' ? parseFloat(formData.initial_fee_percent) || 0 : 0,
      annual_advice_fee_percent: formData.investment_mandate !== 'Yes' || formData.applicable_annexure === 'A' ? parseFloat(formData.annual_advice_fee_percent) || 0 : 0,
      platform_fee_percent:      formData.investment_mandate !== 'Yes' || formData.applicable_annexure === 'A' ? parseFloat(formData.platform_fee_percent) || 0 : 0,
      // Annexure B fees
      management_fee_percent:    parseFloat(formData.management_fee_percent)  || 0,
      performance_fee_percent:   parseFloat(formData.performance_fee_percent) || 0,
      hurdle_rate_percent:       parseFloat(formData.hurdle_rate_percent)      || 0,
      // Annexure C fees
      structuring_fee_percent:   parseFloat(formData.structuring_fee_percent) || 0,
      raising_fee_percent:       parseFloat(formData.raising_fee_percent)      || 0,
      carry_fee_percent:         parseFloat(formData.carry_fee_percent)        || 0,
      carry_hurdle_percent:      parseFloat(formData.carry_hurdle_percent)     || 0,
      // Investment details
      jurisdiction:              formData.jurisdiction,
      currency:                  formData.currency,
      provider:                  formData.provider,
      product_type:              formData.product_type,
      underlying_funds:          formData.underlying_funds,
      custom_fund:               formData.custom_fund,
      contribution_type:         contribType,
      amount:                    parseFloat(String(formData.lump_sum_amount).replace(/[\s,]/g, ''))  || 0,
      recurring_amount:          parseFloat(String(formData.recurring_amount).replace(/[\s,]/g, '')) || 0,
      frequency:                 formData.frequency,
      reason_for_recommendation: formData.reason_for_recommendation,
    };
    saveMutation.mutate(dataToSave);
    setIsSubmitting(false);
  };

  const handleJurisdictionChange = (value) => {
    setFormData(prev => ({ ...prev, jurisdiction: value, currency: value === 'Local' ? 'ZAR' : 'USD', provider: '' }));
  };

  const handleUnderlyingFundsChange = (fund) => {
    const updated = formData.underlying_funds.includes(fund)
      ? formData.underlying_funds.filter(f => f !== fund)
      : [...formData.underlying_funds, fund];
    setFormData(prev => ({ ...prev, underlying_funds: updated }));
  };

  const providers    = formData.jurisdiction === 'Local' ? LOCAL_PROVIDERS : OFFSHORE_PROVIDERS;
  const autoAnnexure = detectAnnexure(formData.product_type, formData.jurisdiction, formData.currency);
  const activeAnnexure = formData.applicable_annexure || autoAnnexure;

  const toggleClass = (active) =>
    `flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-colors flex-1 text-xs font-medium ${
      active ? 'border-teal bg-teal/5 text-teal' : 'border-border text-navy hover:border-teal/50'
    }`;

  const feeInput = (label, field, placeholder='0.00', suffix='%') => (
    <div>
      <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
      <div className="relative">
        <Input type="number" step="0.01" value={formData[field]}
          onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={placeholder} className="h-8 text-xs rounded-sm pr-8" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <button onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Step 2
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-3">
        <h1 className="text-base font-bold text-navy mb-0.5">{investmentId ? 'Edit Investment' : 'Add Investment'}</h1>
        <p className="text-xs text-muted-foreground mb-2">{investmentId ? 'Update investment details' : 'Create a new investment recommendation'}</p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── MANDATE TOGGLE — top, defaulted to No ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Discretionary Mandate</h3>
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                  Is this investment subject to a discretionary mandate?
                </Label>
                <div className="flex gap-1.5">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        investment_mandate: opt,
                        applicable_annexure: opt === 'No' ? '' : prev.applicable_annexure,
                      }))}
                      className={`px-6 h-8 text-xs font-medium border rounded-sm transition-all ${
                        formData.investment_mandate === opt
                          ? 'bg-navy text-white border-navy'
                          : 'bg-card text-navy border-border hover:border-navy'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {formData.investment_mandate === 'Yes' && (
                <div className="flex-1">
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Applicable Annexure
                    {autoAnnexure && <span className="ml-2 text-[9px] text-green-600 font-normal">Auto-detected: {ANNEXURE_LABELS[autoAnnexure]}</span>}
                  </Label>
                  <Select
                    value={formData.applicable_annexure || autoAnnexure}
                    onValueChange={v => setFormData(prev => ({ ...prev, applicable_annexure: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-sm">
                      <SelectValue placeholder="Select annexure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Annexure A — Model Portfolios</SelectItem>
                      <SelectItem value="B">Annexure B — Collective Investments & Offshore Platforms</SelectItem>
                      <SelectItem value="C">Annexure C — Alternative Investments & Direct Securities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* ── INVESTMENT DETAILS ── */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider">Investment Details</h3>

            {/* Row 1: Provider, Product Type, Jurisdiction, Currency */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Provider</Label>
                <Select value={formData.provider} onValueChange={v => setFormData(prev => ({ ...prev, provider: v }))}>
                  <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Product Type</Label>
                <Select value={formData.product_type} onValueChange={v => setFormData(prev => ({ ...prev, product_type: v }))}>
                  <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{PRODUCT_TYPES.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Jurisdiction</Label>
                <div className="flex gap-1">
                  {['Local', 'Offshore'].map(opt => (
                    <button key={opt} type="button" onClick={() => handleJurisdictionChange(opt)}
                      className={`flex-1 h-8 text-xs font-medium border rounded-sm transition-all ${
                        formData.jurisdiction === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Currency</Label>
                {formData.jurisdiction === 'Local' ? (
                  <Input value="ZAR" disabled className="h-8 text-xs rounded-sm bg-muted" />
                ) : (
                  <Select value={formData.currency} onValueChange={v => setFormData(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES_OFFSHORE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Underlying Funds */}
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Underlying Funds</Label>
              <div className="grid grid-cols-5 gap-2">
                {UNDERLYING_FUNDS_OPTIONS.map(fund => (
                  <label key={fund} className={`flex items-center gap-1.5 px-2 py-1.5 border rounded-sm cursor-pointer transition-colors text-xs ${
                    formData.underlying_funds.includes(fund) ? 'border-ocean bg-ocean/5 text-ocean' : 'border-border text-navy hover:border-ocean/50'
                  }`}>
                    <input type="checkbox" checked={formData.underlying_funds.includes(fund)}
                      onChange={() => handleUnderlyingFundsChange(fund)} className="sr-only" />
                    <span className="font-bold">{formData.underlying_funds.includes(fund) ? '✓' : '○'}</span>
                    {fund}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Fund */}
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Custom Fund Description (Optional)</Label>
              <Textarea value={formData.custom_fund}
                onChange={e => setFormData(prev => ({ ...prev, custom_fund: e.target.value }))}
                placeholder="Describe custom fund if not listed above"
                className="rounded-sm min-h-[56px] text-xs" />
            </div>

            {/* Contribution Type */}
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Contribution Type</Label>
              <div className="flex gap-2">
                <label className={toggleClass(formData.lump_sum)}>
                  <input type="checkbox" checked={formData.lump_sum}
                    onChange={e => setFormData(prev => ({ ...prev, lump_sum: e.target.checked }))} className="sr-only" />
                  <span>{formData.lump_sum ? '✓' : '○'}</span> Lump Sum
                </label>
                <label className={toggleClass(formData.recurring)}>
                  <input type="checkbox" checked={formData.recurring}
                    onChange={e => setFormData(prev => ({ ...prev, recurring: e.target.checked }))} className="sr-only" />
                  <span>{formData.recurring ? '✓' : '○'}</span> Recurring
                </label>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              {formData.lump_sum && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Lump Sum Amount ({formData.currency})
                  </Label>
                  <Input value={amountDisplay}
                    onChange={e => { setAmountDisplay(e.target.value); setFormData(prev => ({ ...prev, lump_sum_amount: e.target.value.replace(/,/g,'') })); }}
                    onBlur={() => { const n=parseFloat(formData.lump_sum_amount); if(!isNaN(n)) setAmountDisplay(n.toLocaleString('en-ZA')); }}
                    onFocus={() => setAmountDisplay(formData.lump_sum_amount||'')}
                    placeholder="0" className="h-8 text-xs rounded-sm" />
                </div>
              )}
              {formData.recurring && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Recurring Amount ({formData.currency})
                  </Label>
                  <Input value={recurringDisplay}
                    onChange={e => { setRecurringDisplay(e.target.value); setFormData(prev => ({ ...prev, recurring_amount: e.target.value.replace(/,/g,'') })); }}
                    onBlur={() => { const n=parseFloat(formData.recurring_amount); if(!isNaN(n)) setRecurringDisplay(n.toLocaleString('en-ZA')); }}
                    onFocus={() => setRecurringDisplay(formData.recurring_amount||'')}
                    placeholder="0" className="h-8 text-xs rounded-sm" />
                </div>
              )}
              {formData.recurring && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={v => setFormData(prev => ({ ...prev, frequency: v }))}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* ── FEE STRUCTURE — conditional on mandate/annexure ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Fee Structure</h3>

            {/* No mandate OR Annexure A — standard fees */}
            {(formData.investment_mandate === 'No' || activeAnnexure === 'A') && (
              <div className="grid grid-cols-3 gap-3">
                {feeInput('Initial Fee', 'initial_fee_percent')}
                {feeInput('Annual Advice Fee', 'annual_advice_fee_percent')}
                {feeInput('Platform Fee', 'platform_fee_percent')}
              </div>
            )}

            {/* Annexure B fees */}
            {formData.investment_mandate === 'Yes' && activeAnnexure === 'B' && (
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground">Fee structure per Annexure B — Collective Investments & Offshore Platforms</p>
                <div className="grid grid-cols-3 gap-3">
                  {feeInput('Management Fee % p.a. of NAV', 'management_fee_percent')}
                  {feeInput('Performance Fee % of NAV increase', 'performance_fee_percent')}
                  {feeInput('Performance Hurdle Rate', 'hurdle_rate_percent')}
                </div>
                <div className="bg-muted/40 rounded-sm p-2.5 text-[10px] text-muted-foreground space-y-1">
                  <p>2.1. The Investor shall pay The FSP a Management Fee of <strong>{formData.management_fee_percent||'___'}%</strong> per annum of the NAV of the Portfolio.</p>
                  <p>2.2. The Management Fee shall be determined monthly in arrears on the last Business Day of each Month and is payable within 2 (two) business Days of the presentation of the invoice.</p>
                  <p>2.3. The Investor shall pay The FSP an annual Performance Fee of <strong>{formData.performance_fee_percent||'___'}%</strong> of the increase in the NAV in excess of the performance hurdle rate of <strong>{formData.hurdle_rate_percent||'___'}%</strong>.</p>
                </div>
              </div>
            )}

            {/* Annexure C fees */}
            {formData.investment_mandate === 'Yes' && activeAnnexure === 'C' && (
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground">Fee structure per Annexure C — Alternative Investments & Direct Securities</p>
                <div className="grid grid-cols-2 gap-3">
                  {feeInput('Annual Management Fee % of NAV', 'management_fee_percent')}
                  {feeInput('Initial Structuring Fee % of investment', 'structuring_fee_percent')}
                  {feeInput('Annual Raising Fee % of investment', 'raising_fee_percent')}
                  {feeInput('Performance / Carry Fee %', 'carry_fee_percent')}
                  {feeInput('Carry Hurdle Rate %', 'carry_hurdle_percent')}
                </div>
                <div className="bg-muted/40 rounded-sm p-2.5 text-[10px] text-muted-foreground space-y-1">
                  <p>2.1. An annual management fee of maximum <strong>{formData.management_fee_percent||'___'}%</strong> based on the NAV of the fund. Payable monthly in arrears.</p>
                  <p>2.2. An initial structuring fee limited to a maximum of <strong>{formData.structuring_fee_percent||'___'}%</strong> of the investment value.</p>
                  <p>2.3. An annual raising fee limited to <strong>{formData.raising_fee_percent||'___'}%</strong> of the investment.</p>
                  <p>2.4. A performance / carry fee of <strong>{formData.carry_fee_percent||'___'}%</strong> will be charged above the hurdle rate of <strong>{formData.carry_hurdle_percent||'___'}%</strong>.</p>
                  <p>2.5. Any other fees explicitly agreed upon by The Investor from time to time in writing.</p>
                  <p>2.6. These fees are reflected net of VAT and are deducted from the investment consideration.</p>
                  <p>2.7. The FSP does not participate in any conditional incentive arrangements.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── REASON FOR RECOMMENDATION ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider">Reason for Recommendation</Label>
              <LibraryButton onOpen={() => setLibraryOpen(true)} />
            </div>
            <Textarea value={formData.reason_for_recommendation}
              onChange={e => setFormData(prev => ({ ...prev, reason_for_recommendation: e.target.value }))}
              placeholder="Why is this product recommended for this client..."
              className="rounded-sm min-h-[64px] text-xs" />
            {libraryOpen && (
              <PhraseLibrary
                onSelect={(phrase) => {
                  const current   = formData.reason_for_recommendation;
                  const separator = current && !current.trim().endsWith('.') ? '. ' : current ? ' ' : '';
                  setFormData(prev => ({ ...prev, reason_for_recommendation: current + separator + phrase }));
                }}
                onClose={() => setLibraryOpen(false)}
              />
            )}
          </div>

          {/* ── ACTIONS ── */}
          <div className="flex gap-3">
            <Button type="button"
              onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })}
              variant="outline" className="flex-1 h-9 rounded-sm text-xs">
              Cancel
            </Button>
            <Button type="submit"
              disabled={isSubmitting || !formData.provider || (!formData.lump_sum && !formData.recurring)}
              className="flex-1 h-9 bg-ocean hover:bg-sky text-white rounded-sm text-xs font-medium disabled:opacity-50">
              {isSubmitting ? 'Saving...' : investmentId ? 'Update Investment' : 'Add Investment'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
