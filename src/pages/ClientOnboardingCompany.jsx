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

// Steps: removed FICA/KYC (old 3) and Financial Profile (old 4)
const STEPS = [
  { number: 1, label: 'Company details' },
  { number: 2, label: 'Directors' },
  { number: 3, label: 'Risk & objectives' },
  { number: 4, label: 'Documents' },
  { number: 5, label: 'Submit' },
];

const ADVISORY_NEEDS = [
  'Local and offshore investments', 'Life & risk cover',
  'Tax planning', 'Business assurance',
];

const calcRiskScore = (fd) => {
  let s = 0;
  const dropMap = { 'Sell immediately': 0, 'Hold': 1.5, 'Buy more': 3 };
  const horizonMap = { 'Less than 1 year': 0, '1–3 years': 0.75, '3–5 years': 1.5, '5–10 years': 2.25, '10+ years': 3 };
  const liquidMap = { 'Immediate access required': 0, 'Access within 1 year': 0.67, 'Access within 3 years': 1.33, 'Long-term — no immediate need': 2 };
  const objMap = { 'Capital preservation': 0, 'Income generation': 0.5, 'Moderate growth': 1, 'Aggressive growth': 1.5, 'Speculation': 2 };
  s += dropMap[fd.portfolio_drop_response] || 0;
  s += horizonMap[fd.time_horizon] || 0;
  s += liquidMap[fd.liquidity_requirement] || 0;
  s += objMap[fd.primary_investment_objective] || 0;
  return Math.round(Math.min(10, s));
};
const scoreToProfile = (score) => {
  if (score <= 2) return 'Conservative';
  if (score <= 4) return 'Cautious';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Growth';
  return 'Aggressive';
};

const emptyDirector = () => ({
  title: '', first_name: '', last_name: '', identity_type: 'SA ID',
  id_number: '', passport_country: '', date_of_birth: '',
  gender: '', marital_status: '', nationality: '',
  email: '', mobile: '',
  street_address: '', suburb: '', city: '', province: '', postal_code: '',
});

