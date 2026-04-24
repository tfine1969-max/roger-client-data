import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check, Plus, Trash2 } from 'lucide-react';

const extractDOBFromID = (idNumber) => {
  if (!idNumber || idNumber.length < 6) return '';
  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  const fullYear = parseInt(yy) > 25 ? `19${yy}` : `20${yy}`;
  return `${fullYear}-${mm}-${dd}`;
};

const INDUSTRIES = [
  'Accounting & Finance', 'Agriculture', 'Construction', 'Education', 'Engineering',
  'Financial Services', 'Government', 'Healthcare', 'Hospitality', 'Information Technology',
  'Legal', 'Manufacturing', 'Media & Marketing', 'Mining', 'Non-profit',
  'Property & Real Estate', 'Retail', 'Transport & Logistics', 'Other'
];

const PRODUCT_TYPES = [
  'Life / risk insurance', 'Retirement annuity', 'Pension / provident fund',
  'Preservation fund', 'Unit trust / CIS', 'Tax-free savings account',
  'Living annuity', 'Offshore investment', 'Medical aid'
];

const ADVISORY_NEEDS = [
  'Local and offshore investments', 'Retirement planning', 'Life & risk cover',
  'Estate planning', 'Tax planning', 'Business assurance', 'Education planning'
];

const STEPS = [
  { number: 1, label: 'Personal details' },
  { number: 2, label: 'FICA / KYC' },
  { number: 3, label: 'Financial profile' },
  { number: 4, label: 'Risk & objectives' },
  { number: 5, label: 'Documents' },
  { number: 6, label: 'Submit' },
];

// Risk score calculator
const calcRiskScore = (formData) => {
  let score = 0;
  // Portfolio drop response (0-3)
  const dropMap = { 'Sell immediately': 0, 'Hold': 1.5, 'Buy more': 3 };
  score += dropMap[formData.portfolio_drop_response] || 0;
  // Time horizon (0-3)
  const horizonMap = { 'Less than 1 year': 0, '1–3 years': 0.75, '3–5 years': 1.5, '5–10 years': 2.25, '10+ years': 3 };
  score += horizonMap[formData.time_horizon] || 0;
  // Liquidity (0-2)
  const liquidMap = { 'Immediate access required': 0, 'Access within 1 year': 0.67, 'Access within 3 years': 1.33, 'Long-term — no immediate need': 2 };
  score += liquidMap[formData.liquidity_requirement] || 0;
  // Objective (0-2)
  const objMap = { 'Capital preservation': 0, 'Income generation': 0.5, 'Moderate growth': 1, 'Aggressive growth': 1.5, 'Speculation': 2 };
  score += objMap[formData.primary_investment_objective] || 0;
  return Math.round(Math.min(10, score));
};

