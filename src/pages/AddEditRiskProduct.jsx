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

const RISK_PROVIDERS = ['PPS', 'Momentum', 'Discovery', 'Hollard', 'Brightrock'];

const formatCurrency = (value) => {
  if (!value) return '';
  return Number(value).toLocaleString('en-ZA');
};

const BENEFITS = [
  { key: 'life_cover', label: 'Life Cover' },
  { key: 'disability_lump', label: 'Disability Lump Sum' },
  { key: 'income_protection', label: 'Income Protection' },
  { key: 'dread_disease', label: 'Dread Disease / Critical Illness' },
  { key: 'accidental_death', label: 'Accidental Death' },
  { key: 'funeral_cover', label: 'Funeral Cover' },
  { key: 'business_assurance', label: 'Business Assurance' },
];

const defaultBenefitData = {
  life_cover: { sum_assured: '', monthly_premium: '', annual_premium_increase: '', annual_cover_increase: '' },
  disability_lump: { sum_assured: '', definition: '', monthly_premium: '', annual_premium_increase: '' },
  income_protection: { monthly_benefit: '', waiting_period: '', benefit_period: '', definition: '', monthly_premium: '', annual_premium_increase: '' },
  dread_disease: { sum_assured: '', type: '', monthly_premium: '', annual_premium_increase: '' },
  accidental_death: { sum_assured: '', monthly_premium: '' },
  funeral_cover: { main_member: '', spouse: '', children: '', monthly_premium: '' },
  business_assurance: { sum_assured: '', type: '', monthly_premium: '' },
};

const Field = ({ label, children }) => (
  <div>
    <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
    {children}
  </div>
);

const NumInput = ({ value, onChange, placeholder = '0' }) => {
  const [display, setDisplay] = React.useState(value ? Number(value).toLocaleString('en-ZA') : '');
  React.useEffect(() => {
    setDisplay(value ? Number(value).toLocaleString('en-ZA') : '');
  }, []);
  return (
    <Input
      type="text"
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/,/g, '');
        setDisplay(e.target.value);
        onChange(raw);
      }}
      onBlur={() => {
        const num = parseFloat(display.replace(/,/g, ''));
        if (!isNaN(num)) setDisplay(num.toLocaleString('en-ZA'));
      }}
      onFocus={() => setDisplay(value || '')}
      placeholder={placeholder}
      className="h-8 text-xs rounded-sm"
    />
  );
};

