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
const CONTRIBUTION_TYPES = ['Lump Sum', 'Recurring'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];
const UNDERLYING_FUNDS_OPTIONS = ['Index Fund', 'Balanced Fund', 'Equity Fund', 'Bond Fund', 'Multi-Asset Fund'];

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
    contribution_type: 'Lump Sum',
    amount: '',
    frequency: '',
    initial_fee_percent: '',
    annual_advice_fee_percent: '',
    platform_fee_percent: '',
    fund_ter_percent: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing investment if editing
  const { data: investment } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => investmentId ? base44.entities.Investments.filter({ id: investmentId }).then(data => data[0]) : null,
    enabled: !!investmentId,
  });

  // Populate form when editing
  useEffect(() => {
    if (investment) {
      setFormData({
        jurisdiction: investment.jurisdiction || 'Local',
        currency: investment.currency || 'ZAR',
        provider: investment.provider || '',
        product_type: investment.product_type || '',
        underlying_funds: Array.isArray(investment.underlying_funds) ? investment.underlying_funds : [],
        custom_fund: investment.custom_fund || '',
        contribution_type: investment.contribution_type || 'Lump Sum',
        amount: investment.amount || '',
        frequency: investment.frequency || '',
        initial_fee_percent: investment.initial_fee_percent || '',
        annual_advice_fee_percent: investment.annual_advice_fee_percent || '',
        platform_fee_percent: investment.platform_fee_percent || '',
        fund_ter_percent: investment.fund_ter_percent || ''
      });
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
    onSuccess: () => {
      navigate(`/proposal/${proposalId}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSave = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      initial_fee_percent: parseFloat(formData.initial_fee_percent) || 0,
      annual_advice_fee_percent: parseFloat(formData.annual_advice_fee_percent) || 0,
      platform_fee_percent: parseFloat(formData.platform_fee_percent) || 0,
      fund_ter_percent: parseFloat(formData.fund_ter_percent) || 0
    };
    
    await saveMutation.mutate(dataToSave);
    setIsSubmitting(false);
  };

  const handleJurisdictionChange = (value) => {
    setFormData({
      ...formData,
      jurisdiction: value,
      currency: value === 'Local' ? 'ZAR' : 'USD',
      provider: '' // Reset provider when switching jurisdiction
    });
  };

  const handleUnderlyingFundsChange = (fund) => {
    const updated = formData.underlying_funds.includes(fund)
      ? formData.underlying_funds.filter(f => f !== fund)
      : [...formData.underlying_funds, fund];
    setFormData({ ...formData, underlying_funds: updated });
  };

  const providers = formData.jurisdiction === 'Local' ? LOCAL_PROVIDERS : OFFSHORE_PROVIDERS;
  const isRecurring = formData.contribution_type === 'Recurring';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <button
          onClick={() => navigate(`/proposal/${proposalId}`)}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to proposal
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-navy mb-2">
          {investmentId ? 'Edit Investment' : 'Add Investment'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {investmentId ? 'Update investment details' : 'Create a new investment recommendation'}
        </p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8 space-y-6">
          {/* Jurisdiction */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Jurisdiction</Label>
            <div className="flex gap-4">
              {['Local', 'Offshore'].map(option => (
                <label key={option} className={`flex items-center gap-3 px-4 py-3 border rounded-sm cursor-pointer transition-colors flex-1 ${
                  formData.jurisdiction === option
                    ? 'border-navy bg-navy/5'
                    : 'border-border hover:border-ocean/50'
                }`}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    formData.jurisdiction === option
                      ? 'bg-navy border-navy'
                      : 'border-muted-foreground'
                  }`}>
                    {formData.jurisdiction === option && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="font-medium text-navy">{option}</span>
                  <input
                    type="radio"
                    name="jurisdiction"
                    value={option}
                    checked={formData.jurisdiction === option}
                    onChange={(e) => handleJurisdictionChange(e.target.value)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Currency</Label>
            {formData.jurisdiction === 'Local' ? (
              <Input
                value="ZAR"
                disabled
                className="rounded-sm bg-muted"
              />
            ) : (
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES_OFFSHORE.map(cur => (
                    <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Provider */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Provider</Label>
            <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v })}>
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Type */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Product Type</Label>
            <Input
              value={formData.product_type}
              onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
              placeholder="e.g. Retirement Annuity, Endowment"
              className="rounded-sm"
            />
          </div>

          {/* Underlying Funds */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-3 block">Underlying Funds</Label>
            <div className="grid grid-cols-2 gap-3">
              {UNDERLYING_FUNDS_OPTIONS.map(fund => (
                <label key={fund} className={`flex items-center gap-3 px-3 py-2 border rounded-sm cursor-pointer transition-colors ${
                  formData.underlying_funds.includes(fund)
                    ? 'border-ocean bg-ocean/5'
                    : 'border-border hover:border-ocean/50'
                }`}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                    formData.underlying_funds.includes(fund)
                      ? 'bg-ocean border-ocean'
                      : 'border-muted-foreground'
                  }`}>
                    {formData.underlying_funds.includes(fund) && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm font-medium text-navy">{fund}</span>
                  <input
                    type="checkbox"
                    checked={formData.underlying_funds.includes(fund)}
                    onChange={() => handleUnderlyingFundsChange(fund)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Custom Fund */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Custom Fund Description (Optional)</Label>
            <Textarea
              value={formData.custom_fund}
              onChange={(e) => setFormData({ ...formData, custom_fund: e.target.value })}
              placeholder="Describe custom fund if not listed above"
              className="rounded-sm min-h-[80px]"
            />
          </div>

          {/* Contribution Type */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">Contribution Type</Label>
            <div className="flex gap-4">
              {CONTRIBUTION_TYPES.map(option => (
                <label key={option} className={`flex items-center gap-3 px-4 py-3 border rounded-sm cursor-pointer transition-colors flex-1 ${
                  formData.contribution_type === option
                    ? 'border-teal bg-teal/5'
                    : 'border-border hover:border-teal/50'
                }`}>
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    formData.contribution_type === option
                      ? 'bg-teal border-teal'
                      : 'border-muted-foreground'
                  }`}>
                    {formData.contribution_type === option && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="font-medium text-navy">{option}</span>
                  <input
                    type="radio"
                    name="contribution_type"
                    value={option}
                    checked={formData.contribution_type === option}
                    onChange={(e) => setFormData({ ...formData, contribution_type: e.target.value })}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-sm font-semibold text-navy mb-2 block">
              {isRecurring ? 'Recurring Amount' : 'Lump Sum Amount'}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder={isRecurring ? 'Monthly amount' : 'Total amount'}
              className="rounded-sm"
            />
          </div>

          {/* Frequency (only for recurring) */}
          {isRecurring && (
            <div>
              <Label className="text-sm font-semibold text-navy mb-2 block">Frequency</Label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fee Fields */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-bold text-navy mb-4">Fee Structure</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-navy mb-1.5 block">Initial Fee %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.initial_fee_percent}
                  onChange={(e) => setFormData({ ...formData, initial_fee_percent: e.target.value })}
                  placeholder="0.00"
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy mb-1.5 block">Annual Advice Fee %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_advice_fee_percent}
                  onChange={(e) => setFormData({ ...formData, annual_advice_fee_percent: e.target.value })}
                  placeholder="0.00"
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy mb-1.5 block">Platform Fee %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.platform_fee_percent}
                  onChange={(e) => setFormData({ ...formData, platform_fee_percent: e.target.value })}
                  placeholder="0.00"
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-navy mb-1.5 block">Fund TER %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fund_ter_percent}
                  onChange={(e) => setFormData({ ...formData, fund_ter_percent: e.target.value })}
                  placeholder="0.00"
                  className="rounded-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={() => navigate(`/proposal/${proposalId}`)}
              variant="outline"
              className="flex-1 py-3 rounded-sm border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.provider}
              className="flex-1 bg-ocean hover:bg-sky text-white py-3 rounded-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : investmentId ? 'Update Investment' : 'Add Investment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}