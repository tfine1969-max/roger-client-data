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

const LOCAL_PROVIDERS = ['Investec', 'Sanlam', 'Allan Gray', 'Coronation', 'Ninety One'];
const OFFSHORE_PROVIDERS = ['Vanguard', 'Blackrock', 'Fidelity', 'Charles Schwab', 'Interactive Brokers'];
const CURRENCIES_OFFSHORE = ['USD', 'GBP', 'EUR'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];
const UNDERLYING_FUNDS_OPTIONS = ['Index Fund', 'Balanced Fund', 'Equity Fund', 'Bond Fund', 'Multi-Asset Fund'];
const PRODUCT_TYPES = [
  'Retirement Annuity', 'Living Annuity', 'Endowment', 'Tax-Free Savings Account',
  'Unit Trust / CIS', 'Preservation Fund', 'Pension Fund', 'Provident Fund',
  'Offshore Investment Bond', 'Discretionary Portfolio'
];

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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
    initial_fee_percent: '',
    annual_advice_fee_percent: '',
    platform_fee_percent: '',
  });
  const [amountDisplay, setAmountDisplay] = useState('');
  const [recurringDisplay, setRecurringDisplay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: investment } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => investmentId ? base44.entities.Investments.filter({ id: investmentId }).then(d => d[0]) : null,
    enabled: !!investmentId,
  });

  useEffect(() => {
    if (investment) {
      const isRecurring = investment.contribution_type === 'Recurring' || investment.contribution_type === 'Both';
      const isLump = investment.contribution_type === 'Lump Sum' || investment.contribution_type === 'Both';
      setFormData({
        jurisdiction: investment.jurisdiction || 'Local',
        currency: investment.currency || 'ZAR',
        provider: investment.provider || '',
        product_type: investment.product_type || '',
        underlying_funds: Array.isArray(investment.underlying_funds) ? investment.underlying_funds : [],
        custom_fund: investment.custom_fund || '',
        lump_sum: isLump,
        recurring: isRecurring,
        lump_sum_amount: investment.amount || '',
        recurring_amount: investment.recurring_amount || '',
        frequency: investment.frequency || '',
        initial_fee_percent: investment.initial_fee_percent || '',
        annual_advice_fee_percent: investment.annual_advice_fee_percent || '',
        platform_fee_percent: investment.platform_fee_percent || '',
      });
      if (investment.amount) setAmountDisplay(Number(investment.amount).toLocaleString('en-ZA'));
      if (investment.recurring_amount) setRecurringDisplay(Number(investment.recurring_amount).toLocaleString('en-ZA'));
    }
  }, [investment]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) {
        await base44.entities.Investments.update(investmentId, data);
      } else {
        await base44.entities.Investments.create({ ...data, proposal_id: proposalId });
      }
    },
    onSuccess: () => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const contribType = formData.lump_sum && formData.recurring ? 'Both' : formData.lump_sum ? 'Lump Sum' : 'Recurring';
    const dataToSave = {
      jurisdiction: formData.jurisdiction,
      currency: formData.currency,
      provider: formData.provider,
      product_type: formData.product_type,
      underlying_funds: formData.underlying_funds,
      custom_fund: formData.custom_fund,
      contribution_type: contribType,
      amount: parseFloat(String(formData.lump_sum_amount).replace(/[\s,]/g, '')) || 0,
      recurring_amount: parseFloat(String(formData.recurring_amount).replace(/[\s,]/g, '')) || 0,
      frequency: formData.frequency,
      initial_fee_percent: parseFloat(formData.initial_fee_percent) || 0,
      annual_advice_fee_percent: parseFloat(formData.annual_advice_fee_percent) || 0,
      platform_fee_percent: parseFloat(formData.platform_fee_percent) || 0,
    };
    await saveMutation.mutate(dataToSave);
    setIsSubmitting(false);
  };

  const handleJurisdictionChange = (value) => {
    setFormData({ ...formData, jurisdiction: value, currency: value === 'Local' ? 'ZAR' : 'USD', provider: '' });
  };

  const handleUnderlyingFundsChange = (fund) => {
    const updated = formData.underlying_funds.includes(fund)
      ? formData.underlying_funds.filter(f => f !== fund)
      : [...formData.underlying_funds, fund];
    setFormData({ ...formData, underlying_funds: updated });
  };

  const providers = formData.jurisdiction === 'Local' ? LOCAL_PROVIDERS : OFFSHORE_PROVIDERS;

  const toggleClass = (active) =>
    `flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-colors flex-1 text-xs font-medium ${
      active ? 'border-teal bg-teal/5 text-teal' : 'border-border text-navy hover:border-teal/50'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <button onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Step 2
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-3">
        <h1 className="text-base font-bold text-navy mb-0.5">{investmentId ? 'Edit Investment' : 'Add Investment'}</h1>
        <p className="text-xs text-muted-foreground mb-2">{investmentId ? 'Update investment details' : 'Create a new investment recommendation'}</p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-3 space-y-3">

          {/* Row 1: Provider + Product Type + Jurisdiction + Currency */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Provider</Label>
              <Select value={formData.provider} onValueChange={v => setFormData({ ...formData, provider: v })}>
                <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>{providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Product Type</Label>
              <Select value={formData.product_type} onValueChange={v => setFormData({ ...formData, product_type: v })}>
                <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Jurisdiction</Label>
              <div className="flex gap-1">
                {['Local', 'Offshore'].map(opt => (
                  <button key={opt} type="button" onClick={() => handleJurisdictionChange(opt)}
                    className={`flex-1 h-8 text-xs font-medium border rounded-sm transition-all ${formData.jurisdiction === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'}`}>
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
                <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v })}>
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
                <label key={fund} className={`flex items-center gap-1.5 px-2 py-1.5 border rounded-sm cursor-pointer transition-colors text-xs ${formData.underlying_funds.includes(fund) ? 'border-ocean bg-ocean/5 text-ocean' : 'border-border text-navy hover:border-ocean/50'}`}>
                  <input type="checkbox" checked={formData.underlying_funds.includes(fund)} onChange={() => handleUnderlyingFundsChange(fund)} className="sr-only" />
                  <span className="font-bold">{formData.underlying_funds.includes(fund) ? '✓' : '○'}</span>
                  {fund}
                </label>
              ))}
            </div>
          </div>

          {/* Custom Fund */}
          <div>
            <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Custom Fund Description (Optional)</Label>
            <Textarea value={formData.custom_fund} onChange={e => setFormData({ ...formData, custom_fund: e.target.value })}
              placeholder="Describe custom fund if not listed above" className="rounded-sm min-h-[56px] text-xs" />
          </div>

          {/* Contribution Type — independent checkboxes */}
          <div>
            <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Contribution Type</Label>
            <div className="flex gap-2">
              <label className={toggleClass(formData.lump_sum)}>
                <input type="checkbox" checked={formData.lump_sum} onChange={e => setFormData({ ...formData, lump_sum: e.target.checked })} className="sr-only" />
                <span>{formData.lump_sum ? '✓' : '○'}</span> Lump Sum
              </label>
              <label className={toggleClass(formData.recurring)}>
                <input type="checkbox" checked={formData.recurring} onChange={e => setFormData({ ...formData, recurring: e.target.checked })} className="sr-only" />
                <span>{formData.recurring ? '✓' : '○'}</span> Recurring
              </label>
            </div>
          </div>

          {/* Amounts — shown based on selection */}
          <div className="grid grid-cols-2 gap-3">
            {formData.lump_sum && (
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Lump Sum Amount ({formData.currency})</Label>
                <Input
                  value={amountDisplay}
                  onChange={e => {
                    const raw = e.target.value.replace(/,/g, '');
                    setAmountDisplay(e.target.value);
                    setFormData(prev => ({ ...prev, lump_sum_amount: raw }));
                  }}
                  onBlur={() => {
                    const num = parseFloat(formData.lump_sum_amount);
                    if (!isNaN(num)) setAmountDisplay(num.toLocaleString('en-ZA'));
                  }}
                  onFocus={() => setAmountDisplay(formData.lump_sum_amount || '')}
                  placeholder="0"
                  className="h-8 text-xs rounded-sm"
                />
              </div>
            )}
            {formData.recurring && (
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Recurring Amount ({formData.currency})</Label>
                <Input
                  value={recurringDisplay}
                  onChange={e => {
                    const raw = e.target.value.replace(/,/g, '');
                    setRecurringDisplay(e.target.value);
                    setFormData(prev => ({ ...prev, recurring_amount: raw }));
                  }}
                  onBlur={() => {
                    const num = parseFloat(formData.recurring_amount);
                    if (!isNaN(num)) setRecurringDisplay(num.toLocaleString('en-ZA'));
                  }}
                  onFocus={() => setRecurringDisplay(formData.recurring_amount || '')}
                  placeholder="0"
                  className="h-8 text-xs rounded-sm"
                />
              </div>
            )}
            {formData.recurring && (
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Frequency</Label>
                <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Fee Structure — 3 cols (TER removed) */}
          <div className="border-t border-border pt-2">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Fee Structure</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Initial Fee %</Label>
                <Input type="number" step="0.01" value={formData.initial_fee_percent}
                  onChange={e => setFormData({ ...formData, initial_fee_percent: e.target.value })}
                  placeholder="0.00" className="h-8 text-xs rounded-sm" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Annual Advice Fee %</Label>
                <Input type="number" step="0.01" value={formData.annual_advice_fee_percent}
                  onChange={e => setFormData({ ...formData, annual_advice_fee_percent: e.target.value })}
                  placeholder="0.00" className="h-8 text-xs rounded-sm" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Platform Fee %</Label>
                <Input type="number" step="0.01" value={formData.platform_fee_percent}
                  onChange={e => setFormData({ ...formData, platform_fee_percent: e.target.value })}
                  placeholder="0.00" className="h-8 text-xs rounded-sm" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })} variant="outline" className="flex-1 h-8 rounded-sm text-xs">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !formData.provider || (!formData.lump_sum && !formData.recurring)}
              className="flex-1 h-8 bg-ocean hover:bg-sky text-white rounded-sm text-xs font-medium disabled:opacity-50">
              {isSubmitting ? 'Saving...' : investmentId ? 'Update Investment' : 'Add Investment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}