const scoreToProfile = (score) => {
  if (score <= 2) return 'Conservative';
  if (score <= 4) return 'Cautious';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Growth';
  return 'Aggressive';
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [profileOverridden, setProfileOverridden] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1 - Personal
    client_type: 'Natural Person',
    identity_type: 'SA ID',
    title: '',
    first_name: '',
    last_name: '',
    sa_id_number: '',
    passport_number: '',
    date_of_birth: '',
    marital_status: '',
    dependants: '',
    email: '',
    mobile_number: '',
    street_address: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    industry: '',
    entity_name: '',
    registration_number: '',
    trust_number: '',
    // Step 2 - FICA
    employment_status: '',
    occupation: '',
    employer: '',
    source_of_funds: [],
    sa_tax_number: '',
    tax_residency: '',
    us_person_fatca: '',
    pep_status: '',
    pep_explanation: '',
    // Step 3 - Financial Profile
    gross_annual_income_band: '',
    monthly_investable_surplus: '',
    net_worth_band: '',
    total_liabilities: '',
    existing_financial_products: [],
    loa_uploaded: false,
    loa_authorised: false,
    will_in_place: '',
    // Step 4 - Risk
    portfolio_drop_response: '',
    primary_investment_objective: '',
    time_horizon: '',
    liquidity_requirement: '',
    risk_profile: '',
    advisory_needs: [],
    // Step 5 - Documents
    identity_document_uploaded: false,
    proof_of_address_uploaded: false,
    income_proof_uploaded: false,
    existing_policies_uploaded: false,
    // Signatures (kept for data model compatibility)
    client_signature_name: '',
    client_signature_date: new Date().toISOString().split('T')[0],
  });

  // existing_financial_products as structured list
  const [productsList, setProductsList] = useState([]);

  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) {
      toast.error('Invalid session. Please register first.');
      navigate('/client-registration', { replace: true });
      return;
    }
    base44.entities.Clients.list()
      .then(clients => {
        const client = clients.find(c => c.id === id);
        if (client) {
          setFormData(prev => ({
            ...prev,
            client_type: client.client_type || 'Natural Person',
            identity_type: client.identity_type || 'SA ID',
            title: client.title || '',
            first_name: client.first_name || '',
            last_name: client.last_name || '',
            sa_id_number: client.sa_id_number || '',
            passport_number: client.passport_number || '',
            passport_country: client.passport_country || '',
            date_of_birth: client.date_of_birth || '',
            marital_status: client.marital_status || '',
            dependants: client.dependants || '',
            email: client.email || '',
            mobile_number: client.mobile_number || '',
            street_address: client.street_address || '',
            suburb: client.suburb || '',
            city: client.city || '',
            province: client.province || '',
            postal_code: client.postal_code || '',
            industry: client.industry || '',
            entity_name: client.entity_name || '',
            registration_number: client.registration_number || '',
            trust_number: client.trust_number || '',
            employment_status: client.employment_status || '',
            occupation: client.occupation || '',
            employer: client.employer || '',
            source_of_funds: Array.isArray(client.source_of_funds) ? client.source_of_funds : [],
            sa_tax_number: client.sa_tax_number || '',
            tax_residency: client.tax_residency || '',
            us_person_fatca: client.us_person_fatca || '',
            pep_status: client.pep_status || '',
            pep_explanation: client.pep_explanation || '',
            gross_annual_income_band: client.gross_annual_income_band || '',
            monthly_investable_surplus: client.monthly_investable_surplus || '',
            net_worth_band: client.net_worth_band || '',
            total_liabilities: client.total_liabilities || '',
            existing_financial_products: Array.isArray(client.existing_financial_products) ? client.existing_financial_products : [],
            loa_uploaded: client.loa_uploaded || false,
            loa_authorised: client.loa_authorised || false,
            will_in_place: client.will_in_place || '',
            portfolio_drop_response: client.portfolio_drop_response || '',
            primary_investment_objective: client.primary_investment_objective || '',
            time_horizon: client.time_horizon || '',
            liquidity_requirement: client.liquidity_requirement || '',
            risk_profile: client.risk_profile || '',
            advisory_needs: Array.isArray(client.advisory_needs) ? client.advisory_needs : [],
            identity_document_uploaded: client.identity_document_uploaded || false,
            proof_of_address_uploaded: client.proof_of_address_uploaded || false,
            income_proof_uploaded: client.income_proof_uploaded || false,
            existing_policies_uploaded: client.existing_policies_uploaded || false,
            client_signature_name: client.client_signature_name || '',
            client_signature_date: client.client_signature_date || new Date().toISOString().split('T')[0],
          }));
          // Restore structured products list if saved
          if (Array.isArray(client.products_list) && client.products_list.length > 0) {
            setProductsList(client.products_list);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setClientId(id);
        setIsInitializing(false);
      });
  }, [navigate]);

  // Auto-calculate risk profile when relevant fields change
  useEffect(() => {
    if (profileOverridden) return;
    const score = calcRiskScore(formData);
    if (formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) {
      const suggested = scoreToProfile(score);
      setFormData(prev => ({ ...prev, risk_profile: suggested }));
    }
  }, [formData.portfolio_drop_response, formData.time_horizon, formData.liquidity_requirement, formData.primary_investment_objective, profileOverridden]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'sa_id_number' && value.length >= 6) {
      const dob = extractDOBFromID(value);
      if (dob) setFormData(prev => ({ ...prev, date_of_birth: dob }));
    }
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] };
    });
  };

  // Product list helpers
  const addProduct = () => setProductsList(prev => [...prev, { type: '', provider: '', policy_number: '', value: '' }]);
  const removeProduct = (idx) => setProductsList(prev => prev.filter((_, i) => i !== idx));
  const updateProduct = (idx, field, value) => setProductsList(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const saveStep = async (stepData) => {
    if (!clientId) { toast.error('Client record not found'); return false; }
    setIsSavingStep(true);
    try {
      await base44.entities.Clients.update(clientId, stepData);
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to save step');
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleContinue = async () => {
    let stepData = {};

    if (currentStep === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.mobile_number) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (formData.identity_type === 'SA ID' && !formData.sa_id_number) {
        toast.error('Please enter SA ID number');
        return;
      }
      stepData = {
        client_type: formData.client_type,
        identity_type: formData.identity_type,
        title: formData.title,
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
        sa_id_number: formData.sa_id_number,
        passport_number: formData.passport_number,
        date_of_birth: formData.date_of_birth,
        marital_status: formData.marital_status,
        dependants: formData.dependants,
        email: formData.email,
        mobile_number: formData.mobile_number,
        street_address: formData.street_address,
        suburb: formData.suburb,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        industry: formData.industry,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (!formData.employment_status || !formData.occupation) {
        toast.error('Please fill in employment details');
        return;
      }
      stepData = {
        employment_status: formData.employment_status,
        occupation: formData.occupation,
        employer: formData.employer,
        industry: formData.industry,
        source_of_funds: formData.source_of_funds,
        sa_tax_number: formData.sa_tax_number,
        tax_residency: formData.tax_residency,
        us_person_fatca: formData.us_person_fatca,
        pep_status: formData.pep_status,
        pep_explanation: formData.pep_explanation,
      };
    } else if (currentStep === 3) {
      stepData = {
        gross_annual_income_band: formData.gross_annual_income_band,
        monthly_investable_surplus: formData.monthly_investable_surplus,
        net_worth_band: formData.net_worth_band,
        total_liabilities: formData.total_liabilities,
        products_list: productsList,
        loa_uploaded: formData.loa_uploaded,
        loa_authorised: formData.loa_authorised,
        will_in_place: formData.will_in_place,
        dependants: formData.dependants,
      };
    } else if (currentStep === 4) {
      if (!formData.risk_profile) {
        toast.error('Please select a risk profile');
        return;
      }
      stepData = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: formData.time_horizon,
        liquidity_requirement: formData.liquidity_requirement,
        risk_profile: formData.risk_profile,
        advisory_needs: formData.advisory_needs,
      };
    } else if (currentStep === 5) {
      stepData = {
        identity_document_uploaded: formData.identity_document_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        income_proof_uploaded: formData.income_proof_uploaded,
        existing_policies_uploaded: formData.existing_policies_uploaded,
      };
    }

    const saved = await saveStep(stepData);
    if (saved) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate('/client-otp', { replace: true });
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!clientId) { toast.error('Client record not found'); return; }
    setIsSubmitting(true);
    try {
      await base44.entities.Clients.update(clientId, {
        client_status: 'Onboarded',
        onboarding_complete: true,
      });

      await base44.entities.Proposal.create({
        client_id: clientId,
        client_name: `${formData.first_name} ${formData.last_name}`.trim() || formData.entity_name || 'Client',
        reference: 'WW-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        advisor_name: 'Trevor Fine',
        proposal_status: 'Pending Review',
        status: 'new',
        pdf_status: 'No PDF',
        advisor_signature_completed: false,
        client_signature_completed: false,
        document_version: 1,
      });

      toast.success('Onboarding completed successfully');
      navigate('/client-confirmation', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  const riskScore = calcRiskScore(formData);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <div className="hidden md:flex flex-col w-52 bg-card border-r border-border p-4 shrink-0">
        <div className="mb-6">
          <span className="text-navy font-bold text-base tracking-tight">wealthworks</span>
        </div>
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">ONBOARDING</p>
        {STEPS.map(step => {
          const isComplete = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <div key={step.number} className={`flex items-center gap-2 py-1 px-2 rounded text-sm mb-0.5 ${isCurrent ? 'text-ocean font-medium' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${isCurrent ? 'border-ocean bg-ocean text-white' : isComplete ? 'border-teal bg-teal text-white' : 'border-border'}`}>
                {isComplete ? <Check className="w-3 h-3" /> : step.number}
              </div>
              {step.label}
            </div>
          );
        })}
        <div className="mt-auto">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">DOCUMENTS</p>
          {[
            { label: 'Identity document', done: formData.identity_document_uploaded },
            { label: 'Proof of address', done: formData.proof_of_address_uploaded },
            { label: 'Income proof', done: formData.income_proof_uploaded },
          ].map(doc => (
            <div key={doc.label} className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${doc.done ? 'bg-teal' : 'bg-border'}`} />
              {doc.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="bg-card border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            WEALTHWORKS.CO.ZA
          </button>
          <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF 6</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 max-w-6xl mx-auto w-full">
          {/* Step Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">
              STEP {currentStep} OF 6
            </p>
            <h1 className="text-2xl font-bold text-navy mb-1">
              {currentStep === 1 && 'Personal information'}
              {currentStep === 2 && 'Know your client'}
              {currentStep === 3 && 'Financial profile'}
              {currentStep === 4 && 'Risk profile & objectives'}
              {currentStep === 5 && 'Document upload'}
              {currentStep === 6 && 'Submission complete'}
            </h1>
            <p className="text-muted-foreground text-xs max-w-xl">
              {currentStep === 1 && 'Your personal particulars as required under Section 4 of the FAIS Act.'}
              {currentStep === 2 && 'Required under FICA (Act 38 of 2001) to verify identity, source of funds and assess ML/TF risk.'}
              {currentStep === 3 && 'Required for the financial needs analysis under FAIS GCC Section 8.'}
              {currentStep === 4 && 'Your risk profile is a mandatory requirement under FAIS and forms a core part of your Record of Advice.'}
              {currentStep === 5 && 'Upload certified copies of required documents. Stored encrypted under FICA and POPIA obligations.'}
              {currentStep === 6 && 'Your onboarding is complete. Your WealthWorks advisor has been notified.'}
            </p>
          </div>

          {/* ── STEP 1: Personal Information ── */}
          {currentStep === 1 && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TITLE</Label>
                  <Select value={formData.title} onValueChange={v => handleChange('title', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">FIRST NAME(S) *</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="As per ID" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SURNAME *</Label>
                  <Input className="mt-1 h-8 text-sm" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} />
                </div>
              </div>

              {/* Identity type toggle */}
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">IDENTITY TYPE</Label>
                <div className="flex gap-2">
                  {['SA ID', 'Passport'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => handleChange('identity_type', opt)}
                      className={`px-4 py-1.5 text-xs font-medium border rounded transition-all ${formData.identity_type === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'}`}>
                      {opt === 'SA ID' ? 'SA ID Number' : 'Passport Number'}
                    </button>
                  ))}
                </div>
              </div>

              {formData.identity_type === 'SA ID' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SA ID NUMBER *</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="13-digit ID number" maxLength="13" value={formData.sa_id_number} onChange={e => handleChange('sa_id_number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">DATE OF BIRTH (auto-extracted)</Label>
                    <Input type="date" className="mt-1 h-8 text-sm" value={formData.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PASSPORT NUMBER *</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="Passport number" value={formData.passport_number} onChange={e => handleChange('passport_number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">COUNTRY OF ISSUE</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="e.g. United Kingdom" value={formData.passport_country || ''} onChange={e => handleChange('passport_country', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">DATE OF BIRTH *</Label>
                    <Input type="date" className="mt-1 h-8 text-sm" value={formData.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MARITAL STATUS</Label>
                  <Select value={formData.marital_status} onValueChange={v => handleChange('marital_status', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Single', 'Married in community', 'Married out of community', 'Divorced', 'Widowed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">DEPENDANTS</Label>
                  <Select value={formData.dependants} onValueChange={v => handleChange('dependants', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['0', '1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">EMAIL ADDRESS *</Label>
                  <Input type="email" className="mt-1 h-8 text-sm" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MOBILE NUMBER *</Label>
                  <Input type="tel" className="mt-1 h-8 text-sm" placeholder="+27" value={formData.mobile_number} onChange={e => handleChange('mobile_number', e.target.value)} />
                </div>
              </div>

              <div className="border-t border-border pt-2">
                <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">RESIDENTIAL ADDRESS — FICA REQUIRES A PHYSICAL ADDRESS</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">STREET ADDRESS *</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="Unit / street number and name" value={formData.street_address} onChange={e => handleChange('street_address', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SUBURB</Label>
                      <Input className="mt-1 h-8 text-sm" value={formData.suburb} onChange={e => handleChange('suburb', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">CITY</Label>
                      <Input className="mt-1 h-8 text-sm" value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PROVINCE</Label>
                      <Select value={formData.province} onValueChange={v => handleChange('province', v)}>
                        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{['Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">POSTAL CODE</Label>
                      <Input className="mt-1 h-8 text-sm" maxLength="4" value={formData.postal_code} onChange={e => handleChange('postal_code', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: FICA / KYC ── */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="border border-border rounded p-3">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">EMPLOYMENT & OCCUPATION</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">EMPLOYMENT STATUS *</Label>
                    <Select value={formData.employment_status} onValueChange={v => handleChange('employment_status', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Employed', 'Self-employed', 'Retired', 'Unemployed', 'Student'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">OCCUPATION *</Label>
                    <Input className="mt-1 h-8 text-sm" value={formData.occupation} onChange={e => handleChange('occupation', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">EMPLOYER / BUSINESS</Label>
                    <Input className="mt-1 h-8 text-sm" value={formData.employer} onChange={e => handleChange('employer', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">INDUSTRY</Label>
                    <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">SOURCE OF FUNDS</h3>
                  <span className="text-[10px] text-muted-foreground">SELECT ALL THAT APPLY</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Salary / employment income', 'Business income / dividends', 'Investment returns', 'Inheritance / gift', 'Retirement / pension fund', 'Sale of property / assets'].map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-1.5 border border-border rounded hover:bg-secondary/50 text-xs">
                      <input type="checkbox" checked={formData.source_of_funds.includes(item)} onChange={() => toggleArrayItem('source_of_funds', item)} className="w-3.5 h-3.5 accent-ocean" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">TAX & PEP DECLARATION</h3>
                  <span className="text-[10px] font-semibold text-ocean">FATCA / CRS</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SA TAX NUMBER</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="10-digit SARS reference" value={formData.sa_tax_number} onChange={e => handleChange('sa_tax_number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TAX RESIDENCY</Label>
                    <Select value={formData.tax_residency} onValueChange={v => handleChange('tax_residency', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['South Africa only', 'South Africa + Other', 'Other country only'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">US PERSON (FATCA)?</Label>
                    <Select value={formData.us_person_fatca} onValueChange={v => handleChange('us_person_fatca', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PEP STATUS</Label>
                    <Select value={formData.pep_status} onValueChange={v => handleChange('pep_status', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Related to PEP">Related to PEP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.pep_status === 'Yes' && (
                  <div className="mt-2">
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PEP DETAILS</Label>
                    <Input className="mt-1 h-8 text-sm" placeholder="Describe the public function held" value={formData.pep_explanation} onChange={e => handleChange('pep_explanation', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Financial Profile ── */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="border border-border rounded p-3">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">INCOME & ASSETS</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">GROSS ANNUAL INCOME BAND</Label>
                    <Select value={formData.gross_annual_income_band} onValueChange={v => handleChange('gross_annual_income_band', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R150,000', 'R150,000 – R350,000', 'R350,000 – R750,000', 'R750,000 – R1.5m', 'R1.5m – R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MONTHLY INVESTABLE SURPLUS</Label>
                    <Select value={formData.monthly_investable_surplus} onValueChange={v => handleChange('monthly_investable_surplus', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R2,000', 'R2,000 – R5,000', 'R5,000 – R15,000', 'R15,000 – R50,000', 'Over R50,000'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">NET WORTH BAND</Label>
                    <Select value={formData.net_worth_band} onValueChange={v => handleChange('net_worth_band', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R500,000', 'R500k – R2m', 'R2m – R5m', 'R5m – R10m', 'R10m – R20m', 'Over R20m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
                    <Select value={formData.total_liabilities} onValueChange={v => handleChange('total_liabilities', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['None', 'Under R500,000', 'R500k – R1m', 'R1m – R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">WILL IN PLACE?</Label>
                    <Select value={formData.will_in_place} onValueChange={v => handleChange('will_in_place', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="In progress">In progress</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">DEPENDANTS</Label>
                    <Select value={formData.dependants} onValueChange={v => handleChange('dependants', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['0', '1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Existing Financial Products */}
              <div className="border border-border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">EXISTING FINANCIAL PRODUCTS</h3>
                  <button type="button" onClick={addProduct} className="flex items-center gap-1 text-xs text-ocean hover:text-navy transition-colors font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add product
                  </button>
                </div>
                {productsList.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No products added. Click 'Add product' to begin.</p>
                )}
                <div className="space-y-2">
                  {productsList.map((product, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 items-end">
                      <div>
                        {idx === 0 && <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">PRODUCT TYPE</Label>}
                        <Select value={product.type} onValueChange={v => updateProduct(idx, 'type', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">PROVIDER</Label>}
                        <Input className="h-8 text-xs" placeholder="e.g. Discovery" value={product.provider} onChange={e => updateProduct(idx, 'provider', e.target.value)} />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">POLICY NO.</Label>}
                        <Input className="h-8 text-xs" placeholder="Policy number" value={product.policy_number} onChange={e => updateProduct(idx, 'policy_number', e.target.value)} />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">APPROX VALUE (R)</Label>}
                        <Input className="h-8 text-xs" placeholder="0" type="number" value={product.value} onChange={e => updateProduct(idx, 'value', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => removeProduct(idx)} className={`text-muted-foreground hover:text-danger transition-colors ${idx === 0 ? 'mt-5' : ''}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Letter of Authority */}
              <div className="border border-border rounded p-3">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">LETTER OF AUTHORITY</h3>
                {formData.loa_uploaded ? (
                  <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded mb-2">
                    <Check className="w-4 h-4 text-teal" />
                    <span className="text-xs text-teal font-medium">LOA uploaded</span>
                  </div>
                ) : (
                  <label className="block cursor-pointer mb-2">
                    <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                      <p className="text-xs font-medium text-navy">Letter of Authority document</p>
                      <p className="text-[10px] text-ocean mt-1">Click to upload</p>
                    </div>
                    <input type="file" className="hidden" onChange={() => handleChange('loa_uploaded', true)} />
                  </label>
                )}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.loa_authorised} onChange={e => handleChange('loa_authorised', e.target.checked)} className="w-3.5 h-3.5 accent-ocean mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">I authorise WealthWorks to obtain information on my existing policies from the relevant providers.</span>
                </label>
              </div>
            </div>
          )}

          {/* ── STEP 4: Risk Profile & Objectives ── */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="border border-border rounded p-3">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">RISK TOLERANCE QUESTIONNAIRE</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">IF YOUR PORTFOLIO FELL 20% IN 3 MONTHS</Label>
                    <Select value={formData.portfolio_drop_response} onValueChange={v => handleChange('portfolio_drop_response', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select your response" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sell immediately">Sell immediately — protect what's left</SelectItem>
                        <SelectItem value="Hold">Hold — wait for recovery</SelectItem>
                        <SelectItem value="Buy more">Buy more — take the opportunity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">PRIMARY INVESTMENT OBJECTIVE</Label>
                    <Select value={formData.primary_investment_objective} onValueChange={v => handleChange('primary_investment_objective', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Capital preservation', 'Income generation', 'Moderate growth', 'Aggressive growth', 'Speculation'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TIME HORIZON</Label>
                    <Select value={formData.time_horizon} onValueChange={v => handleChange('time_horizon', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">LIQUIDITY REQUIREMENT</Label>
                    <Select value={formData.liquidity_requirement} onValueChange={v => handleChange('liquidity_requirement', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Immediate access required', 'Access within 1 year', 'Access within 3 years', 'Long-term — no immediate need'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Risk Score */}
                {(formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) && (
                  <div className="mt-3 p-3 bg-ocean/5 border border-ocean/20 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-semibold tracking-wider text-ocean uppercase">CALCULATED RISK SCORE</span>
                      <span className="text-sm font-bold text-ocean">{riskScore} / 10</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2 mb-1">
                      <div className="h-2 rounded-full bg-ocean transition-all" style={{ width: `${riskScore * 10}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Based on your answers — auto-selecting <strong>{scoreToProfile(riskScore)}</strong> profile</p>
                  </div>
                )}

                {/* Risk Profile Selection */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">RISK PROFILE *</Label>
                    {profileOverridden && (
                      <button type="button" onClick={() => { setProfileOverridden(false); }} className="text-[10px] text-ocean hover:underline">Reset to calculated</button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: 'Conservative', sub: 'Capital protection.' },
                      { value: 'Cautious', sub: 'Low risk.' },
                      { value: 'Moderate', sub: 'Balanced.' },
                      { value: 'Growth', sub: 'Long-term.' },
                      { value: 'Aggressive', sub: 'Max growth.' },
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
                    <p className="text-[10px] text-warn mt-1">⚠ Profile manually overridden — calculated score suggests <strong>{scoreToProfile(riskScore)}</strong></p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">ADVISORY NEEDS</h3>
                  <span className="text-[10px] text-muted-foreground">SELECT ALL THAT APPLY</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ADVISORY_NEEDS.map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-1.5 border border-border rounded hover:bg-secondary/50 text-xs">
                      <input type="checkbox" checked={formData.advisory_needs.includes(item)} onChange={() => toggleArrayItem('advisory_needs', item)} className="w-3.5 h-3.5 accent-ocean" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Document Upload ── */}
          {currentStep === 5 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'identity_document_uploaded', title: 'IDENTITY DOCUMENT', badge: 'OPTIONAL', desc: 'SA ID / Smart Card / Passport', sub: 'Front & back clearly visible' },
                  { key: 'proof_of_address_uploaded', title: 'PROOF OF ADDRESS', badge: 'OPTIONAL', desc: 'Utility bill / bank statement', sub: 'Must show name and address' },
                  { key: 'income_proof_uploaded', title: 'INCOME / SOURCE OF FUNDS', badge: 'OPTIONAL', desc: '3 months payslips or 6 months bank statements', sub: 'Multiple files accepted' },
                  { key: 'existing_policies_uploaded', title: 'EXISTING POLICIES', badge: 'OPTIONAL', desc: 'Current policy documents or statements', sub: 'Assists with needs analysis' },
                ].map(doc => (
                  <div key={doc.key} className="border border-border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase">{doc.title}</h4>
                      <span className={`text-[10px] font-semibold ${doc.badge.includes('OPTIONAL') ? 'text-muted-foreground' : 'text-ocean'}`}>{doc.badge}</span>
                    </div>
                    {formData[doc.key] ? (
                      <div className="flex items-center gap-2 p-2 bg-teal/10 border border-teal/20 rounded">
                        <Check className="w-4 h-4 text-teal" />
                        <span className="text-xs text-teal font-medium">Uploaded</span>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-ocean/50 transition-colors">
                          <p className="text-xs font-medium text-navy">{doc.desc}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{doc.sub}</p>
                          <p className="text-[10px] text-ocean mt-2">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-secondary/50 border border-border rounded text-xs text-muted-foreground">
                <p className="font-semibold text-navy mb-0.5">Certification requirement</p>
                All copies must be certified by a Commissioner of Oaths, attorney, bank official or notary.
              </div>
            </div>
          )}

          {/* ── STEP 6: Submit ── */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-teal/10 border border-teal/20 rounded">
                <Check className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy text-sm">Your onboarding is complete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">A draft proposal has been created in the WealthWorks advisor portal. Your advisor will review your information, complete the recommendation, and send you the proposal pack for signature.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'CLIENT NAME', value: `${formData.first_name} ${formData.last_name}`.trim() || formData.entity_name },
                  { label: 'RISK PROFILE', value: formData.risk_profile || '—' },
                  { label: 'DOCUMENTS UPLOADED', value: ['identity_document_uploaded', 'proof_of_address_uploaded', 'income_proof_uploaded', 'existing_policies_uploaded'].filter(k => formData[k]).length + ' of 4' },
                  { label: 'ADVISOR', value: 'Trevor Fine' },
                ].map(stat => (
                  <div key={stat.label} className="border border-border rounded p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-sm font-bold text-ocean mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-secondary/50 border border-border rounded text-xs text-muted-foreground">
                Your advisor will contact you within one business day to discuss your proposal.
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 pt-5 border-t border-border mt-5">
            {currentStep > 1 && currentStep < 6 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSavingStep} className="px-6 h-9 text-sm">
                ← Back
              </Button>
            )}
            <div className="flex-1" />
            <span className="flex items-center text-xs text-muted-foreground">Step {currentStep} of 6</span>
            <div className="flex-1" />
            {currentStep < 5 && (
              <Button type="button" onClick={handleContinue} disabled={isSavingStep} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
                {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue →'}
              </Button>
            )}
            {currentStep === 5 && (
              <Button type="button" onClick={handleContinue} disabled={isSavingStep} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
                {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Review & submit →'}
              </Button>
            )}
            {currentStep === 6 && (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 h-9 text-sm bg-teal text-white hover:bg-teal/90">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm & done →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}