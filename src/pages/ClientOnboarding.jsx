import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check } from 'lucide-react';

const extractDOBFromID = (idNumber) => {
  if (!idNumber || idNumber.length < 6) return '';
  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  const fullYear = parseInt(yy) > 25 ? `19${yy}` : `20${yy}`;
  return `${fullYear}-${mm}-${dd}`;
};

const STEPS = [
  { number: 1, label: 'Personal details', group: 'ONBOARDING' },
  { number: 2, label: 'FICA / KYC', group: 'ONBOARDING' },
  { number: 3, label: 'Financial profile', group: 'ONBOARDING' },
  { number: 4, label: 'Risk & objectives', group: 'ONBOARDING' },
  { number: 5, label: 'Documents', group: 'ONBOARDING' },
  { number: 6, label: 'Disclosure & terms', group: 'COMPLIANCE PACK' },
  { number: 7, label: 'Record of advice', group: 'COMPLIANCE PACK' },
  { number: 8, label: 'Mandate', group: 'COMPLIANCE PACK' },
  { number: 9, label: 'Signatures', group: 'COMPLIANCE PACK' },
  { number: 10, label: 'Submit to CRM', group: 'FINAL' },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);

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
    entity_name: '',
    registration_number: '',
    trust_number: '',
    // Step 2 - FICA
    employment_status: '',
    occupation: '',
    employer: '',
    industry: '',
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
    will_in_place: '',
    // Step 4 - Risk
    portfolio_drop_response: '',
    primary_investment_objective: '',
    time_horizon: '',
    liquidity_requirement: '',
    risk_profile: '',
    advisory_needs: [],
    // Step 5 - Documents (file refs stored separately)
    identity_document_uploaded: false,
    proof_of_address_uploaded: false,
    income_proof_uploaded: false,
    existing_policies_uploaded: false,
    // Step 9 - Signatures
    client_declaration_1: false,
    client_declaration_2: false,
    client_declaration_3: false,
    client_declaration_4: false,
    client_declaration_5: false,
    client_signature_name: '',
    client_signature_date: new Date().toISOString().split('T')[0],
  });

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
            entity_name: client.entity_name || '',
            registration_number: client.registration_number || '',
            trust_number: client.trust_number || '',
            employment_status: client.employment_status || '',
            occupation: client.occupation || '',
            employer: client.employer || '',
            industry: client.industry || '',
            source_of_funds: client.source_of_funds || [],
            sa_tax_number: client.sa_tax_number || '',
            tax_residency: client.tax_residency || '',
            us_person_fatca: client.us_person_fatca || '',
            pep_status: client.pep_status || '',
            pep_explanation: client.pep_explanation || '',
            gross_annual_income_band: client.gross_annual_income_band || '',
            monthly_investable_surplus: client.monthly_investable_surplus || '',
            net_worth_band: client.net_worth_band || '',
            total_liabilities: client.total_liabilities || '',
            existing_financial_products: client.existing_financial_products || [],
            will_in_place: client.will_in_place || '',
            portfolio_drop_response: client.portfolio_drop_response || '',
            primary_investment_objective: client.primary_investment_objective || '',
            time_horizon: client.time_horizon || '',
            liquidity_requirement: client.liquidity_requirement || '',
            risk_profile: client.risk_profile || '',
            advisory_needs: client.advisory_needs || [],
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        setClientId(id);
        setIsInitializing(false);
      });
  }, [navigate]);

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
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
      };
    });
  };

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
        existing_financial_products: formData.existing_financial_products,
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
      if (!formData.identity_document_uploaded || !formData.proof_of_address_uploaded) {
        toast.error('Identity document and proof of address are required');
        return;
      }
      stepData = {
        identity_document_uploaded: formData.identity_document_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        income_proof_uploaded: formData.income_proof_uploaded,
      };
    } else {
      stepData = {};
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) { toast.error('Client record not found'); return; }

    const allDeclarations = formData.client_declaration_1 && formData.client_declaration_2 &&
      formData.client_declaration_3 && formData.client_declaration_4 && formData.client_declaration_5;
    if (!allDeclarations) {
      toast.error('Please confirm all declarations before submitting');
      return;
    }
    if (!formData.client_signature_name) {
      toast.error('Please enter your full name as signature');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1 — Mark client as onboarded
      await base44.entities.Clients.update(clientId, {
        client_status: 'Onboarded',
        onboarding_complete: true,
        client_signature_name: formData.client_signature_name,
        client_signature_date: formData.client_signature_date,
      });

      // 2 — Create a draft proposal in the advisor inbox
      await base44.entities.Proposals.create({
        client_id: clientId,
        advisor_name: 'Trevor Fine',
        reference: 'WW-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        status: 'Pending Review',
        proposal_status: 'Pending Review',
        pdf_status: 'No PDF',
        advisor_signature_completed: false,
        client_signature_completed: false,
        client_initials_completed: false,
        document_version: 1,
      });

      sessionStorage.removeItem('pending_client_id');
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

  const stepGroups = ['ONBOARDING', 'COMPLIANCE PACK', 'FINAL'];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <div className="hidden md:flex flex-col w-56 bg-card border-r border-border p-6 shrink-0">
        <div className="mb-8">
          <span className="text-navy font-bold text-lg tracking-tight">wealthworks</span>
        </div>
        {stepGroups.map(group => {
          const groupSteps = STEPS.filter(s => s.group === group);
          return (
            <div key={group} className="mb-6">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">{group}</p>
              {groupSteps.map(step => {
                const isComplete = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                return (
                  <div key={step.number} className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm mb-1 ${isCurrent ? 'text-ocean font-medium' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${isCurrent ? 'border-ocean bg-ocean text-white' : isComplete ? 'border-teal bg-teal text-white' : 'border-border'}`}>
                      {isComplete ? <Check className="w-3 h-3" /> : step.number}
                    </div>
                    {step.label}
                  </div>
                );
              })}
            </div>
          );
        })}
        {/* Document Status */}
        <div className="mt-auto">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">DOCUMENT STATUS</p>
          {[
            { label: 'Identity document', done: formData.identity_document_uploaded },
            { label: 'Proof of address', done: formData.proof_of_address_uploaded },
            { label: 'Income proof', done: formData.income_proof_uploaded },
            { label: 'Client signature', done: !!formData.client_signature_name },
            { label: 'Advisor signature', done: false },
          ].map(doc => (
            <div key={doc.label} className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${doc.done ? 'bg-teal' : 'bg-border'}`} />
              {doc.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            WEALTHWORKS.CO.ZA
          </button>
          <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF 10</span>
        </div>

        <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
          {/* Step Header */}
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-2">
              STEP {currentStep} OF 10 &nbsp;·&nbsp; {
                currentStep <= 5 ? (currentStep === 2 ? 'FICA' : currentStep === 3 ? 'FAIS — NEEDS ANALYSIS' : currentStep === 4 ? 'FAIS — ROA' : currentStep === 5 ? 'FICA' : 'FAIS') :
                'COMPLIANCE PACK'
              }
            </p>
            <h1 className="text-4xl font-bold text-navy mb-3">
              {currentStep === 1 && 'Personal information'}
              {currentStep === 2 && 'Know your client'}
              {currentStep === 3 && 'Financial profile'}
              {currentStep === 4 && 'Risk profile & objectives'}
              {currentStep === 5 && 'Document upload'}
              {currentStep === 6 && 'Disclosure, Record of Advice & Mandate'}
              {currentStep === 7 && 'Record of advice'}
              {currentStep === 8 && 'Mandate'}
              {currentStep === 9 && 'Dual digital signatures'}
              {currentStep === 10 && 'Submit to CRM'}
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              {currentStep === 1 && 'Your personal particulars as required under Section 4 of the FAIS Act. These details auto-populate the Disclosure Document, Record of Advice and Mandate.'}
              {currentStep === 2 && 'Required under the Financial Intelligence Centre Act (Act 38 of 2001) to verify identity, understand the source of funds and assess ML/TF risk.'}
              {currentStep === 3 && 'Required for the financial needs analysis under FAIS GCC Section 8. This information ensures every recommendation is appropriate and suitable for your circumstances.'}
              {currentStep === 4 && 'Your risk profile is a mandatory requirement under FAIS. It determines the suitability of every product recommended to you and forms a core part of your Record of Advice.'}
              {currentStep === 5 && 'Upload certified copies of the required documents. Stored encrypted against your client file in accordance with FICA and POPIA obligations.'}
              {currentStep === 6 && 'Pre-populated from your answers. Your advisor completes the recommendation fields. Review all three documents before signing.'}
              {currentStep === 9 && 'Both the client and a WealthWorks advisor must sign. Electronic signatures are valid under the Electronic Communications and Transactions Act (ECT Act 25 of 2002).'}
              {currentStep === 10 && 'All documents and signatures have been submitted. Your WealthWorks advisor has been notified and will be in contact within one business day.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Personal Information ── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">TITLE *</Label>
                    <Select value={formData.title} onValueChange={v => handleChange('title', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">FIRST NAME(S) *</Label>
                    <Input className="mt-1" placeholder="As per identity document" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">SURNAME *</Label>
                    <Input className="mt-1" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">SA ID NUMBER *</Label>
                    <Input className="mt-1" placeholder="13-digit ID number" maxLength="13" value={formData.sa_id_number} onChange={e => handleChange('sa_id_number', e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Or passport number if foreign national</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">DATE OF BIRTH *</Label>
                    <Input type="date" className="mt-1" placeholder="Auto-extracted from ID" value={formData.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">MARITAL STATUS *</Label>
                    <Select value={formData.marital_status} onValueChange={v => handleChange('marital_status', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['Single', 'Married in community', 'Married out of community', 'Divorced', 'Widowed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">DEPENDANTS *</Label>
                    <Select value={formData.dependants} onValueChange={v => handleChange('dependants', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['0', '1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">EMAIL ADDRESS *</Label>
                    <Input type="email" className="mt-1" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase">MOBILE NUMBER *</Label>
                    <Input type="tel" className="mt-1" placeholder="+27" value={formData.mobile_number} onChange={e => handleChange('mobile_number', e.target.value)} />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <p className="text-xs font-semibold tracking-wider text-ocean uppercase mb-4">RESIDENTIAL ADDRESS — FICA REQUIRES A PHYSICAL ADDRESS, NOT A PO BOX</p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">STREET ADDRESS *</Label>
                      <Input className="mt-1" placeholder="Unit / street number and name" value={formData.street_address} onChange={e => handleChange('street_address', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold tracking-wider text-navy uppercase">SUBURB *</Label>
                        <Input className="mt-1" value={formData.suburb} onChange={e => handleChange('suburb', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold tracking-wider text-navy uppercase">CITY *</Label>
                        <Input className="mt-1" value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold tracking-wider text-navy uppercase">PROVINCE *</Label>
                        <Select value={formData.province} onValueChange={v => handleChange('province', v)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {['Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold tracking-wider text-navy uppercase">POSTAL CODE *</Label>
                        <Input className="mt-1" maxLength="4" value={formData.postal_code} onChange={e => handleChange('postal_code', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: FICA / KYC ── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border border-border rounded p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-navy uppercase tracking-wider text-sm">EMPLOYMENT & OCCUPATION</h3>
                    <span className="text-xs font-semibold text-ocean">FICA</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">EMPLOYMENT STATUS *</Label>
                      <Select value={formData.employment_status} onValueChange={v => handleChange('employment_status', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Employed', 'Self-employed', 'Retired', 'Unemployed', 'Student'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">OCCUPATION *</Label>
                      <Input className="mt-1" value={formData.occupation} onChange={e => handleChange('occupation', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">EMPLOYER / BUSINESS *</Label>
                      <Input className="mt-1" value={formData.employer} onChange={e => handleChange('employer', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">INDUSTRY *</Label>
                      <Input className="mt-1" value={formData.industry} onChange={e => handleChange('industry', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-navy uppercase tracking-wider text-sm">SOURCE OF FUNDS</h3>
                    <span className="text-xs text-muted-foreground">SELECT ALL THAT APPLY</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Salary / employment income', 'Business income / dividends', 'Investment returns', 'Inheritance / gift', 'Retirement / pension fund', 'Sale of property / assets'].map(item => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer p-2 border border-border rounded hover:bg-secondary/50">
                        <input type="checkbox" checked={formData.source_of_funds.includes(item)} onChange={() => toggleArrayItem('source_of_funds', item)} className="w-4 h-4 accent-ocean" />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-navy uppercase tracking-wider text-sm">TAX & PEP DECLARATION</h3>
                    <span className="text-xs font-semibold text-ocean">FATCA / CRS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">SA TAX NUMBER *</Label>
                      <Input className="mt-1" placeholder="10-digit SARS reference" value={formData.sa_tax_number} onChange={e => handleChange('sa_tax_number', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">TAX RESIDENCY *</Label>
                      <Select value={formData.tax_residency} onValueChange={v => handleChange('tax_residency', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['South Africa only', 'South Africa + Other', 'Other country only'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">US PERSON (FATCA)? *</Label>
                      <Select value={formData.us_person_fatca} onValueChange={v => handleChange('us_person_fatca', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">PEP STATUS *</Label>
                      <Select value={formData.pep_status} onValueChange={v => handleChange('pep_status', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="Related to PEP">Related to PEP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.pep_status === 'Yes' && (
                    <div className="mt-4">
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">PEP DETAILS</Label>
                      <Input className="mt-1" placeholder="Describe the public function held" value={formData.pep_explanation} onChange={e => handleChange('pep_explanation', e.target.value)} />
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-ocean/5 border border-ocean/20 rounded text-sm text-muted-foreground">
                    <p className="font-semibold text-ocean mb-1">Politically exposed person (PEP)</p>
                    A PEP is an individual who holds or has held a prominent public function — including heads of state, senior politicians, government officials, executives of state-owned enterprises, or their immediate family members and known close associates.
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Financial Profile ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border border-border rounded p-6">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-sm mb-4">INCOME & SURPLUS</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">GROSS ANNUAL INCOME BAND *</Label>
                      <Select value={formData.gross_annual_income_band} onValueChange={v => handleChange('gross_annual_income_band', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Under R150,000', 'R150,000 – R350,000', 'R350,000 – R750,000', 'R750,000 – R1.5m', 'R1.5m – R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">MONTHLY INVESTABLE SURPLUS *</Label>
                      <Select value={formData.monthly_investable_surplus} onValueChange={v => handleChange('monthly_investable_surplus', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Under R2,000', 'R2,000 – R5,000', 'R5,000 – R15,000', 'R15,000 – R50,000', 'Over R50,000'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-sm mb-4">ASSETS & LIABILITIES</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">NET WORTH BAND *</Label>
                      <Select value={formData.net_worth_band} onValueChange={v => handleChange('net_worth_band', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Under R500,000', 'R500k – R2m', 'R2m – R5m', 'R5m – R10m', 'R10m – R20m', 'Over R20m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
                      <Select value={formData.total_liabilities} onValueChange={v => handleChange('total_liabilities', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['None', 'Under R500,000', 'R500k – R1m', 'R1m – R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-navy uppercase tracking-wider text-sm">EXISTING FINANCIAL PRODUCTS</h3>
                    <span className="text-xs text-muted-foreground">SELECT ALL THAT APPLY</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Life / risk insurance', 'Retirement annuity', 'Pension / provident fund', 'Preservation fund', 'Unit trusts / CIS', 'Tax-free savings account', 'Living / guaranteed annuity', 'Offshore investment', 'Medical aid'].map(item => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded hover:bg-secondary/50 text-sm">
                        <input type="checkbox" checked={formData.existing_financial_products.includes(item)} onChange={() => toggleArrayItem('existing_financial_products', item)} className="w-4 h-4 accent-ocean shrink-0" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-sm mb-4">ESTATE</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">WILL IN PLACE?</Label>
                      <Select value={formData.will_in_place} onValueChange={v => handleChange('will_in_place', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="In progress">In progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">NUMBER OF DEPENDANTS *</Label>
                      <Select value={formData.dependants} onValueChange={v => handleChange('dependants', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['0', '1', '2', '3', '4', '5+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Risk Profile & Objectives ── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border border-border rounded p-6">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-sm mb-4">RISK TOLERANCE</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">IF YOUR PORTFOLIO FELL 20% IN 3 MONTHS *</Label>
                      <Select value={formData.portfolio_drop_response} onValueChange={v => handleChange('portfolio_drop_response', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select your response" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sell immediately">Sell immediately — protect what's left</SelectItem>
                          <SelectItem value="Hold">Hold — wait for recovery</SelectItem>
                          <SelectItem value="Buy more">Buy more — take the opportunity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">PRIMARY INVESTMENT OBJECTIVE *</Label>
                      <Select value={formData.primary_investment_objective} onValueChange={v => handleChange('primary_investment_objective', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Capital preservation', 'Income generation', 'Moderate growth', 'Aggressive growth', 'Speculation'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">TIME HORIZON *</Label>
                      <Select value={formData.time_horizon} onValueChange={v => handleChange('time_horizon', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">LIQUIDITY REQUIREMENT *</Label>
                      <Select value={formData.liquidity_requirement} onValueChange={v => handleChange('liquidity_requirement', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Immediate access required', 'Access within 1 year', 'Access within 3 years', 'Long-term — no immediate need'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Label className="text-xs font-semibold tracking-wider text-navy uppercase block mb-4">SELF-ASSESSED RISK PROFILE *</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { value: 'Conservative', sub: 'Capital protection. Minimal volatility.' },
                        { value: 'Cautious', sub: 'Low risk. Consistent returns.' },
                        { value: 'Moderate', sub: 'Balanced income and growth.' },
                        { value: 'Growth', sub: 'Long-term. Accepts volatility.' },
                        { value: 'Aggressive', sub: 'Maximum growth. High risk.' },
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => handleChange('risk_profile', opt.value)}
                          className={`p-3 border rounded text-left transition-all ${formData.risk_profile === opt.value ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
                          <p className={`text-sm font-semibold ${formData.risk_profile === opt.value ? 'text-ocean' : 'text-navy'}`}>{opt.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{opt.sub}</p>
                          {formData.risk_profile === opt.value && <div className="h-0.5 bg-ocean mt-2 rounded" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-navy uppercase tracking-wider text-sm">ADVISORY NEEDS</h3>
                    <span className="text-xs text-muted-foreground">SELECT ALL THAT APPLY</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Investment planning', 'Retirement planning', 'Life & risk cover', 'Estate planning', 'Tax planning', 'Offshore investments', 'Business assurance', 'Education planning'].map(item => (
                      <label key={item} className="flex items-center gap-3 cursor-pointer p-2 border border-border rounded hover:bg-secondary/50 text-sm">
                        <input type="checkbox" checked={formData.advisory_needs.includes(item)} onChange={() => toggleArrayItem('advisory_needs', item)} className="w-4 h-4 accent-ocean" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: Document Upload ── */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'identity_document_uploaded', title: 'IDENTITY DOCUMENT', badge: 'REQUIRED', desc: 'SA ID / Smart Card / Passport', sub: 'Front & back clearly visible' },
                    { key: 'proof_of_address_uploaded', title: 'PROOF OF ADDRESS', badge: 'REQUIRED · MAX 3 MONTHS', desc: 'Utility bill / bank statement', sub: 'Must show your name and address' },
                    { key: 'income_proof_uploaded', title: 'INCOME / SOURCE OF FUNDS', badge: 'REQUIRED', desc: '3 months payslips or 6 months bank statements', sub: 'Multiple files accepted' },
                    { key: 'existing_policies_uploaded', title: 'EXISTING POLICIES', badge: 'OPTIONAL', desc: 'Current policy documents or statements', sub: 'Assists with needs analysis' },
                  ].map(doc => (
                    <div key={doc.key} className="border border-border rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xs font-bold tracking-wider text-navy uppercase">{doc.title}</h4>
                        <span className={`text-[10px] font-semibold ${doc.badge.includes('OPTIONAL') ? 'text-muted-foreground' : 'text-ocean'}`}>{doc.badge}</span>
                      </div>
                      {formData[doc.key] ? (
                        <div className="flex items-center gap-2 p-3 bg-teal/10 border border-teal/20 rounded">
                          <Check className="w-4 h-4 text-teal" />
                          <span className="text-sm text-teal font-medium">Uploaded</span>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded p-6 text-center hover:border-ocean/50 transition-colors">
                            <p className="text-sm font-medium text-navy">{doc.desc}</p>
                            <p className="text-xs text-muted-foreground mt-1">{doc.sub}</p>
                            <p className="text-xs text-ocean mt-3">Click to upload</p>
                          </div>
                          <input type="file" className="hidden" onChange={() => handleChange(doc.key, true)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-secondary/50 border border-border rounded text-sm text-muted-foreground">
                  <p className="font-semibold text-navy mb-1">Certification requirement</p>
                  All copies must be certified by a Commissioner of Oaths, attorney, bank official or notary. WealthWorks reserves the right to request original documents at any time in accordance with FICA obligations.
                </div>
              </div>
            )}

            {/* ── STEPS 6–8: Compliance Pack ── */}
            {(currentStep === 6 || currentStep === 7 || currentStep === 8) && (
              <div className="space-y-6">
                <div className="flex gap-4 border-b border-border pb-4">
                  {[{n:6,l:'6 · DISCLOSURE & TERMS'},{n:7,l:'7 · RECORD OF ADVICE'},{n:8,l:'8 · MANDATE'}].map(tab => (
                    <button key={tab.n} type="button" onClick={() => setCurrentStep(tab.n)}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors ${currentStep === tab.n ? 'border-ocean text-ocean' : 'border-transparent text-muted-foreground hover:text-navy'}`}>
                      {tab.l}
                    </button>
                  ))}
                </div>
                <div className="p-4 bg-secondary/50 border border-border rounded text-sm text-muted-foreground">
                  Fields in blue were drawn from your onboarding answers. Fields in grey require completion by your WealthWorks advisor before the pack is signed.
                </div>
                <div className="border border-border rounded p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-navy">wealthworks</span>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Wealth Works (Pty) Ltd · FSP 28337 (Cat I)</p>
                      <p>Wealthworks Investments · FSP 49624 (Cat II)</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold tracking-wider text-ocean uppercase mb-1">CLIENT DETAILS</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {[
                        { label: 'CLIENT NAME', value: `${formData.title} ${formData.first_name} ${formData.last_name}`, color: true },
                        { label: 'ID NUMBER', value: formData.sa_id_number, color: true },
                        { label: 'EMAIL ADDRESS', value: formData.email, color: true },
                        { label: 'FICA RISK', value: formData.pep_status === 'Yes' ? 'High' : 'Low', color: true },
                        { label: 'PEP STATUS', value: formData.pep_status || 'No', color: true },
                        { label: 'RESIDENTIAL ADDRESS', value: formData.street_address ? `${formData.street_address}, ${formData.suburb}` : '—', color: true },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                          <p className={`text-sm font-medium mt-0.5 ${f.color ? 'text-ocean' : 'text-muted-foreground italic'}`}>{f.value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {currentStep === 6 && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-semibold tracking-wider text-ocean uppercase mb-3">RECORD OF ADVICE — RISK PROFILING OUTCOME</p>
                      <div className="space-y-2">
                        {[
                          { label: 'RISK PROFILE', value: formData.risk_profile?.toUpperCase(), color: true },
                          { label: 'TIME HORIZON', value: formData.time_horizon, color: true },
                          { label: 'RECOMMENDED PRODUCT', value: null, placeholder: 'Advisor to complete' },
                          { label: 'SUITABILITY RATIONALE', value: null, placeholder: 'Advisor to complete' },
                        ].map(f => (
                          <div key={f.label} className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</span>
                            <span className={`text-sm ${f.color ? 'text-ocean font-medium' : 'text-muted-foreground italic text-xs'}`}>{f.value || f.placeholder}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 9: Signatures ── */}
            {currentStep === 9 && (
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-ocean/30 rounded p-6">
                  <p className="text-xs font-semibold tracking-wider text-ocean uppercase mb-1">CLIENT</p>
                  <h3 className="text-lg font-bold text-navy mb-4">Client declaration</h3>
                  <div className="space-y-3">
                    {[
                      'I have provided complete and accurate information. My financial situation, needs and objectives have been correctly recorded.',
                      'The advice and risks have been explained to me in a manner I understand. I have had the opportunity to ask questions.',
                      'I understand the nature, risks, costs and implications of the recommended product or strategy.',
                      'I consent to my personal information being processed in accordance with POPIA.',
                      'I understand WealthWorks must report suspicious transactions to the FIC under FICA.',
                    ].map((text, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData[`client_declaration_${i+1}`]} onChange={e => handleChange(`client_declaration_${i+1}`, e.target.checked)} className="w-4 h-4 accent-ocean mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{text}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">FULL NAME</Label>
                      <Input className="mt-1" placeholder={`${formData.first_name} ${formData.last_name}`} value={formData.client_signature_name} onChange={e => handleChange('client_signature_name', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">DATE</Label>
                      <Input type="date" className="mt-1" value={formData.client_signature_date} readOnly />
                    </div>
                  </div>
                  {formData.client_signature_name && (
                    <div className="mt-4 p-4 border border-ocean/20 rounded bg-ocean/5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">CLIENT SIGNATURE</p>
                      <p className="text-3xl font-serif text-ocean italic">{formData.client_signature_name}</p>
                      <p className="text-[10px] text-teal mt-2">✓ CLIENT SIGNATURE CAPTURED</p>
                    </div>
                  )}
                </div>

                <div className="border border-border rounded p-6 opacity-70">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">ADVISOR — WEALTHWORKS</p>
                  <h3 className="text-lg font-bold text-navy mb-4">Advisor declaration</h3>
                  <div className="space-y-3">
                    {[
                      'The advice is appropriate and suitable based on the client\'s stated needs, objectives and financial situation.',
                      'A financial needs analysis has been conducted, or limited advice was provided at the client\'s specific request.',
                      'All material risks, costs, limitations and implications of the recommendation have been explained.',
                      'The recommendation is in the client\'s best interest and aligned to their risk profile.',
                      'All required disclosures under FAIS have been made and FICA obligations fulfilled.',
                    ].map((text, i) => (
                      <label key={i} className="flex items-start gap-3">
                        <input type="checkbox" disabled className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{text}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">ADVISOR NAME</Label>
                      <Input className="mt-1" value="Trevor Fine" readOnly />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold tracking-wider text-navy uppercase">DATE</Label>
                      <Input type="date" className="mt-1" value={formData.client_signature_date} readOnly />
                    </div>
                  </div>
                  <div className="mt-4 p-4 border border-border rounded bg-secondary/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">ADVISOR SIGNATURE — DRAW</p>
                    <p className="text-sm text-muted-foreground italic">Advisor signs after client submission</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 10: Complete ── */}
            {currentStep === 10 && (
              <div className="space-y-6 text-center">
                <div className="flex items-center gap-4 p-4 bg-teal/10 border border-teal/20 rounded">
                  <Check className="w-6 h-6 text-teal shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-navy">COMPLIANCE PACK STORED TO CRM</p>
                    <p className="text-sm text-muted-foreground">All documents and signatures have been submitted. Your WealthWorks advisor has been notified and will be in contact within one business day.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'CASE REFERENCE', value: `WW-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}` },
                    { label: 'DOCUMENTS STORED', value: Object.keys(formData).filter(k => k.includes('_uploaded') && formData[k]).length + 3 },
                    { label: 'SIGNATURES', value: formData.client_signature_name ? '1/2' : '0/2' },
                    { label: 'PACK STATUS', value: 'Complete' },
                  ].map(stat => (
                    <div key={stat.label} className="border border-border rounded p-4 text-left">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <p className="text-xl font-bold text-ocean mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            <div className="flex gap-3 pt-8 border-t border-border mt-8">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={isSavingStep} className="px-8">
                  ← Back
                </Button>
              )}
              <div className="flex-1" />
              <span className="flex items-center text-sm text-muted-foreground">Step {currentStep} of 10</span>
              <div className="flex-1" />
              {currentStep < 9 && (
                <Button type="button" onClick={handleContinue} disabled={isSavingStep} className="px-8 bg-navy text-white hover:bg-ocean">
                  {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue →'}
                </Button>
              )}
              {currentStep === 9 && (
                <Button type="submit" disabled={isSubmitting} className="px-8 bg-navy text-white hover:bg-ocean">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm signatures & finalise →'}
                </Button>
              )}
              {currentStep === 10 && (
                <Button type="button" onClick={() => navigate('/client-dashboard')} className="px-8 bg-teal text-white hover:bg-teal/90">
                  Go to my profile →
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}