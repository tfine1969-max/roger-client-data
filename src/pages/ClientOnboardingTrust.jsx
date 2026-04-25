import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check, Plus } from 'lucide-react';
import PersonCard from '@/components/onboarding/PersonCard';

const STEPS = [
  { number: 1, label: 'Trust details' },
  { number: 2, label: 'Trustees' },
  { number: 3, label: 'FICA / KYC' },
  { number: 4, label: 'Financial profile' },
  { number: 5, label: 'Risk & objectives' },
  { number: 6, label: 'Documents' },
  { number: 7, label: 'Submit' },
];

const ADVISORY_NEEDS = [
  'Local and offshore investments', 'Retirement planning', 'Life & risk cover',
  'Estate planning', 'Tax planning', 'Business assurance', 'Education planning',
];

const emptyTrustee = () => ({
  title: '', first_name: '', last_name: '', identity_type: 'SA ID',
  id_number: '', passport_country: '', date_of_birth: '',
  gender: '', marital_status: '', nationality: '',
  email: '', mobile: '',
  street_address: '', suburb: '', city: '', province: '', postal_code: '',
});

export default function ClientOnboardingTrust() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    entity_name: '',
    trust_number: '',
    trust_deed_date: '',
    street_address: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    email: '',
    mobile_number: '',
    // FICA
    trust_deed_uploaded: false,
    loa_uploaded: false,
    trustee_ids_uploaded: false,
    // Financial
    gross_annual_income_band: '',
    monthly_investable_surplus: '',
    net_worth_band: '',
    total_liabilities: '',
    // Risk
    portfolio_drop_response: '',
    primary_investment_objective: '',
    time_horizon: '',
    liquidity_requirement: '',
    risk_profile: '',
    advisory_needs: [],
    // Docs
    identity_document_uploaded: false,
    proof_of_address_uploaded: false,
    income_proof_uploaded: false,
    existing_policies_uploaded: false,
  });

  const [trustees, setTrustees] = useState([emptyTrustee(), emptyTrustee()]);

  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) { navigate('/client-registration', { replace: true }); return; }

    // Guard: if entity type is set but not Trust, redirect to correct flow
    const entityType = sessionStorage.getItem('pending_entity_type');
    if (entityType && entityType !== 'Trust') {
      if (entityType === 'Company') { navigate('/client-onboarding-company', { replace: true }); return; }
      navigate('/client-onboarding', { replace: true }); return;
    }

    const seedRaw = sessionStorage.getItem('test_onboarding_seed');
    if (seedRaw) {
      try {
        const seed = JSON.parse(seedRaw);
        setFormData(prev => ({ ...prev, ...seed }));
      } catch {}
      sessionStorage.removeItem('test_onboarding_seed');
    }

    base44.entities.Clients.list().then(clients => {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData(prev => ({
          ...prev,
          entity_name: client.entity_name || prev.entity_name,
          trust_number: client.trust_number || prev.trust_number,
          street_address: client.street_address || prev.street_address,
          suburb: client.suburb || prev.suburb,
          city: client.city || prev.city,
          province: client.province || prev.province,
          postal_code: client.postal_code || prev.postal_code,
          email: client.email || prev.email,
          mobile_number: client.mobile_number || prev.mobile_number,
          gross_annual_income_band: client.gross_annual_income_band || prev.gross_annual_income_band,
          monthly_investable_surplus: client.monthly_investable_surplus || prev.monthly_investable_surplus,
          net_worth_band: client.net_worth_band || prev.net_worth_band,
          total_liabilities: client.total_liabilities || prev.total_liabilities,
          portfolio_drop_response: client.portfolio_drop_response || prev.portfolio_drop_response,
          primary_investment_objective: client.primary_investment_objective || prev.primary_investment_objective,
          time_horizon: client.time_horizon || prev.time_horizon,
          liquidity_requirement: client.liquidity_requirement || prev.liquidity_requirement,
          risk_profile: client.risk_profile || prev.risk_profile,
          advisory_needs: Array.isArray(client.advisory_needs) ? client.advisory_needs : prev.advisory_needs,
        }));
      }
    }).catch(() => {}).finally(() => { setClientId(id); setIsInitializing(false); });
  }, [navigate]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleNeed = (item) => setFormData(prev => ({
    ...prev,
    advisory_needs: prev.advisory_needs.includes(item)
      ? prev.advisory_needs.filter(i => i !== item)
      : [...prev.advisory_needs, item],
  }));

  const updateTrustee = (idx, field, value) => setTrustees(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  const addTrustee = () => setTrustees(prev => [...prev, emptyTrustee()]);
  const removeTrustee = (idx) => { if (trustees.length > 2) setTrustees(prev => prev.filter((_, i) => i !== idx)); };

  const saveStep = async (data) => {
    if (!clientId) return false;
    setIsSavingStep(true);
    try {
      await base44.entities.Clients.update(clientId, data);
      toast.success(`Step ${currentStep} saved`);
      return true;
    } catch (err) {
      toast.error('Save failed: ' + (err.message || 'Unknown error'));
      return false;
    } finally { setIsSavingStep(false); }
  };

  const handleContinue = async () => {
    let data = {};
    if (currentStep === 1) {
      if (!formData.entity_name || !formData.trust_number) { toast.error('Please fill in trust name and registration number'); return; }
      data = {
        client_type: 'Trust', identity_type: 'Trust',
        entity_name: formData.entity_name, trust_number: formData.trust_number,
        trust_deed_date: formData.trust_deed_date,
        street_address: formData.street_address, suburb: formData.suburb,
        city: formData.city, province: formData.province, postal_code: formData.postal_code,
        email: formData.email, mobile_number: formData.mobile_number,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (trustees.some(t => !t.first_name || !t.last_name || !t.id_number)) { toast.error('Please complete all trustee names and ID numbers'); return; }
      data = { trustees_list: trustees };
    } else if (currentStep === 3) {
      data = { trust_deed_uploaded: formData.trust_deed_uploaded, loa_uploaded: formData.loa_uploaded, trustee_ids_uploaded: formData.trustee_ids_uploaded };
    } else if (currentStep === 4) {
      data = {
        gross_annual_income_band: formData.gross_annual_income_band,
        monthly_investable_surplus: formData.monthly_investable_surplus,
        net_worth_band: formData.net_worth_band, total_liabilities: formData.total_liabilities,
      };
    } else if (currentStep === 5) {
      if (!formData.risk_profile) { toast.error('Please select a risk profile'); return; }
      data = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: formData.time_horizon, liquidity_requirement: formData.liquidity_requirement,
        risk_profile: formData.risk_profile, advisory_needs: formData.advisory_needs,
      };
    } else if (currentStep === 6) {
      data = {
        identity_document_uploaded: formData.identity_document_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        income_proof_uploaded: formData.income_proof_uploaded,
        existing_policies_uploaded: formData.existing_policies_uploaded,
      };
    }
    const saved = await saveStep(data);
    if (saved) setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!clientId) return;
    setIsSubmitting(true);
    try {
      await base44.entities.Clients.update(clientId, { client_status: 'Onboarded', onboarding_complete: true });
      const allProposals = await base44.entities.Proposal.list();
      const existing = allProposals.find(p => p.client_id === clientId);
      const clientName = formData.entity_name || 'Trust Client';
      if (existing) {
        await base44.entities.Proposal.update(existing.id, { client_name: clientName, advisory_needs: formData.advisory_needs, status: 'new' });
      } else {
        await base44.entities.Proposal.create({
          client_id: clientId, client_name: clientName, advisory_needs: formData.advisory_needs,
          reference: 'WW-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          advisor_name: 'Trevor Fine', status: 'new', pdf_status: 'No PDF',
          advisor_signature_completed: false, client_signature_completed: false, document_version: 1,
        });
      }
      toast.success('Onboarding completed successfully');
      navigate('/client-confirmation', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to complete onboarding');
    } finally { setIsSubmitting(false); }
  };

  if (isInitializing) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-navy" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="bg-card border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> WEALTHWORKS.CO.ZA
        </button>
        <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF {STEPS.length} · TRUST</span>
      </div>

      {/* Step banner */}
      <div className="bg-card border-b border-border px-5 py-0 flex items-center gap-0 overflow-x-auto shrink-0">
        {STEPS.map(step => {
          const isComplete = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <button key={step.number} type="button" onClick={() => setCurrentStep(step.number)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isCurrent ? 'border-ocean text-ocean' : isComplete ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'
              }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                isCurrent ? 'bg-ocean text-white' : isComplete ? 'bg-teal text-white' : 'bg-border text-muted-foreground'
              }`}>{isComplete ? '✓' : step.number}</span>
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-4xl mx-auto w-full">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">STEP {currentStep} OF {STEPS.length} · TRUST ONBOARDING</p>
          <h1 className="text-2xl font-bold text-navy mb-1">{STEPS[currentStep - 1]?.label}</h1>
        </div>

        {/* STEP 1 — Trust Details */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST NAME *</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.entity_name} onChange={e => handleChange('entity_name', e.target.value)} placeholder="e.g. Blue Family Trust" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST REGISTRATION NO. (IT NUMBER) *</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.trust_number} onChange={e => handleChange('trust_number', e.target.value)} placeholder="e.g. IT1234/2015" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST DEED DATE</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={formData.trust_deed_date} onChange={e => handleChange('trust_deed_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">CONTACT EMAIL</Label>
                <Input type="email" className="mt-1 h-8 text-sm" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">CONTACT MOBILE</Label>
                <Input type="tel" className="mt-1 h-8 text-sm" value={formData.mobile_number} onChange={e => handleChange('mobile_number', e.target.value)} />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">REGISTERED ADDRESS</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">STREET ADDRESS</Label>
                  <Input className="mt-1 h-8 text-sm" value={formData.street_address} onChange={e => handleChange('street_address', e.target.value)} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div><Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SUBURB</Label><Input className="mt-1 h-8 text-sm" value={formData.suburb} onChange={e => handleChange('suburb', e.target.value)} /></div>
                  <div><Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">CITY</Label><Input className="mt-1 h-8 text-sm" value={formData.city} onChange={e => handleChange('city', e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PROVINCE</Label>
                    <Select value={formData.province} onValueChange={v => handleChange('province', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Western Cape','Gauteng','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">POSTAL CODE</Label><Input className="mt-1 h-8 text-sm" maxLength="4" value={formData.postal_code} onChange={e => handleChange('postal_code', e.target.value)} /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Trustees */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add all trustees of this trust. Minimum 2 required.</p>
            {trustees.map((trustee, idx) => (
              <PersonCard
                key={idx}
                person={trustee}
                idx={idx}
                role="Trustee"
                onUpdate={updateTrustee}
                onRemove={removeTrustee}
                canRemove={trustees.length > 2}
              />
            ))}
            <button type="button" onClick={addTrustee} className="flex items-center gap-1.5 text-xs text-ocean hover:text-navy font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add trustee
            </button>
          </div>
        )}

        {/* STEP 3 — FICA / KYC */}
        {currentStep === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Required under FICA (Act 38 of 2001) for trust entities.</p>
            {[
              { key: 'trust_deed_uploaded', title: 'TRUST DEED', desc: 'Certified copy of the trust deed' },
              { key: 'loa_uploaded', title: 'LETTER OF AUTHORITY', desc: 'Master of the High Court letter of authority' },
              { key: 'trustee_ids_uploaded', title: 'TRUSTEE IDENTITY DOCUMENTS', desc: 'Certified ID copies for all trustees' },
            ].map(doc => (
              <div key={doc.key} className="border border-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase">{doc.title}</h4>
                </div>
                {formData[doc.key] ? (
                  <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded">
                    <Check className="w-4 h-4 text-teal" /><span className="text-xs text-teal font-medium">Uploaded</span>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-ocean/50 transition-colors">
                      <p className="text-xs font-medium text-navy">{doc.desc}</p>
                      <p className="text-[10px] text-ocean mt-2">Click to upload</p>
                    </div>
                    <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 4 — Financial Profile */}
        {currentStep === 4 && (
          <div className="border border-border rounded p-3 space-y-3">
            <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">INCOME & ASSETS</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'gross_annual_income_band', label: 'GROSS ANNUAL INCOME BAND', opts: ['Under R150,000','R150,000 – R350,000','R350,000 – R750,000','R750,000 – R1.5m','R1.5m – R3m','Over R3m'] },
                { field: 'monthly_investable_surplus', label: 'MONTHLY INVESTABLE SURPLUS', opts: ['Under R2,000','R2,000 – R5,000','R5,000 – R15,000','R15,000 – R50,000','Over R50,000'] },
                { field: 'net_worth_band', label: 'NET WORTH BAND', opts: ['Under R500,000','R500k – R2m','R2m – R5m','R5m – R10m','R10m – R20m','Over R20m'] },
                { field: 'total_liabilities', label: 'TOTAL LIABILITIES', opts: ['None','Under R500,000','R500k – R1m','R1m – R3m','Over R3m'] },
              ].map(({ field, label, opts }) => (
                <div key={field}>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">{label}</Label>
                  <Select value={formData[field]} onValueChange={v => handleChange(field, v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5 — Risk & Objectives */}
        {currentStep === 5 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">RISK TOLERANCE</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'portfolio_drop_response', label: 'IF PORTFOLIO FELL 20%', opts: ['Sell immediately','Hold','Buy more'] },
                  { field: 'primary_investment_objective', label: 'PRIMARY OBJECTIVE', opts: ['Capital preservation','Income generation','Moderate growth','Aggressive growth','Speculation'] },
                  { field: 'time_horizon', label: 'TIME HORIZON', opts: ['Less than 1 year','1–3 years','3–5 years','5–10 years','10+ years'] },
                  { field: 'liquidity_requirement', label: 'LIQUIDITY REQUIREMENT', opts: ['Immediate access required','Access within 1 year','Access within 3 years','Long-term — no immediate need'] },
                ].map(({ field, label, opts }) => (
                  <div key={field}>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">{label}</Label>
                    <Select value={formData[field]} onValueChange={v => handleChange(field, v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-2">RISK PROFILE *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['Conservative','Cautious','Moderate','Growth','Aggressive'].map(v => (
                    <button key={v} type="button" onClick={() => handleChange('risk_profile', v)}
                      className={`p-2 border rounded text-left transition-all ${formData.risk_profile === v ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
                      <p className={`text-xs font-semibold ${formData.risk_profile === v ? 'text-ocean' : 'text-navy'}`}>{v}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">ADVISORY NEEDS</h3>
              <div className="grid grid-cols-2 gap-2">
                {ADVISORY_NEEDS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer p-1.5 border border-border rounded hover:bg-secondary/50 text-xs">
                    <input type="checkbox" checked={formData.advisory_needs.includes(item)} onChange={() => toggleNeed(item)} className="w-3.5 h-3.5 accent-ocean" />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — Documents */}
        {currentStep === 6 && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'identity_document_uploaded', title: 'IDENTITY DOCUMENT', desc: 'SA ID / Smart Card / Passport' },
              { key: 'proof_of_address_uploaded', title: 'PROOF OF ADDRESS', desc: 'Utility bill / bank statement' },
              { key: 'income_proof_uploaded', title: 'INCOME / SOURCE OF FUNDS', desc: '3 months payslips or bank statements' },
              { key: 'existing_policies_uploaded', title: 'EXISTING POLICIES', desc: 'Current policy documents or statements' },
            ].map(doc => (
              <div key={doc.key} className="border border-border rounded p-3">
                <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">{doc.title}</h4>
                {formData[doc.key] ? (
                  <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded">
                    <Check className="w-4 h-4 text-teal" /><span className="text-xs text-teal font-medium">Uploaded</span>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-ocean/50 transition-colors">
                      <p className="text-xs font-medium text-navy">{doc.desc}</p>
                      <p className="text-[10px] text-ocean mt-2">Click to upload</p>
                    </div>
                    <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 7 — Submit */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-teal/10 border border-teal/20 rounded">
              <Check className="w-5 h-5 text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Your trust onboarding is complete</p>
                <p className="text-xs text-muted-foreground mt-0.5">A draft proposal has been created. Your WealthWorks advisor has been notified.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'TRUST NAME', value: formData.entity_name },
                { label: 'RISK PROFILE', value: formData.risk_profile || '—' },
                { label: 'TRUSTEES', value: `${trustees.filter(t => t.full_name).length} added` },
                { label: 'ADVISOR', value: 'Trevor Fine' },
              ].map(s => (
                <div key={s.label} className="border border-border rounded p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-bold text-ocean mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="pt-5 border-t border-border mt-5 flex gap-3">
          {currentStep > 1 && currentStep < 7 && (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm">← Back</Button>
          )}
          <div className="flex-1" />
          {currentStep < 6 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue →'}
            </Button>
          )}
          {currentStep === 6 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Review & submit →'}
            </Button>
          )}
          {currentStep === 7 && (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 h-9 text-sm bg-teal text-white hover:bg-teal/90">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm & done →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}