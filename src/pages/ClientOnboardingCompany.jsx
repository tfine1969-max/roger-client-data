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
  { number: 1, label: 'Company details' },
  { number: 2, label: 'Directors' },
  { number: 3, label: 'Document upload' },
  { number: 4, label: 'KYC declaration' },
  { number: 5, label: 'FICA verification' },
  { number: 6, label: 'Financial profile' },
  { number: 7, label: 'Risk & objectives' },
  { number: 8, label: 'Submit' },
];

const ADVISORY_NEEDS = ['Local and offshore investments', 'Life & risk cover', 'Tax planning', 'Business assurance'];
const PROVINCES = ['Western Cape','Gauteng','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];

const calcRiskScore = (fd) => {
  let s = 0;
  s += ({ 'Sell immediately': 0, 'Hold': 1.5, 'Buy more': 3 })[fd.portfolio_drop_response] || 0;
  s += ({ 'Less than 1 year': 0, '1–3 years': 0.75, '3–5 years': 1.5, '5–10 years': 2.25, '10+ years': 3 })[fd.time_horizon] || 0;
  s += ({ 'Immediate access required': 0, 'Access within 1 year': 0.67, 'Access within 3 years': 1.33, 'Long-term — no immediate need': 2 })[fd.liquidity_requirement] || 0;
  s += ({ 'Capital preservation': 0, 'Income generation': 0.5, 'Moderate growth': 1, 'Aggressive growth': 1.5, 'Speculation': 2 })[fd.primary_investment_objective] || 0;
  return Math.round(Math.min(10, s));
};
const scoreToProfile = (s) => s <= 2 ? 'Conservative' : s <= 4 ? 'Cautious' : s <= 6 ? 'Moderate' : s <= 8 ? 'Growth' : 'Aggressive';

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
  const [ficaRunning, setFicaRunning] = useState(false);
  const [ficaResult, setFicaResult] = useState(null);
  const [cipcResult, setCipcResult] = useState(null);
  const [directorChecks, setDirectorChecks] = useState([]);

  const [formData, setFormData] = useState({
    entity_name: '', registration_number: '', vat_number: '',
    street_address: '', suburb: '', city: '', province: '', postal_code: '',
    email: '', mobile_number: '',
    // Docs
    cipc_registration_uploaded: false, moi_uploaded: false,
    proof_of_address_uploaded: false, financial_statements_uploaded: false,
    // KYC
    business_activity: '', entity_source_of_funds: [], ubo_declaration: '',
    entity_tax_number: '', entity_tax_residency: '', entity_fatca: 'No', entity_pep: 'No',
    // Financial
    gross_annual_turnover: '', total_assets_band: '', entity_total_liabilities: '',
    entity_existing_products: '', entity_loa_uploaded: false, entity_loa_authorised: false,
    // Risk
    portfolio_drop_response: '', primary_investment_objective: '',
    time_horizon: '', liquidity_requirement: '', risk_profile: '', advisory_needs: [],
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
    if (seedRaw) { try { setFormData(prev => ({ ...prev, ...JSON.parse(seedRaw) })); } catch {} sessionStorage.removeItem('test_onboarding_seed'); }
    const dirSeed = sessionStorage.getItem('test_directors_seed');
    if (dirSeed) { try { const d = JSON.parse(dirSeed); if (Array.isArray(d) && d.length > 0) setDirectors(d); } catch {} sessionStorage.removeItem('test_directors_seed'); }
    base44.entities.Clients.list().then(clients => {
      const c = clients.find(x => x.id === id);
      if (c) {
        setFormData(prev => ({
          ...prev,
          entity_name: c.entity_name || prev.entity_name,
          registration_number: c.registration_number || prev.registration_number,
          street_address: c.street_address || prev.street_address,
          suburb: c.suburb || prev.suburb, city: c.city || prev.city,
          province: c.province || prev.province, postal_code: c.postal_code || prev.postal_code,
          email: c.email || prev.email, mobile_number: c.mobile_number || prev.mobile_number,
          portfolio_drop_response: c.portfolio_drop_response || prev.portfolio_drop_response,
          primary_investment_objective: c.primary_investment_objective || prev.primary_investment_objective,
          time_horizon: c.time_horizon || prev.time_horizon,
          liquidity_requirement: c.liquidity_requirement || prev.liquidity_requirement,
          risk_profile: c.risk_profile || prev.risk_profile,
          advisory_needs: Array.isArray(c.advisory_needs) ? c.advisory_needs.filter(n => ADVISORY_NEEDS.includes(n)) : prev.advisory_needs,
        }));
        if (c.risk_profile) setProfileOverridden(true);
        if (Array.isArray(c.directors_list) && c.directors_list.length > 0) setDirectors(c.directors_list);
      }
    }).catch(() => {}).finally(() => { setClientId(id); setIsInitializing(false); setProfileInitialised(true); });
  }, [navigate]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleSof = (item) => setFormData(prev => ({
    ...prev,
    entity_source_of_funds: prev.entity_source_of_funds.includes(item)
      ? prev.entity_source_of_funds.filter(i => i !== item)
      : [...prev.entity_source_of_funds, item],
  }));
  const toggleNeed = (item) => setFormData(prev => ({
    ...prev,
    advisory_needs: prev.advisory_needs.includes(item) ? prev.advisory_needs.filter(i => i !== item) : [...prev.advisory_needs, item],
  }));

  useEffect(() => {
    if (!profileInitialised || profileOverridden) return;
    if (formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) {
      const suggested = scoreToProfile(calcRiskScore(formData));
      setFormData(prev => prev.risk_profile === suggested ? prev : { ...prev, risk_profile: suggested });
    }
  }, [formData.portfolio_drop_response, formData.time_horizon, formData.liquidity_requirement, formData.primary_investment_objective]);

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

  const runEntityFicaVerification = async () => {
    if (!formData.registration_number) { toast.error('Registration number required'); return; }
    if (directors.filter(d => d.first_name && d.id_number).length === 0) { toast.error('Please complete director details first'); return; }
    setFicaRunning(true); setFicaResult(null); setCipcResult(null);
    const activeDirs = directors.filter(d => d.first_name && d.id_number);
    setDirectorChecks(activeDirs.map(d => ({ name: d.first_name + ' ' + d.last_name, id: 'pending', aml: 'pending' })));
    try {
      const cipc = await base44.functions.invoke('ficaVerify', { action: 'verifyCipc', payload: { registration_number: formData.registration_number } });
      const cipcData = cipc?.data?.data?.results || {};
      const cipcMatch = cipcData.cipc_company_match || cipcData.cipc_verification || {};
      const cipcPass = cipcMatch.Status === 'Success' || cipcMatch.Status === 'Active';
      setCipcResult({ pass: cipcPass, data: cipc?.data?.data });
      if (!cipcPass) {
        const ref = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
        setFicaResult({ fica_status: 'Declined', fica_reference: ref, verified_at: new Date().toISOString(), failure_reason: 'CIPC registration could not be verified' });
        await base44.entities.Clients.update(clientId, { fica_status: 'Declined', fica_reference: ref, cipc_verified: false });
        setFicaRunning(false); toast.error('FICA Declined — CIPC registration not verified'); return;
      }
      let allPass = true, anyFlag = false;
      const updatedChecks = [];
      for (let i = 0; i < activeDirs.length; i++) {
        const dir = activeDirs[i];
        setDirectorChecks(prev => prev.map((c, idx) => idx === i ? { ...c, id: 'running' } : c));
        const idResult = await base44.functions.invoke('ficaVerify', { action: 'verifyId', payload: { id_number: dir.id_number, first_name: dir.first_name, last_name: dir.last_name, date_of_birth: dir.date_of_birth } });
        const idPass = idResult?.data?.data?.results?.said_verification?.Status === 'Success';
        setDirectorChecks(prev => prev.map((c, idx) => idx === i ? { ...c, id: idPass ? 'pass' : 'fail' } : c));
        if (!idPass) allPass = false;
        setDirectorChecks(prev => prev.map((c, idx) => idx === i ? { ...c, aml: 'running' } : c));
        const amlResult = await base44.functions.invoke('ficaVerify', { action: 'screenAml', payload: { name: dir.first_name + ' ' + dir.last_name, entity: 0, country: 'za', dataset: 'all' } });
        const amlMatch = amlResult?.data?.data?.totalHits > 0 || false;
        if (amlMatch) anyFlag = true;
        setDirectorChecks(prev => prev.map((c, idx) => idx === i ? { ...c, aml: amlMatch ? 'flag' : 'pass' } : c));
        updatedChecks.push({ ...dir, id_verified: idPass, aml_clear: !amlMatch });
      }
      const ficaStatus = !allPass ? 'Declined' : anyFlag ? 'Referred' : 'Approved';
      const ficaRef = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
      const finalResult = { fica_status: ficaStatus, fica_reference: ficaRef, verified_at: new Date().toISOString(), failure_reason: null };
      setFicaResult(finalResult);
      await base44.entities.Clients.update(clientId, {
        fica_status: ficaStatus, fica_reference: ficaRef, fica_verified_at: finalResult.verified_at,
        cipc_verified: cipcPass, entity_aml_clear: !anyFlag,
        directors_json: JSON.stringify(updatedChecks),
        fica_checks_json: JSON.stringify({ cipc: cipcPass, directors: updatedChecks }),
      });
      if (ficaStatus !== 'Approved') {
        await base44.integrations.Core.SendEmail({ from_name: 'WealthWorks FICA', to: 'tfine1969@gmail.com', subject: 'Entity FICA ' + ficaStatus + ' — ' + formData.entity_name, body: 'FICA verification for company ' + formData.entity_name + ' (Reg: ' + formData.registration_number + ') returned: ' + ficaStatus + '\n\nReference: ' + ficaRef + '\nCIPC verified: ' + cipcPass + '\nDirectors checked: ' + activeDirs.length + '\n\nLog in to the WealthWorks Advisor Portal to review.' });
      }
      if (ficaStatus === 'Approved') toast.success('Entity FICA Approved — ' + ficaRef);
      else if (ficaStatus === 'Referred') toast.warning('FICA Referred — EDD required. Advisor notified.');
      else toast.error('FICA Declined — please contact your advisor.');
    } catch (err) {
      setFicaResult({ fica_status: 'Error', failure_reason: err.message || 'Verification service unavailable' });
      toast.error('Verification error — please try again');
    } finally { setFicaRunning(false); }
  };

  const handleContinue = async () => {
    let data = {};
    if (currentStep === 1) {
      if (!formData.entity_name || !formData.registration_number) { toast.error('Please fill in company name and registration number'); return; }
      data = {
        client_type: 'Company', identity_type: 'Registration',
        entity_name: formData.entity_name, registration_number: formData.registration_number, vat_number: formData.vat_number,
        street_address: formData.street_address, suburb: formData.suburb, city: formData.city,
        province: formData.province, postal_code: formData.postal_code,
        email: formData.email, mobile_number: formData.mobile_number,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (directors.some(d => !d.first_name || !d.last_name || !d.id_number)) { toast.error('Please complete all director names and ID numbers'); return; }
      data = { directors_list: directors };
    } else if (currentStep === 3) {
      const perDirectorDocs = {};
      directors.forEach((_, idx) => {
        perDirectorDocs[`director_${idx}_id_uploaded`] = formData[`director_${idx}_id_uploaded`] || false;
        perDirectorDocs[`director_${idx}_addr_uploaded`] = formData[`director_${idx}_addr_uploaded`] || false;
      });
      data = {
        cipc_registration_uploaded: formData.cipc_registration_uploaded || false,
        moi_uploaded: formData.moi_uploaded || false,
        proof_of_address_uploaded: formData.proof_of_address_uploaded || false,
        financial_statements_uploaded: formData.financial_statements_uploaded || false,
        ...perDirectorDocs,
      };
    } else if (currentStep === 4) {
      data = {
        business_activity: formData.business_activity,
        entity_source_of_funds: formData.entity_source_of_funds,
        ubo_declaration: formData.ubo_declaration,
        entity_tax_number: formData.entity_tax_number,
        entity_tax_residency: formData.entity_tax_residency,
        entity_fatca: formData.entity_fatca,
        entity_pep: formData.entity_pep,
      };
    } else if (currentStep === 5) {
      if (!ficaResult) {
        toast.error('Please complete FICA verification before continuing');
        return;
      }
      if (ficaResult.fica_status === 'Declined') {
        toast.warning('FICA Declined — please contact your advisor.');
      }
      data = {
        fica_status: ficaResult.fica_status,
        fica_reference: ficaResult.fica_reference || '',
        fica_verified_at: ficaResult.verified_at || '',
        cipc_verified: cipcResult?.pass || false,
        entity_aml_clear: ficaResult.fica_status !== 'Referred',
        home_affairs_verified: ficaResult.fica_status === 'Approved',
        aml_pep_clear: ficaResult.fica_status !== 'Referred',
        directors_json: JSON.stringify(directors),
      };
    } else if (currentStep === 6) {
      data = {
        gross_annual_turnover: formData.gross_annual_turnover,
        total_assets_band: formData.total_assets_band,
        entity_total_liabilities: formData.entity_total_liabilities,
        existing_products_notes: formData.entity_existing_products,
        entity_loa_uploaded: formData.entity_loa_uploaded,
        entity_loa_authorised: formData.entity_loa_authorised,
      };
    } else if (currentStep === 7) {
      if (!formData.risk_profile) { toast.error('Please select a risk profile'); return; }
      data = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: formData.time_horizon, liquidity_requirement: formData.liquidity_requirement,
        risk_profile: formData.risk_profile, advisory_needs: formData.advisory_needs,
      };
    }
    const saved = await saveStep(data);
    if (saved) setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!clientId) return;
    setIsSubmitting(true);
    try {
      await base44.entities.Clients.update(clientId, {
        client_status: 'Onboarded', onboarding_complete: true,
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        fica_risk_band: ficaResult?.fica_status === 'Approved' ? 'Low' : '',
        rmcp_risk_band: ficaResult?.fica_status === 'Approved' ? 'Low' : 'Pending',
        rmcp_risk_score: 0,
        home_affairs_verified: ficaResult?.fica_status === 'Approved',
        aml_pep_clear: ficaResult?.fica_status === 'Approved',
      });
      const allProposals = await base44.entities.Proposal.list();
      const existing = allProposals.find(p => p.client_id === clientId);
      const clientName = formData.entity_name || 'Company Client';
      const proposalData = {
        client_id: clientId, client_name: clientName, advisory_needs: formData.advisory_needs,
        status: 'new',
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        fica_risk_band: ficaResult?.fica_status === 'Approved' ? 'Low' : '',
        rmcp_risk_score: 0,
        rmcp_risk_band: ficaResult?.fica_status === 'Approved' ? 'Low' : 'Pending',
        offshore_exposure: (formData.advisory_needs || []).includes('Local and offshore investments'),
        aml_pep_clear: ficaResult?.fica_status === 'Approved',
        home_affairs_verified: ficaResult?.fica_status === 'Approved',
      };
      if (existing) {
        await base44.entities.Proposal.update(existing.id, proposalData);
      } else {
        await base44.entities.Proposal.create({
          ...proposalData,
          reference: 'WW-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          advisor_name: 'Trevor Fine', pdf_status: 'No PDF',
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

  const idCfg = { pending: 'bg-secondary text-muted-foreground border-border', running: 'bg-ocean/10 text-ocean border-ocean/20', pass: 'bg-teal/10 text-teal border-teal/20', fail: 'bg-red-50 text-red-700 border-red-200' };
  const amlCfg = { pending: 'bg-secondary text-muted-foreground border-border', running: 'bg-ocean/10 text-ocean border-ocean/20', pass: 'bg-teal/10 text-teal border-teal/20', flag: 'bg-amber-50 text-amber-700 border-amber-200', fail: 'bg-red-50 text-red-700 border-red-200' };
  const idLabel = { pending: 'Pending', running: 'Running…', pass: 'ID Verified', fail: 'Failed' };
  const amlLabel = { pending: 'Pending', running: 'Running…', pass: 'AML Clear', flag: 'Flagged — EDD', fail: 'Failed' };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> WEALTHWORKS.CO.ZA
        </button>
        <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF 8 · COMPANY</span>
      </div>

      <div className="bg-card border-b border-border px-5 py-0 flex items-center gap-0 overflow-x-auto shrink-0">
        {STEPS.map(step => {
          const isComplete = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <button key={step.number} type="button" onClick={() => setCurrentStep(step.number)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${isCurrent ? 'border-ocean text-ocean' : isComplete ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isCurrent ? 'bg-ocean text-white' : isComplete ? 'bg-teal text-white' : 'bg-border text-muted-foreground'}`}>
                {isComplete ? '✓' : step.number}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-4xl mx-auto w-full">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">STEP {currentStep} OF 8 · COMPANY ONBOARDING</p>
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
                      <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
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
              <PersonCard key={idx} person={director} idx={idx} role="Director" onUpdate={updateDirector} onRemove={removeDirector} canRemove={directors.length > 2 && idx >= 2} />
            ))}
            <button type="button" onClick={addDirector} className="flex items-center gap-1.5 text-xs text-ocean hover:text-navy font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add director
            </button>
          </div>
        )}

        {/* STEP 3 — Document Upload */}
        {currentStep === 3 && (
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
                  return (
                    <div key={idx} className="border border-border rounded p-3">
                      <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Director {idx + 1} — {name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: `director_${idx}_id_uploaded`, title: 'SA ID / PASSPORT', desc: 'Certified copy of identity document' },
                          { key: `director_${idx}_addr_uploaded`, title: 'PROOF OF RESIDENTIAL ADDRESS', desc: 'Utility bill / bank statement' },
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

        {/* STEP 4 — KYC Declaration */}
        {currentStep === 4 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">BUSINESS INFORMATION</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">BUSINESS ACTIVITY / DESCRIPTION *</Label>
                  <Input className="mt-1 h-8 text-sm" value={formData.business_activity} onChange={e => handleChange('business_activity', e.target.value)} placeholder="Describe the main business activity" />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-2 block">SOURCE OF FUNDS</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Operational revenue','Investment returns','Capital contributions','Asset sales','Loan funding','Other'].map(item => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer p-1.5 border border-border rounded hover:bg-secondary/50 text-xs">
                        <input type="checkbox" checked={formData.entity_source_of_funds.includes(item)} onChange={() => toggleSof(item)} className="w-3.5 h-3.5 accent-ocean" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">UBO DECLARATION</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">List all beneficial owners with more than 25% shareholding (name and percentage)</p>
                  <textarea
                    className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                    value={formData.ubo_declaration} onChange={e => handleChange('ubo_declaration', e.target.value)}
                    placeholder="e.g. John Smith — 60%, Jane Doe — 40%"
                  />
                </div>
              </div>
            </div>
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">TAX & COMPLIANCE DECLARATION</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SA TAX NUMBER</Label>
                  <Input className="mt-1 h-8 text-sm" value={formData.entity_tax_number} onChange={e => handleChange('entity_tax_number', e.target.value)} placeholder="10-digit SARS number" />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TAX RESIDENCY</Label>
                  <Select value={formData.entity_tax_residency} onValueChange={v => handleChange('entity_tax_residency', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South Africa only">South Africa only</SelectItem>
                      <SelectItem value="South Africa + Other">South Africa + Other</SelectItem>
                      <SelectItem value="Other country only">Other country only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">FATCA (US ENTITY?)</Label>
                  <Select value={formData.entity_fatca} onValueChange={v => handleChange('entity_fatca', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">ANY DIRECTOR IS A PEP?</Label>
                  <Select value={formData.entity_pep} onValueChange={v => handleChange('entity_pep', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — FICA Verification */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">CIPC VERIFICATION</h3>
              {cipcResult ? (
                <div className={`flex items-center gap-2 p-2 rounded border ${cipcResult.pass ? 'bg-teal/10 border-teal/20' : 'bg-red-50 border-red-200'}`}>
                  <span className="text-sm">{cipcResult.pass ? '✓' : '✕'}</span>
                  <span className={`text-xs font-medium ${cipcResult.pass ? 'text-teal' : 'text-red-700'}`}>{cipcResult.pass ? 'CIPC registration verified — ' + formData.registration_number : 'CIPC verification failed — ' + formData.registration_number}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">CIPC registration number will be verified against the Companies and Intellectual Property Commission database.</p>
              )}
            </div>
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">DIRECTOR VERIFICATION</h3>
              {directorChecks.length > 0 ? (
                <div className="space-y-2">
                  {directorChecks.map((check, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border border-border rounded">
                      <div className="flex-1 text-xs font-medium text-navy">Director {idx + 1} — {check.name}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${idCfg[check.id] || idCfg.pending}`}>{idLabel[check.id] || 'Pending'}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${amlCfg[check.aml] || amlCfg.pending}`}>{amlLabel[check.aml] || 'Pending'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Each director will be verified against Home Affairs HANIS and AML/PEP/sanctions lists individually.</p>
              )}
            </div>
            <div className="border-2 border-ocean/20 rounded-lg p-4 bg-ocean/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-navy text-sm">Entity FICA Verification</h3>
                  <p className="text-[10px] text-muted-foreground">CIPC · Director ID checks · AML/PEP per director · Powered by VerifyNow</p>
                </div>
                {!ficaRunning && (
                  <button type="button" onClick={runEntityFicaVerification} className={`h-8 text-xs px-4 rounded font-medium transition-all ${ficaResult ? 'bg-secondary text-navy border border-border' : 'bg-ocean text-white hover:bg-navy'}`}>
                    {ficaResult ? '↺ Re-verify' : '⊕ Verify entity with VerifyNow'}
                  </button>
                )}
                {ficaRunning && <span className="text-xs text-ocean font-medium animate-pulse">Verifying directors…</span>}
              </div>
              {ficaResult && ficaResult.fica_status && (
                <div className={`flex items-start gap-3 p-3 border rounded ${ficaResult.fica_status === 'Approved' ? 'bg-teal/10 border-teal/20' : ficaResult.fica_status === 'Referred' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <span className="text-base shrink-0">{ficaResult.fica_status === 'Approved' ? '✓' : ficaResult.fica_status === 'Referred' ? '⚠' : '✕'}</span>
                  <div>
                    <p className={`font-semibold text-sm ${ficaResult.fica_status === 'Approved' ? 'text-teal' : ficaResult.fica_status === 'Referred' ? 'text-amber-700' : 'text-red-700'}`}>
                      {ficaResult.fica_status === 'Approved' ? 'Entity FICA Approved' : ficaResult.fica_status === 'Referred' ? 'Referred — EDD required on one or more directors' : 'Entity FICA Verification Failed'}
                    </p>
                    {ficaResult.fica_reference && <p className="text-[10px] text-muted-foreground mt-0.5">Reference: <span className="font-mono font-semibold">{ficaResult.fica_reference}</span> · {new Date(ficaResult.verified_at).toLocaleString('en-ZA')}</p>}
                    {ficaResult.failure_reason && <p className="text-[10px] text-red-700 mt-1">{ficaResult.failure_reason}</p>}
                  </div>
                </div>
              )}
              {!ficaRunning && !ficaResult && (
                <div className="text-center py-3 text-xs text-muted-foreground border border-dashed border-border rounded">
                  <p>Click <strong>Verify entity with VerifyNow</strong> to run CIPC and director checks</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-secondary/50 border border-border rounded text-[10px] text-muted-foreground">
              <span className="font-semibold text-navy">FICA compliance note: </span>
              Company verification includes CIPC registration status and individual identity and AML/PEP screening for each director. Records retained 5 years minimum per FICA Section 23.
            </div>
          </div>
        )}

        {/* STEP 6 — Financial Profile */}
        {currentStep === 6 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">COMPANY FINANCIALS</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">GROSS ANNUAL TURNOVER</Label>
                  <Select value={formData.gross_annual_turnover} onValueChange={v => handleChange('gross_annual_turnover', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Under R1m','R1m – R5m','R5m – R20m','R20m – R50m','Over R50m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL ASSETS BAND</Label>
                  <Select value={formData.total_assets_band} onValueChange={v => handleChange('total_assets_band', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Under R500k','R500k – R2m','R2m – R10m','R10m – R50m','Over R50m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
                  <Select value={formData.entity_total_liabilities} onValueChange={v => handleChange('entity_total_liabilities', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['None','Under R500,000','R500k – R1m','R1m – R3m','Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">EXISTING FINANCIAL PRODUCTS / POLICIES</Label>
                <textarea
                  className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                  value={formData.entity_existing_products} onChange={e => handleChange('entity_existing_products', e.target.value)}
                  placeholder="List current policies and investments e.g. Company RA, Group risk cover, Sanlam endowment..."
                />
              </div>
            </div>
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">LETTER OF AUTHORITY</h3>
              {formData.entity_loa_uploaded ? (
                <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded mb-2">
                  <Check className="w-4 h-4 text-teal" /><span className="text-xs text-teal font-medium">LOA uploaded</span>
                </div>
              ) : (
                <label className="block cursor-pointer mb-2">
                  <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                    <p className="text-xs font-medium text-navy">Letter of Authority document</p>
                    <p className="text-[10px] text-ocean mt-1">Click to upload</p>
                  </div>
                  <input type="file" className="hidden" onChange={() => handleChange('entity_loa_uploaded', true)} />
                </label>
              )}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.entity_loa_authorised} onChange={e => handleChange('entity_loa_authorised', e.target.checked)} className="w-3.5 h-3.5 accent-ocean mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground">I authorise WealthWorks to obtain information on existing policies from the relevant providers.</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 7 — Risk & Objectives */}
        {currentStep === 7 && (
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
                  {profileOverridden && <button type="button" onClick={() => setProfileOverridden(false)} className="text-[10px] text-ocean hover:underline">Reset to calculated</button>}
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

        {/* STEP 8 — Submit */}
        {currentStep === 8 && (
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
          {currentStep > 1 && currentStep < 8 && (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm">← Back</Button>
          )}
          <div className="flex-1" />
          {currentStep < 7 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue →'}
            </Button>
          )}
          {currentStep === 7 && (
            <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
              {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Review & submit →'}
            </Button>
          )}
          {currentStep === 8 && (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 h-9 text-sm bg-teal text-white hover:bg-teal/90">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm & done →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}