function BenefitFields({ benefitKey, data, onChange }) {
  const set = (field, val) => onChange({ ...data, [field]: val });

  const selectCls = "h-8 text-xs rounded-sm";

  if (benefitKey === 'life_cover') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Sum Assured (R)"><NumInput value={data.sum_assured} onChange={v => set('sum_assured', v)} /></Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
      <Field label="Annual Premium Increase %"><NumInput value={data.annual_premium_increase} onChange={v => set('annual_premium_increase', v)} /></Field>
      <Field label="Annual Cover Increase %"><NumInput value={data.annual_cover_increase} onChange={v => set('annual_cover_increase', v)} /></Field>
    </div>
  );

  if (benefitKey === 'disability_lump') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Sum Assured (R)"><NumInput value={data.sum_assured} onChange={v => set('sum_assured', v)} /></Field>
      <Field label="Definition">
        <Select value={data.definition} onValueChange={v => set('definition', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['Own Occupation', 'Suited Occupation', 'Any Occupation'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
      <Field label="Annual Premium Increase %"><NumInput value={data.annual_premium_increase} onChange={v => set('annual_premium_increase', v)} /></Field>
    </div>
  );

  if (benefitKey === 'income_protection') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Monthly Benefit Amount (R)"><NumInput value={data.monthly_benefit} onChange={v => set('monthly_benefit', v)} /></Field>
      <Field label="Waiting Period">
        <Select value={data.waiting_period} onValueChange={v => set('waiting_period', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['1 month', '3 months', '6 months', '12 months'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Benefit Payment Period">
        <Select value={data.benefit_period} onValueChange={v => set('benefit_period', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['2 years', '5 years', 'To age 60', 'To age 65'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Definition">
        <Select value={data.definition} onValueChange={v => set('definition', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['Own Occupation', 'Suited Occupation'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
      <Field label="Annual Premium Increase %"><NumInput value={data.annual_premium_increase} onChange={v => set('annual_premium_increase', v)} /></Field>
    </div>
  );

  if (benefitKey === 'dread_disease') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Sum Assured (R)"><NumInput value={data.sum_assured} onChange={v => set('sum_assured', v)} /></Field>
      <Field label="Type">
        <Select value={data.type} onValueChange={v => set('type', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['Accelerator', 'Standalone'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
      <Field label="Annual Premium Increase %"><NumInput value={data.annual_premium_increase} onChange={v => set('annual_premium_increase', v)} /></Field>
    </div>
  );

  if (benefitKey === 'accidental_death') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Sum Assured (R)"><NumInput value={data.sum_assured} onChange={v => set('sum_assured', v)} /></Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
    </div>
  );

  if (benefitKey === 'funeral_cover') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Main Member Cover (R)"><NumInput value={data.main_member} onChange={v => set('main_member', v)} /></Field>
      <Field label="Spouse Cover (R)"><NumInput value={data.spouse} onChange={v => set('spouse', v)} /></Field>
      <Field label="Children Cover (R)"><NumInput value={data.children} onChange={v => set('children', v)} /></Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
    </div>
  );

  if (benefitKey === 'business_assurance') return (
    <div className="grid grid-cols-2 gap-1.5 mt-1">
      <Field label="Sum Assured (R)"><NumInput value={data.sum_assured} onChange={v => set('sum_assured', v)} /></Field>
      <Field label="Type">
        <Select value={data.type} onValueChange={v => set('type', v)}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {['Key Man', 'Buy and Sell', 'Contingent Liability'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Monthly Premium (R)"><NumInput value={data.monthly_premium} onChange={v => set('monthly_premium', v)} /></Field>
    </div>
  );

  return null;
}

export default function AddEditRiskProduct() {
  const { id: proposalId, riskProductId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState('');
  const [reason, setReason] = useState('');
  const [selectedBenefits, setSelectedBenefits] = useState([]);
  const [benefitData, setBenefitData] = useState({ ...defaultBenefitData });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const { data: riskProduct } = useQuery({
    queryKey: ['riskProduct', riskProductId],
    queryFn: () => riskProductId ? base44.entities.RiskProducts.filter({ id: riskProductId }).then(d => d[0]) : null,
    enabled: !!riskProductId,
  });

  const { data: existingCovers = [] } = useQuery({
    queryKey: ['riskCovers', riskProductId],
    queryFn: () => riskProductId ? base44.entities.RiskCovers.filter({ risk_product_id: riskProductId }) : [],
    enabled: !!riskProductId,
  });

  useEffect(() => {
    if (riskProduct) {
      setProvider(riskProduct.provider || '');
      setReason(riskProduct.reason_for_recommendation || '');
    }
  }, [riskProduct]);

  useEffect(() => {
    if (!existingCovers || existingCovers.length === 0) return;

    const coverTypeToKey = {
      'Life Cover': 'life_cover',
      'Disability Lump Sum': 'disability_lump',
      'Income Protection': 'income_protection',
      'Dread Disease / Critical Illness': 'dread_disease',
      'Accidental Death': 'accidental_death',
      'Funeral Cover': 'funeral_cover',
      'Business Assurance': 'business_assurance',
    };

    const keys = [];
    const data = { ...defaultBenefitData };

    existingCovers.forEach(cover => {
      const key = coverTypeToKey[cover.cover_type];
      if (!key) return;
      keys.push(key);
      data[key] = {
        ...defaultBenefitData[key],
        sum_assured: cover.amount_required || '',
        monthly_benefit: cover.amount_required || '',
        monthly_premium: cover.premium || '',
        annual_premium_increase: cover.annual_premium_increase_percent || '',
        annual_cover_increase: cover.annual_cover_increase_percent || '',
      };
    });

    setSelectedBenefits(keys);
    setBenefitData(data);
  }, [existingCovers]);

  const toggleBenefit = (key) => {
    setSelectedBenefits(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    if (!benefitData[key]) {
      setBenefitData(prev => ({ ...prev, [key]: { ...defaultBenefitData[key] } }));
    }
  };

  const updateBenefitData = (key, data) => {
    setBenefitData(prev => ({ ...prev, [key]: data }));
  };

  // Calculate total monthly premium across all selected benefits
  const totalPremium = selectedBenefits.reduce((sum, key) => {
    const d = benefitData[key] || {};
    return sum + (parseFloat(d.monthly_premium) || 0);
  }, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let productId = riskProductId;
      if (!riskProductId) {
        const created = await base44.entities.RiskProducts.create({ proposal_id: proposalId, provider, reason_for_recommendation: reason });
        productId = created.id;
      } else {
        await base44.entities.RiskProducts.update(riskProductId, { provider, reason_for_recommendation: reason });
      }

      // Delete existing covers before re-saving to avoid duplicates
      if (riskProductId) {
        for (const old of existingCovers) {
          await base44.entities.RiskCovers.delete(old.id);
        }
      }

      // Save each selected benefit as a RiskCover record
      for (const key of selectedBenefits) {
        const benefit = BENEFITS.find(b => b.key === key);
        const d = benefitData[key] || {};
        await base44.entities.RiskCovers.create({
          risk_product_id: productId,
          cover_type: benefit.label,
          amount_required: parseFloat(d.sum_assured || d.main_member || d.monthly_benefit) || 0,
          premium: parseFloat(d.monthly_premium) || 0,
          annual_premium_increase_percent: parseFloat(d.annual_premium_increase) || 0,
          annual_cover_increase_percent: parseFloat(d.annual_cover_increase) || 0,
        });
      }

      return productId;
    },
    onSuccess: () => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!provider) { alert('Please select a provider'); return; }
    if (selectedBenefits.length === 0) { alert('Please select at least one benefit'); return; }
    setIsSubmitting(true);
    await saveMutation.mutate();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-3">
        <button onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Step 2
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-2">
         <h1 className="text-base font-bold text-navy mb-0.5">{riskProductId ? 'Edit Risk Product' : 'Add Risk Product'}</h1>
         <p className="text-[11px] text-muted-foreground mb-2">{riskProductId ? 'Update risk product and benefits' : 'Create a new risk product with benefits'}</p>

         <form onSubmit={handleSubmit} className="space-y-2">
          {/* Provider */}
          <div className="bg-card border border-border rounded-lg p-2">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Risk Provider</h2>
            <div className="max-w-xs">
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {RISK_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-card border border-border rounded-lg p-2">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Benefits</h2>

            {/* Benefit toggles */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {BENEFITS.map(b => {
                const selected = selectedBenefits.includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => toggleBenefit(b.key)}
                    className={`px-3 py-2 border rounded-sm text-xs font-medium text-left transition-all ${
                      selected ? 'border-ocean bg-ocean/10 text-ocean' : 'border-border text-navy hover:border-ocean/50'
                    }`}
                  >
                    <span className="mr-1">{selected ? '✓' : '○'}</span>
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Selected benefit details */}
            <div className="space-y-1.5">
              {selectedBenefits.map(key => {
                const benefit = BENEFITS.find(b => b.key === key);
                return (
                  <div key={key} className="border border-ocean/30 rounded-sm p-1.5 bg-ocean/5">
                    <h3 className="text-[9px] font-bold text-ocean uppercase tracking-wider mb-1">{benefit.label}</h3>
                    <BenefitFields
                      benefitKey={key}
                      data={benefitData[key] || defaultBenefitData[key]}
                      onChange={(d) => updateBenefitData(key, d)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason for Recommendation */}
          <div className="bg-card border border-border rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider">Reason for Recommendation</h2>
              <LibraryButton onOpen={() => setLibraryOpen(true)} />
            </div>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this risk product recommended for this client..."
              className="rounded-sm min-h-[48px] text-xs"
            />
            {libraryOpen && (
              <PhraseLibrary
                onSelect={(phrase) => {
                  const separator = reason && !reason.trim().endsWith('.') ? '. ' : reason ? ' ' : '';
                  setReason(prev => prev + separator + phrase);
                }}
                onClose={() => setLibraryOpen(false)}
              />
            )}
          </div>

          {/* Total Premium */}
          {selectedBenefits.length > 0 && (
            <div className="bg-navy/5 border border-navy/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-navy uppercase tracking-wider">Total Monthly Premium</span>
              <span className="text-base font-bold text-navy">R {formatCurrency(totalPremium)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="button" onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })} variant="outline" className="flex-1 h-8 rounded-sm text-xs">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !provider || selectedBenefits.length === 0} className="flex-1 h-8 bg-teal hover:bg-teal/90 text-white rounded-sm text-xs font-medium disabled:opacity-50">
              {isSubmitting ? 'Saving...' : riskProductId ? 'Update Risk Product' : 'Add Risk Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}