export default function ClientOnboardingCompany() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profileOverridden, setProfileOverridden] = useState(false);
  const [profileInitialised, setProfileInitialised] = useState(false);

  const [formData, setFormData] = useState({
    entity_name: '',
    registration_number: '',
    vat_number: '',
    street_address: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    email: '',
    mobile_number: '',
    // Risk
    portfolio_drop_response: '',
    primary_investment_objective: '',
    time_horizon: '',
    liquidity_requirement: '',
    risk_profile: '',
    advisory_needs: [],
    // Docs
    cipc_registration_uploaded: false,
    moi_uploaded: false,
    proof_of_address_uploaded: false,
    financial_statements_uploaded: false,
  });

  const [directors, setDirectors] = useState([emptyDirector(), emptyDirector()]);

  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) { navigate('/client-registration', { replace: true }); return; }

    const entityType = sessionStorage.getItem('pending_entity_type');
    if (entityType && entityType !== 'Company') {
      if (entityType === 'Trust') { navigate('/client-onboarding-trust', { replace: true }); return; }
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
    const directorsSeedRaw = sessionStorage.getItem('test_directors_seed');
    if (directorsSeedRaw) {
      try {
        const directorsSeed = JSON.parse(directorsSeedRaw);
        if (Array.isArray(directorsSeed) && directorsSeed.length > 0) setDirectors(directorsSeed);
      } catch {}
      sessionStorage.removeItem('test_directors_seed');
    }

    base44.entities.Clients.list().then(clients => {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData(prev => ({
          ...prev,
          entity_name: client.entity_name || prev.entity_name,
          registration_number: client.registration_number || prev.registration_number,
          street_address: client.street_address || prev.street_address,
          suburb: client.suburb || prev.suburb,
          city: client.city || prev.city,
          province: client.province || prev.province,
          postal_code: client.postal_code || prev.postal_code,
          email: client.email || prev.email,
          mobile_number: client.mobile_number || prev.mobile_number,
          portfolio_drop_response: client.portfolio_drop_response || prev.portfolio_drop_response,
          primary_investment_objective: client.primary_investment_objective || prev.primary_investment_objective,
          time_horizon: client.time_horizon || prev.time_horizon,
          liquidity_requirement: client.liquidity_requirement || prev.liquidity_requirement,
          risk_profile: client.risk_profile || prev.risk_profile,
          advisory_needs: Array.isArray(client.advisory_needs) ? client.advisory_needs : prev.advisory_needs,
        }));
        if (client.risk_profile) setProfileOverridden(true);
        if (Array.isArray(client.directors_list) && client.directors_list.length > 0) setDirectors(client.directors_list);
      }
    }).catch(() => {}).finally(() => { setClientId(id); setIsInitializing(false); setProfileInitialised(true); });
  }, [navigate]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!profileInitialised || profileOverridden) return;
    if (formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) {
      const suggested = scoreToProfile(calcRiskScore(formData));
      setFormData(prev => prev.risk_profile === suggested ? prev : { ...prev, risk_profile: suggested });
    }
  }, [formData.portfolio_drop_response, formData.time_horizon, formData.liquidity_requirement, formData.primary_investment_objective]);

  const toggleNeed = (item) => setFormData(prev => ({
    ...prev,
    advisory_needs: prev.advisory_needs.includes(item)
      ? prev.advisory_needs.filter(i => i !== item)
      : [...prev.advisory_needs, item],
  }));

  const updateDirector = (idx, field, value) => setDirectors(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  const addDirector = () => setDirectors(prev => [...prev, emptyDirector()]);
  const removeDirector = (idx) => { if (directors.length > 2) setDirectors(prev => prev.filter((_, i) => i !== idx)); };

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
      if (!formData.entity_name || !formData.registration_number) { toast.error('Please fill in company name and registration number'); return; }
      data = {
        client_type: 'Company', identity_type: 'Registration',
        entity_name: formData.entity_name, registration_number: formData.registration_number,
        vat_number: formData.vat_number,
        street_address: formData.street_address, suburb: formData.suburb,
        city: formData.city, province: formData.province, postal_code: formData.postal_code,
        email: formData.email, mobile_number: formData.mobile_number,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (directors.some(d => !d.first_name || !d.last_name || !d.id_number)) { toast.error('Please complete all director names and ID numbers'); return; }
      data = { directors_list: directors };
    } else if (currentStep === 3) {
      if (!formData.risk_profile) { toast.error('Please select a risk profile'); return; }
      data = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: formData.time_horizon, liquidity_requirement: formData.liquidity_requirement,
        risk_profile: formData.risk_profile, advisory_needs: formData.advisory_needs,
      };
    } else if (currentStep === 4) {
      data = {
        cipc_registration_uploaded: formData.cipc_registration_uploaded,
        moi_uploaded: formData.moi_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        financial_statements_uploaded: formData.financial_statements_uploaded,
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
      const clientName = formData.entity_name || 'Company Client';
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
        <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF {STEPS.length} · COMPANY</span>
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
          <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">STEP {currentStep} OF {STEPS.length} · COMPANY ONBOARDING</p>
          <h1 className="text-2xl font-bold text-navy mb-1">{STEPS[currentStep - 1]?.label}</h1>
        </div>

        {/* STEP 1 — Company Details */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">COMPANY NAME *</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.entity_name} onChange={e => handleChange('entity_name', e.target.value)} placeholder="e.g. Alpha Investments (Pty) Ltd" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">REGISTRATION NUMBER (CIPC) *</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.registration_number} onChange={e => handleChange('registration_number', e.target.value)} placeholder="e.g. 2015/123456/07" />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">VAT NUMBER (IF APPLICABLE)</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.vat_number} onChange={e => handleChange('vat_number', e.target.value)} placeholder="e.g. 4123456789" />
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

        {/* STEP 2 — Directors */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add all directors of this company. Minimum 2 required.</p>
            {directors.map((director, idx) => (
              <PersonCard
                key={idx}
                person={director}
                idx={idx}
                role="Director"
                onUpdate={updateDirector}
                onRemove={removeDirector}
                canRemove={directors.length > 2 && idx >= 2}
              />
            ))}
            <button type="button" onClick={addDirector} className="flex items-center gap-1.5 text-xs text-ocean hover:text-navy font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add director
            </button>
          </div>
        )}

        {/* STEP 3 — Risk & Objectives */}
        {currentStep === 3 && (
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
              {(formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) && (
                <div className="mt-3 p-3 bg-ocean/5 border border-ocean/20 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-semibold tracking-wider text-ocean uppercase">CALCULATED RISK SCORE</span>
                    <span className="text-sm font-bold text-ocean">{calcRiskScore(formData)} / 10</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 mb-1">
                    <div className="h-2 rounded-full bg-ocean transition-all" style={{ width: `${calcRiskScore(formData) * 10}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Auto-selecting <strong>{scoreToProfile(calcRiskScore(formData))}</strong> profile</p>
                </div>
              )}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">RISK PROFILE *</Label>
                  {profileOverridden && (
                    <button type="button" onClick={() => setProfileOverridden(false)} className="text-[10px] text-ocean hover:underline">Reset to calculated</button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['Conservative','Cautious','Moderate','Growth','Aggressive'].map(v => (
                    <button key={v} type="button" onClick={() => { setProfileOverridden(true); handleChange('risk_profile', v); }}
                      className={`p-2 border rounded text-left transition-all ${formData.risk_profile === v ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
                      <p className={`text-xs font-semibold ${formData.risk_profile === v ? 'text-ocean' : 'text-navy'}`}>{v}</p>
                    </button>
                  ))}
                </div>
                {profileOverridden && <p className="text-[10px] text-warn mt-1">⚠ Profile manually overridden — calculated score suggests <strong>{scoreToProfile(calcRiskScore(formData))}</strong></p>}
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

        {/* STEP 4 — Documents */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">COMPANY DOCUMENTS</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'cipc_registration_uploaded', title: 'CIPC REGISTRATION CERTIFICATE', desc: 'CoR14.3 / CoR15.1A or equivalent' },
                  { key: 'moi_uploaded', title: 'MOI / MEMORANDUM OF INCORPORATION', desc: 'Certified copy of current MOI' },
                  { key: 'proof_of_address_uploaded', title: 'PROOF OF REGISTERED ADDRESS', desc: 'Utility bill / bank statement' },
                  { key: 'financial_statements_uploaded', title: 'LATEST FINANCIAL STATEMENTS', desc: 'Most recent audited or management accounts' },
                ].map(doc => (
                  <div key={doc.key} className="border border-border rounded p-3">
                    <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">{doc.title}</h4>
                    {formData[doc.key] ? (
                      <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded">
                        <Check className="w-4 h-4 text-teal" /><span className="text-xs text-teal font-medium">Uploaded</span>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                          <p className="text-xs font-medium text-navy">{doc.desc}</p>
                          <p className="text-[10px] text-ocean mt-1">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">PER DIRECTOR DOCUMENTS</p>
              <div className="space-y-3">
                {directors.map((d, idx) => {
                  const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || `Director ${idx + 1}`;
                  const idKey = `director_${idx}_id_uploaded`;
                  const addrKey = `director_${idx}_addr_uploaded`;
                  return (
                    <div key={idx} className="border border-border rounded p-3">
                      <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Director {idx + 1} — {name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: idKey, title: 'SA ID / PASSPORT', desc: 'Certified copy of identity document' },
                          { key: addrKey, title: 'PROOF OF RESIDENTIAL ADDRESS', desc: 'Utility bill / bank statement' },
                        ].map(doc => (
                          <div key={doc.key} className="border border-border rounded p-2">
                            <h4 className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-1">{doc.title}</h4>
                            {formData[doc.key] ? (
                              <div className="flex items-center gap-2 p-1.5 bg-teal/10 border border-teal/20 rounded">
                                <Check className="w-3.5 h-3.5 text-teal" /><span className="text-xs text-teal font-medium">Uploaded</span>
                              </div>
                            ) : (
                              <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-border rounded p-2 text-center hover:border-ocean/50 transition-colors">
                                  <p className="text-[10px] font-medium text-navy">{doc.desc}</p>
                                  <p className="text-[10px] text-ocean mt-0.5">Click to upload</p>
                                </div>
                                <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Submit */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-teal/10 border border-teal/20 rounded">
              <Check className="w-5 h-5 text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy text-sm">Your company onboarding is complete</p>
                <p className="text-xs text-muted-foreground mt-0.5">A draft proposal has been created. Your WealthWorks advisor has been notified.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'COMPANY NAME', value: formData.entity_name },
                { label: 'RISK PROFILE', value: formData.risk_profile || '—' },
                { label: 'DIRECTORS', value: `${directors.filter(d => d.first_name || d.last_name).length} added` },
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
          {currentStep > 1 && currentStep < 5 && (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm">← Back</Button>
          )}
          <div className="flex-1" />
          {currentStep < 4 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue →'}
            </Button>
          )}
          {currentStep === 4 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Review & submit →'}
            </Button>
          )}
          {currentStep === 5 && (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 h-9 text-sm bg-teal text-white hover:bg-teal/90">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm & done →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}