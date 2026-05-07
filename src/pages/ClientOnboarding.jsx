import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerField from '@/components/ui/date-picker-field';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { uploadOnboardingDocument } from '@/lib/onboardingDocuments';
import { buildRmcpUpdate, calculateRmcpScore as calculateWeightedRmcpScore } from '@/lib/rmcpRiskScoring';
import { ADVISORS } from '@/lib/constants';
import { createOnboardingComplianceEntries } from '@/lib/complianceEngine';

const ADVISOR_NOTIFICATION_EMAIL = ADVISORS.trevor.email;

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
  { number: 2, label: 'Document upload' },
  { number: 3, label: 'KYC declaration' },
  { number: 4, label: 'FICA verification' },
  { number: 5, label: 'Income & assets' },
  { number: 6, label: 'Existing products' },
  { number: 7, label: 'Risk & objectives' },
  { number: 8, label: 'Review & submit' },
];

const calcRiskScore = (formData) => {
  let score = 0;
  const dropMap = { 'Sell immediately': 0, 'Hold': 1.5, 'Buy more': 3 };
  score += dropMap[formData.portfolio_drop_response] || 0;
  const horizonMap = { 'Less than 1 year': 0, '1-3 years': 0.75, '3-5 years': 1.5, '5-10 years': 2.25, '10+ years': 3 };
  score += horizonMap[formData.time_horizon] || 0;
  const liquidMap = { 'Immediate access required': 0, 'Access within 1 year': 0.67, 'Access within 3 years': 1.33, 'Long-term - no immediate need': 2 };
  score += liquidMap[formData.liquidity_requirement] || 0;
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

const normalizeRangeValue = (value) => (
  typeof value === 'string'
    ? value.replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“|Ã¢â‚¬â€œ|-/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim()
    : value
);

const calculateRmcpRiskScore = (formData, homeAffairsVerified, amlMatch, docAuthPassed, faceMatchPassed) => {
  const breakdown = {
    client_factor: 0,
    geography_factor: 0,
    product_factor: 0,
    transaction_factor: 0,
    behaviour_factor: 0,
  };
  if (formData.pep_status === 'Yes') breakdown.client_factor = 30;
  else if (formData.pep_status === 'Related to PEP') breakdown.client_factor = 20;
  else if (amlMatch) breakdown.client_factor = 25;
  else if (formData.us_person_fatca === 'Yes') breakdown.client_factor = 10;
  else breakdown.client_factor = 0;

  if (formData.advisory_needs?.includes('Local and offshore investments') || formData.advisory_needs?.includes('Offshore investment')) {
    breakdown.geography_factor = 25;
  } else if (formData.tax_residency === 'Other country only') {
    breakdown.geography_factor = 20;
  } else if (formData.tax_residency === 'South Africa + Other') {
    breakdown.geography_factor = 10;
  } else {
    breakdown.geography_factor = 0;
  }

  if (formData.advisory_needs?.includes('Tax planning')) {
    breakdown.product_factor = 20;
  } else if (formData.advisory_needs?.includes('Estate planning')) {
    breakdown.product_factor = 10;
  } else if (formData.advisory_needs?.includes('Local and offshore investments')) {
    breakdown.product_factor = 15;
  } else {
    breakdown.product_factor = 5;
  }

  if (formData.monthly_investable_surplus === 'Over R50,000') {
    breakdown.transaction_factor = 15;
  } else if (formData.monthly_investable_surplus === 'R15,000 - R50,000') {
    breakdown.transaction_factor = 10;
  } else if (formData.monthly_investable_surplus === 'R5,000 - R15,000') {
    breakdown.transaction_factor = 5;
  } else {
    breakdown.transaction_factor = 0;
  }

  if (!homeAffairsVerified) breakdown.behaviour_factor = 10;
  else if (!docAuthPassed) breakdown.behaviour_factor = 5;
  else if (!faceMatchPassed) breakdown.behaviour_factor = 3;
  else breakdown.behaviour_factor = 0;

  const totalScore = breakdown.client_factor + breakdown.geography_factor + breakdown.product_factor + breakdown.transaction_factor + breakdown.behaviour_factor;
  let rmcpBand = 'Low';
  if (totalScore >= 81) rmcpBand = 'Prohibited';
  else if (totalScore >= 61) rmcpBand = 'High';
  else if (totalScore >= 31) rmcpBand = 'Medium';
  else rmcpBand = 'Low';

  return { totalScore, rmcpBand, breakdown };
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [profileOverridden, setProfileOverridden] = useState(false);
  const [profileInitialised, setProfileInitialised] = useState(false);
  const [ficaResult, setFicaResult] = useState(null);
  const [ficaChecks, setFicaChecks] = useState({});
  const [ficaRunning, setFicaRunning] = useState(false);
  const [selfieBase64, setSelfieBase64] = useState(null);
  const [productsList, setProductsList] = useState([]);

  const [formData, setFormData] = useState({
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
    employment_status: '',
    occupation: '',
    employer: '',
    source_of_funds: [],
    sa_tax_number: '',
    tax_residency: '',
    us_person_fatca: 'No',
    pep_status: 'No',
    pep_explanation: '',
    gross_annual_income_band: '',
    monthly_investable_surplus: '',
    net_worth_band: '',
    total_liabilities: '',
    existing_financial_products: [],
    loa_uploaded: false,
    loa_authorised: false,
    will_in_place: '',
    portfolio_drop_response: '',
    primary_investment_objective: '',
    time_horizon: '',
    liquidity_requirement: '',
    risk_profile: '',
    advisory_needs: [],
    identity_document_uploaded: false,
    proof_of_address_uploaded: false,
    income_proof_uploaded: false,
    existing_policies_uploaded: false,
    doc_identity: '',
    doc_identity_name: '',
    doc_identity_back: '',
    doc_identity_back_name: '',
    doc_proof_of_address: '',
    doc_proof_of_address_name: '',
    doc_source_of_funds: '',
    doc_source_of_funds_name: '',
    doc_existing_policies: '',
    doc_existing_policies_name: '',
    banking_proof_uploaded: false,
    doc_banking_proof: '',
    doc_banking_proof_name: '',
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
    const entityType = sessionStorage.getItem('pending_entity_type');
    if (entityType === 'Trust') {
      navigate('/client-onboarding-trust', { replace: true });
      return;
    }
    if (entityType === 'Company') {
      navigate('/client-onboarding-company', { replace: true });
      return;
    }
    base44.entities.Clients.list()
      .then(clients => {
        const client = clients.find(c => c.id === id);
        if (client) {
          setFormData(prev => ({
            ...prev,
            ...(client.client_type        ? { client_type: client.client_type }               : {}),
            ...(client.identity_type      ? { identity_type: client.identity_type }           : {}),
            ...(client.title              ? { title: client.title }                           : {}),
            ...(client.first_name         ? { first_name: client.first_name }                 : {}),
            ...(client.last_name          ? { last_name: client.last_name }                   : {}),
            ...(client.sa_id_number       ? { sa_id_number: client.sa_id_number }             : {}),
            ...(client.passport_number    ? { passport_number: client.passport_number }       : {}),
            ...(client.passport_country   ? { passport_country: client.passport_country }     : {}),
            ...(client.date_of_birth      ? { date_of_birth: client.date_of_birth }           : {}),
            ...(client.marital_status     ? { marital_status: client.marital_status }         : {}),
            ...(client.dependants         ? { dependants: client.dependants }                 : {}),
            ...(client.email              ? { email: client.email }                           : {}),
            ...(client.mobile_number      ? { mobile_number: client.mobile_number }           : {}),
            ...(client.street_address     ? { street_address: client.street_address }         : {}),
            ...(client.suburb             ? { suburb: client.suburb }                         : {}),
            ...(client.city               ? { city: client.city }                             : {}),
            ...(client.province           ? { province: client.province }                     : {}),
            ...(client.postal_code        ? { postal_code: client.postal_code }               : {}),
            ...(client.industry           ? { industry: client.industry }                     : {}),
            ...(client.employment_status  ? { employment_status: client.employment_status }   : {}),
            ...(client.occupation         ? { occupation: client.occupation }                 : {}),
            ...(client.employer           ? { employer: client.employer }                     : {}),
            ...(client.source_of_funds?.length > 0 ? { source_of_funds: client.source_of_funds } : {}),
            ...(client.sa_tax_number      ? { sa_tax_number: client.sa_tax_number }           : {}),
            ...(client.tax_residency      ? { tax_residency: client.tax_residency }           : {}),
            ...(client.us_person_fatca    ? { us_person_fatca: client.us_person_fatca }       : {}),
            ...(client.pep_status         ? { pep_status: client.pep_status }                 : {}),
            ...(client.pep_explanation    ? { pep_explanation: client.pep_explanation }       : {}),
            ...(client.gross_annual_income_band     ? { gross_annual_income_band: normalizeRangeValue(client.gross_annual_income_band) }         : {}),
            ...(client.monthly_investable_surplus   ? { monthly_investable_surplus: normalizeRangeValue(client.monthly_investable_surplus) }     : {}),
            ...(client.net_worth_band               ? { net_worth_band: normalizeRangeValue(client.net_worth_band) }                             : {}),
            ...(client.total_liabilities            ? { total_liabilities: normalizeRangeValue(client.total_liabilities) }                       : {}),
            ...(client.will_in_place                ? { will_in_place: client.will_in_place }                               : {}),
            ...(client.portfolio_drop_response      ? { portfolio_drop_response: client.portfolio_drop_response }           : {}),
            ...(client.primary_investment_objective ? { primary_investment_objective: client.primary_investment_objective } : {}),
            ...(client.time_horizon                 ? { time_horizon: normalizeRangeValue(client.time_horizon) }                                 : {}),
            ...(client.liquidity_requirement        ? { liquidity_requirement: normalizeRangeValue(client.liquidity_requirement) }               : {}),
            ...(client.risk_profile                 ? { risk_profile: client.risk_profile }                                 : {}),
            ...(client.advisory_needs?.length > 0   ? { advisory_needs: client.advisory_needs }                             : {}),
            loa_uploaded:                    client.loa_uploaded                    || prev.loa_uploaded,
            loa_authorised:                  client.loa_authorised                  || prev.loa_authorised,
            identity_document_uploaded:      client.identity_document_uploaded      || !!client.doc_identity || prev.identity_document_uploaded,
            proof_of_address_uploaded:       client.proof_of_address_uploaded       || !!client.doc_proof_of_address || prev.proof_of_address_uploaded,
            income_proof_uploaded:           client.income_proof_uploaded           || !!client.doc_source_of_funds || prev.income_proof_uploaded,
            existing_policies_uploaded:      client.existing_policies_uploaded      || !!client.doc_existing_policies || prev.existing_policies_uploaded,
            doc_identity:                    client.doc_identity                    || prev.doc_identity,
            doc_identity_name:               client.doc_identity_name               || prev.doc_identity_name,
            doc_identity_back:               client.doc_identity_back               || prev.doc_identity_back,
            doc_identity_back_name:          client.doc_identity_back_name          || prev.doc_identity_back_name,
            doc_proof_of_address:            client.doc_proof_of_address            || prev.doc_proof_of_address,
            doc_proof_of_address_name:       client.doc_proof_of_address_name       || prev.doc_proof_of_address_name,
            doc_source_of_funds:             client.doc_source_of_funds             || prev.doc_source_of_funds,
            doc_source_of_funds_name:        client.doc_source_of_funds_name        || prev.doc_source_of_funds_name,
            doc_existing_policies:           client.doc_existing_policies           || prev.doc_existing_policies,
            doc_existing_policies_name:      client.doc_existing_policies_name      || prev.doc_existing_policies_name,
            banking_proof_uploaded:          client.banking_proof_uploaded          || !!client.doc_banking_proof || prev.banking_proof_uploaded,
            doc_banking_proof:               client.doc_banking_proof               || prev.doc_banking_proof,
            doc_banking_proof_name:          client.doc_banking_proof_name          || prev.doc_banking_proof_name,
            client_signature_name:           client.client_signature_name           || prev.client_signature_name,
            client_signature_date:           client.client_signature_date           || prev.client_signature_date,
          }));
          if (client.risk_profile_overridden) setProfileOverridden(true);
          if (Array.isArray(client.products_list) && client.products_list.length > 0) setProductsList(client.products_list);
        }
      })
      .catch(() => {})
      .finally(() => {
        setClientId(id);
        setIsInitializing(false);
        setProfileInitialised(true);
      });
  }, [navigate]);

  useEffect(() => {
    if (!profileInitialised) return;
    if (profileOverridden) return;
    const score = calcRiskScore(formData);
    if (formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) {
      const suggested = scoreToProfile(score);
      setFormData(prev => {
        if (prev.risk_profile === suggested) return prev;
        return { ...prev, risk_profile: suggested };
      });
    }
  }, [profileInitialised, profileOverridden, formData.portfolio_drop_response, formData.time_horizon, formData.liquidity_requirement, formData.primary_investment_objective]);

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

  const handleDocumentUpload = async (fieldKey, file) => {
    if (!file) return;
    setUploadingDocs(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const { updateData } = await uploadOnboardingDocument({ clientId, fieldKey, file });
      setFormData(prev => {
        const next = { ...prev, ...updateData };
        if (fieldKey === 'identity_document_front_uploaded' || fieldKey === 'identity_document_back_uploaded') {
          next.identity_document_uploaded = !!(next.identity_document_front_uploaded && next.identity_document_back_uploaded);
        }
        return next;
      });
      toast.success('Document uploaded and sent to advisor portal');
    } catch (error) {
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const uploadedFileName = (fieldKey) => {
    const map = {
      identity_document_uploaded: 'doc_identity',
      identity_document_front_uploaded: 'doc_identity',
      identity_document_back_uploaded: 'doc_identity_back',
      proof_of_address_uploaded: 'doc_proof_of_address',
      income_proof_uploaded: 'doc_source_of_funds',
      existing_policies_uploaded: 'doc_existing_policies',
      banking_proof_uploaded: 'doc_banking_proof',
    };
    const repoField = map[fieldKey];
    // Prefer the explicit field name stored during upload, then the repo field name
    return (
      formData[`${fieldKey}_name`] ||
      (repoField ? formData[`${repoField}_name`] : '') ||
      ''
    );
  };

  const addProduct = () => setProductsList(prev => [...prev, { type: '', provider: '', policy_number: '', value: '' }]);
  const removeProduct = (idx) => setProductsList(prev => prev.filter((_, i) => i !== idx));
  const updateProduct = (idx, field, value) => setProductsList(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const saveStep = async (stepData) => {
    if (!clientId) { toast.error('Client record not found'); return false; }
    setIsSavingStep(true);
    try {
      await base44.entities.Clients.update(clientId, stepData);
      toast.success(`Step ${currentStep} saved successfully`);
      return true;
    } catch (error) {
      toast.error('Save failed: ' + (error.message || 'Unknown error'));
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const calculateRmcpScore = (formData, ficaChecks, amlMatch) => {
    let clientScore = 0;
    if (formData.pep_status === 'Yes') clientScore = 30;
    else if (formData.pep_status === 'Related to PEP') clientScore = 20;
    else if (amlMatch) clientScore = 25;
    else if (formData.us_person_fatca === 'Yes') clientScore = 10;

    let geoScore = 0;
    const advisoryNeeds = formData.advisory_needs || [];
    if (advisoryNeeds.includes('Local and offshore investments')) geoScore = 25;
    else if (formData.tax_residency === 'Other country only') geoScore = 20;
    else if (formData.tax_residency === 'South Africa + Other') geoScore = 10;

    let productScore = 0;
    if (advisoryNeeds.includes('Tax planning')) productScore = Math.max(productScore, 20);
    if (advisoryNeeds.includes('Local and offshore investments')) productScore = Math.max(productScore, 15);
    if (advisoryNeeds.includes('Estate planning')) productScore = Math.max(productScore, 10);
    if (productScore === 0) productScore = 5;

    let txScore = 0;
    const surplus = formData.monthly_investable_surplus || '';
    if (surplus === 'Over R50,000') txScore = 15;
    else if (surplus === 'R15,000 - R50,000') txScore = 10;
    else if (surplus === 'R5,000 - R15,000') txScore = 5;

    let behavScore = 0;
    if (ficaChecks?.home_affairs_id?.status !== 'pass') behavScore += 10;
    else if (ficaChecks?.document_auth?.status === 'fail') behavScore += 5;
    else if (ficaChecks?.face_match?.status === 'skipped') behavScore += 3;
    behavScore = Math.min(behavScore, 10);

    const totalScore = clientScore + geoScore + productScore + txScore + behavScore;
    let band = 'Low';
    if (totalScore >= 81) band = 'Prohibited';
    else if (totalScore >= 61) band = 'High';
    else if (totalScore >= 31) band = 'Medium';

    return {
      score: totalScore,
      band,
      breakdown: {
        client_factor: clientScore,
        geography_factor: geoScore,
        product_factor: productScore,
        transaction_factor: txScore,
        behaviour_factor: behavScore,
      },
      scoredAt: new Date().toISOString(),
    };
  };

  const runFicaVerification = async () => {
    if (!formData.sa_id_number && !formData.passport_number) { toast.error('SA ID number or passport required'); return; }
    if (!formData.employment_status || !formData.occupation) { toast.error('Please complete employment details first'); return; }
    if (!formData.source_of_funds || formData.source_of_funds.length === 0) { toast.error('Please select at least one source of funds'); return; }
    setFicaRunning(true);
    setFicaResult(null);
    let faceResult = null;
    setFicaChecks({
      home_affairs_id: { status: 'pending', label: 'Home Affairs ID' },
      aml_pep_screen:  { status: 'pending', label: 'AML / PEP screen' },
      consumer_trace:  { status: 'pending', label: 'Address verification' },
      document_auth:   { status: 'pending', label: 'Document authentication' },
      face_match:      { status: 'pending', label: 'Liveness & face match' },
      avs_bank:        { status: 'pending', label: 'Bank account (AVS)' },
      risk_score:      { status: 'pending', label: 'Risk classification' },
    });
    try {
      setFicaChecks(prev => ({ ...prev, home_affairs_id: { ...prev.home_affairs_id, status: 'running' } }));
      const idResult = await base44.functions.invoke('ficaVerify', { action: 'verifyId', payload: { id_number: formData.sa_id_number, first_name: formData.first_name, last_name: formData.last_name, date_of_birth: formData.date_of_birth } });
      const idPass = idResult?.data?.results?.said_verification?.Status === 'Success';
      setFicaChecks(prev => ({ ...prev, home_affairs_id: { ...prev.home_affairs_id, status: idPass ? 'pass' : 'fail' } }));
      if (!idPass) {
        const ref = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
        const rmcpResult = calculateWeightedRmcpScore({
          formData,
          clientType: 'individual',
          amlMatch: false,
          idVerified: false,
          documentIssue: false,
          faceMatchPassed: false,
          addressVerified: false,
        });
        const result = { fica_status: 'Referred', risk_band: 'High', fica_reference: ref, verified_at: new Date().toISOString(), failure_reason: 'Home Affairs ID verification failed' };
        setFicaResult(result);
        await base44.entities.Clients.update(clientId, {
          fica_status: 'Referred',
          verification_status: 'Manual Review',
          advisor_review_required: true,
          fica_reference: ref,
          fica_risk_band: rmcpResult.band,
          fica_verified_at: result.verified_at,
          home_affairs_verified: false,
          aml_pep_clear: false,
          fica_failure_reason: result.failure_reason,
          fica_checks_json: JSON.stringify({
            home_affairs_id: { status: 'fail', label: 'Home Affairs ID', reason: result.failure_reason },
          }),
          ...buildRmcpUpdate(rmcpResult),
        });
        setFicaRunning(false);
        toast.info('Verification submitted. Your advisor will review anything that needs attention.');
        return;
      }
      setFicaChecks(prev => ({ ...prev, aml_pep_screen: { ...prev.aml_pep_screen, status: 'running' } }));
      const amlResult = await base44.functions.invoke('ficaVerify', {
        action: 'screenAml',
        payload: { name: formData.first_name + ' ' + formData.last_name, entity: 0, country: 'za', dataset: 'all' },
      });
      const amlMatch = amlResult?.data?.data?.totalHits > 0 || amlResult?.data?.data?.results?.length > 0 || false;
      setFicaChecks(prev => ({ ...prev, aml_pep_screen: { ...prev.aml_pep_screen, status: amlMatch ? 'flag' : 'pass', note: amlMatch ? 'PEP/sanctions match - EDD required' : '' } }));

      setFicaChecks(prev => ({ ...prev, consumer_trace: { ...prev.consumer_trace, status: 'running' } }));
      const traceResult = await base44.functions.invoke('ficaVerify', {
        action: 'consumerTrace',
        payload: {
          id_number: formData.sa_id_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          street_address: formData.street_address,
          suburb: formData.suburb,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postal_code,
        },
      });
      const addressVerified = traceResult?.data?.data?.results?.consumer_trace?.Status === 'Success';
      setFicaChecks(prev => ({ ...prev, consumer_trace: { ...prev.consumer_trace, status: addressVerified ? 'pass' : 'flag', note: addressVerified ? 'Address confirmed' : 'Address could not be verified' } }));

      setFicaChecks(prev => ({ ...prev, document_auth: { ...prev.document_auth, status: 'running' } }));
      const docResult = formData.doc_identity
        ? await base44.functions.invoke('ficaVerify', {
            action: 'authenticateDoc',
            payload: {
              id_number: formData.sa_id_number,
              document_url: formData.doc_identity,
              back_document_url: formData.doc_identity_back,
              document_type: formData.identity_type === 'SA ID' ? 'sa_id' : 'passport',
              reference: 'ww-' + clientId + '-' + Date.now(),
            },
          })
        : { data: null, error: 'No uploaded ID document available for OCR' };
      const docVerification = docResult?.data?.data?.results?.document_verification || docResult?.data?.data?.results?.id_verification || {};
      const docStatus = docVerification.Status || docVerification.status || docResult?.data?.data?.Status || docResult?.data?.data?.status;
      const docReason = docVerification.Reason || docVerification.reason || '';
      const docIsForgery = ['Failed', 'Rejected', 'Declined'].includes(docStatus) && /Forgery|Tampered|Fraud/i.test(docReason);
      setFicaChecks(prev => ({ ...prev, document_auth: { ...prev.document_auth, status: docIsForgery ? 'fail' : 'skipped', note: docIsForgery ? 'Document authentication failed' : 'Document auth pending - manual review' } }));
      const docAuthenticated = ['Success', 'Approved'].includes(docStatus);
      if (docAuthenticated) {
        setFicaChecks(prev => ({ ...prev, document_auth: { ...prev.document_auth, status: 'pass', note: 'ID document OCR completed' } }));
      }

      if (selfieBase64) {
        setFicaChecks(prev => ({ ...prev, face_match: { ...prev.face_match, status: 'running' } }));
        faceResult = await base44.functions.invoke('ficaVerify', { action: 'faceMatch', payload: { id_number: formData.sa_id_number, selfie_image: selfieBase64 } });
        const facePass = (faceResult?.data?.confidence_score || 0) >= 80;
        setFicaChecks(prev => ({ ...prev, face_match: { ...prev.face_match, status: facePass ? 'pass' : 'fail', note: faceResult?.data?.confidence_score ? 'Confidence: ' + faceResult.data.confidence_score + '%' : '' } }));
      } else {
        setFicaChecks(prev => ({ ...prev, face_match: { ...prev.face_match, status: 'skipped', note: 'No selfie - manual review required' } }));
      }

      setFicaChecks(prev => ({ ...prev, avs_bank: { ...prev.avs_bank, status: 'skipped', note: 'Captured at proposal stage' } }));

      const faceMatchPassed = selfieBase64 ? (faceResult?.data?.confidence_score || 0) >= 80 : false;
      const rmcpResult = calculateWeightedRmcpScore({
        formData,
        clientType: 'individual',
        amlMatch,
        idVerified: true,
        documentIssue: docIsForgery,
        faceMatchPassed,
        addressVerified,
      });
      setFicaChecks(prev => ({ ...prev, risk_score: { ...prev.risk_score, status: 'pass', note: rmcpResult.band + ' risk (' + rmcpResult.score + ' pts)' } }));

      let ficaStatus = docIsForgery ? 'Referred' : amlMatch ? 'Referred' : 'Approved';
      if (rmcpResult.band === 'Prohibited') ficaStatus = 'Referred';
      const ficaRef = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';

      const failureReason = docIsForgery
        ? 'Document authentication indicated possible forgery or tampering'
        : rmcpResult.band === 'Prohibited'
        ? 'RMCP score classified the client as prohibited risk'
        : amlMatch
        ? 'AML / PEP / sanctions match detected'
        : '';
      const finalResult = { fica_status: ficaStatus, risk_band: rmcpResult.band, fica_reference: ficaRef, verified_at: new Date().toISOString(), failure_reason: failureReason, rmcp_score: rmcpResult };
      setFicaResult(finalResult);

      const updateData = {
        fica_status: ficaStatus,
        verification_status: ficaStatus === 'Approved' ? 'Verified' : 'Manual Review',
        advisor_review_required: ficaStatus !== 'Approved',
        fica_reference: ficaRef,
        fica_risk_band: rmcpResult.band,
        fica_verified_at: finalResult.verified_at,
        home_affairs_verified: true,
        aml_pep_clear: !amlMatch,
        fica_checks_json: JSON.stringify(ficaChecks),
        fica_failure_reason: failureReason,
        ...buildRmcpUpdate(rmcpResult),
      };
      await base44.entities.Clients.update(clientId, updateData);

      if (rmcpResult.band === 'Prohibited' || rmcpResult.band === 'High' || ficaStatus !== 'Approved') {
        const scoreSummary = `Client Factor: ${rmcpResult.breakdown.client_factor} / 30\nGeography Factor: ${rmcpResult.breakdown.geography_factor} / 25\nProduct Factor: ${rmcpResult.breakdown.product_factor} / 20\nTransaction Factor: ${rmcpResult.breakdown.transaction_factor} / 15\nBehaviour Factor: ${rmcpResult.breakdown.behaviour_factor} / 10\nTOTAL RMCP SCORE: ${rmcpResult.score} / 100 - ${rmcpResult.band} RISK`;
        const emailSubject = rmcpResult.band === 'Prohibited' ? `URGENT - Prohibited client: ${formData.first_name} ${formData.last_name}` :
                            rmcpResult.band === 'High' ? `EDD Required - High risk client: ${formData.first_name} ${formData.last_name}` :
                            `FICA ${ficaStatus} - ${formData.first_name} ${formData.last_name}`;
        const emailBody = `RMCP Risk Assessment & FICA Outcome for ${formData.first_name} ${formData.last_name}\n\nFICA Status: ${ficaStatus}\nFICA Reference: ${ficaRef}\nRMCP Risk Band: ${rmcpResult.band}\n\nRISK SCORE BREAKDOWN:\n${scoreSummary}\n\nCLIENT DETAILS:\nID: ${formData.sa_id_number || 'N/A'}\nPEP Status: ${formData.pep_status}\nFATCA US Person: ${formData.us_person_fatca}\nTax Residency: ${formData.tax_residency}\nMonthly Investable: ${formData.monthly_investable_surplus}\nAdvisory Needs: ${(formData.advisory_needs || []).join(', ') || 'None'}\n\n${rmcpResult.band === 'Prohibited' ? 'ACTION: Manual compliance review required before internal approval.' : rmcpResult.band === 'High' ? 'ACTION: Apply Enhanced Due Diligence (EDD) per RMCP Section 3.3.' : 'ACTION: Standard CDD applies. Log in to review full details.'}\n\nLog in to the WealthWorks Advisor Portal to manage this client.`;
        await base44.functions.invoke('sendTransactionalEmail', { to: ADVISOR_NOTIFICATION_EMAIL, subject: emailSubject, text: emailBody });
      }

      if (ficaStatus === 'Approved') toast.success('Verification completed - Reference: ' + ficaRef);
      else toast.info('Verification submitted. Your advisor will review anything that needs attention.');
    } catch (err) {
      const ref = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
      setFicaResult({ fica_status: 'Referred', fica_reference: ref, verified_at: new Date().toISOString(), failure_reason: err.message || 'Verification service unavailable' });
      toast.info('Verification submitted. Your advisor will review anything that needs attention.');
    } finally {
      setFicaRunning(false);
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
      if (formData.identity_type === 'SA ID' && (!(formData.identity_document_front_uploaded || formData.doc_identity) || !(formData.identity_document_back_uploaded || formData.doc_identity_back))) {
        toast.error('Please upload both the front and back of the SA ID');
        return;
      }
      stepData = {
        identity_document_uploaded: formData.identity_document_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        income_proof_uploaded: formData.income_proof_uploaded,
        existing_policies_uploaded: formData.existing_policies_uploaded,
        identity_document_front_uploaded: formData.identity_document_front_uploaded,
        identity_document_back_uploaded: formData.identity_document_back_uploaded,
        doc_identity: formData.doc_identity,
        doc_identity_name: formData.doc_identity_name,
        doc_identity_back: formData.doc_identity_back,
        doc_identity_back_name: formData.doc_identity_back_name,
        doc_proof_of_address: formData.doc_proof_of_address,
        doc_proof_of_address_name: formData.doc_proof_of_address_name,
        doc_source_of_funds: formData.doc_source_of_funds,
        doc_source_of_funds_name: formData.doc_source_of_funds_name,
        doc_existing_policies: formData.doc_existing_policies,
        doc_existing_policies_name: formData.doc_existing_policies_name,
      };
    } else if (currentStep === 3) {
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
    } else if (currentStep === 4) {
      if (!ficaResult) {
        toast.info('Verification will continue in the background. You can keep completing onboarding.');
        runFicaVerification();
      }
      stepData = {
        fica_status: ficaResult?.fica_status || 'Pending',
        verification_status: ficaResult ? (ficaResult.fica_status === 'Approved' ? 'Verified' : 'Manual Review') : 'Pending',
        advisor_review_required: ficaResult ? ficaResult.fica_status !== 'Approved' : false,
        fica_reference: ficaResult?.fica_reference || '',
        fica_risk_band: ficaResult?.risk_band || '',
        fica_verified_at: ficaResult?.verified_at || '',
        home_affairs_verified: ficaResult?.fica_status === 'Approved',
        aml_pep_clear: ficaResult?.fica_status !== 'Referred',
      };
    } else if (currentStep === 5) {
      stepData = {
        gross_annual_income_band: normalizeRangeValue(formData.gross_annual_income_band),
        monthly_investable_surplus: normalizeRangeValue(formData.monthly_investable_surplus),
        net_worth_band: normalizeRangeValue(formData.net_worth_band),
        total_liabilities: normalizeRangeValue(formData.total_liabilities),
        will_in_place: formData.will_in_place,
        dependants: formData.dependants,
      };
    } else if (currentStep === 6) {
      stepData = {
        existing_financial_products: productsList,
        products_list: productsList,
        loa_uploaded: formData.loa_uploaded,
        loa_authorised: formData.loa_authorised,
      };
    } else if (currentStep === 7) {
      if (!formData.risk_profile) {
        toast.error('Please select a risk profile');
        return;
      }
      stepData = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: normalizeRangeValue(formData.time_horizon),
        liquidity_requirement: normalizeRangeValue(formData.liquidity_requirement),
        risk_profile: formData.risk_profile,
        calculated_risk_score: calcRiskScore(formData),
        calculated_risk_profile: scoreToProfile(calcRiskScore(formData)),
        risk_profile_overridden: profileOverridden,
        advisory_needs: formData.advisory_needs,
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

  const saveAndSubmitCurrent = async () => {
    let stepData = {};
    if (currentStep === 1) {
      stepData = {
        client_type: formData.client_type, identity_type: formData.identity_type,
        title: formData.title, first_name: formData.first_name, last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        sa_id_number: formData.sa_id_number, passport_number: formData.passport_number,
        date_of_birth: formData.date_of_birth, marital_status: formData.marital_status,
        dependants: formData.dependants, email: formData.email, mobile_number: formData.mobile_number,
        street_address: formData.street_address, suburb: formData.suburb, city: formData.city,
        province: formData.province, postal_code: formData.postal_code, industry: formData.industry,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (formData.identity_type === 'SA ID' && (!(formData.identity_document_front_uploaded || formData.doc_identity) || !(formData.identity_document_back_uploaded || formData.doc_identity_back))) {
        toast.error('Please upload both the front and back of the SA ID');
        return false;
      }
      stepData = {
        identity_document_uploaded: formData.identity_document_uploaded,
        proof_of_address_uploaded: formData.proof_of_address_uploaded,
        income_proof_uploaded: formData.income_proof_uploaded,
        existing_policies_uploaded: formData.existing_policies_uploaded,
        identity_document_front_uploaded: formData.identity_document_front_uploaded,
        identity_document_back_uploaded: formData.identity_document_back_uploaded,
        doc_identity: formData.doc_identity,
        doc_identity_name: formData.doc_identity_name,
        doc_identity_back: formData.doc_identity_back,
        doc_identity_back_name: formData.doc_identity_back_name,
        doc_proof_of_address: formData.doc_proof_of_address,
        doc_proof_of_address_name: formData.doc_proof_of_address_name,
        doc_source_of_funds: formData.doc_source_of_funds,
        doc_source_of_funds_name: formData.doc_source_of_funds_name,
        doc_existing_policies: formData.doc_existing_policies,
        doc_existing_policies_name: formData.doc_existing_policies_name,
      };
    } else if (currentStep === 3) {
      stepData = {
        employment_status: formData.employment_status, occupation: formData.occupation,
        employer: formData.employer, industry: formData.industry,
        source_of_funds: formData.source_of_funds, sa_tax_number: formData.sa_tax_number,
        tax_residency: formData.tax_residency, us_person_fatca: formData.us_person_fatca,
        pep_status: formData.pep_status, pep_explanation: formData.pep_explanation,
      };
    } else if (currentStep === 4) {
      stepData = {
        fica_status: ficaResult?.fica_status || 'Pending',
        verification_status: ficaResult ? (ficaResult.fica_status === 'Approved' ? 'Verified' : 'Manual Review') : 'Pending',
        advisor_review_required: ficaResult ? ficaResult.fica_status !== 'Approved' : false,
        fica_reference: ficaResult?.fica_reference || '',
        fica_risk_band: ficaResult?.risk_band || '',
        fica_verified_at: ficaResult?.verified_at || '',
        home_affairs_verified: ficaResult?.fica_status === 'Approved',
        aml_pep_clear: ficaResult?.fica_status !== 'Referred',
      };
    } else if (currentStep === 5) {
      stepData = {
        gross_annual_income_band: normalizeRangeValue(formData.gross_annual_income_band),
        monthly_investable_surplus: normalizeRangeValue(formData.monthly_investable_surplus),
        net_worth_band: normalizeRangeValue(formData.net_worth_band), total_liabilities: normalizeRangeValue(formData.total_liabilities),
        will_in_place: formData.will_in_place, dependants: formData.dependants,
      };
    } else if (currentStep === 6) {
      stepData = {
        existing_financial_products: productsList, products_list: productsList,
        loa_uploaded: formData.loa_uploaded, loa_authorised: formData.loa_authorised,
      };
    } else if (currentStep === 7) {
      stepData = {
        portfolio_drop_response: formData.portfolio_drop_response,
        primary_investment_objective: formData.primary_investment_objective,
        time_horizon: normalizeRangeValue(formData.time_horizon), liquidity_requirement: normalizeRangeValue(formData.liquidity_requirement),
        risk_profile: formData.risk_profile,
        calculated_risk_score: calcRiskScore(formData),
        calculated_risk_profile: scoreToProfile(calcRiskScore(formData)),
        risk_profile_overridden: profileOverridden,
        advisory_needs: formData.advisory_needs,
      };
    }
    return await saveStep(stepData);
  };

  const handleSaveAndSubmit = async () => {
    const saved = await saveAndSubmitCurrent();
    if (saved) await handleSubmit();
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!clientId) { toast.error('Client record not found'); return; }
    setIsSubmitting(true);
    try {
      await base44.entities.Clients.update(clientId, {
        client_status: 'Under Review',
        onboarding_complete: true,
        doc_submitted_at: new Date().toISOString(),
        doc_status: 'Submitted',
        verification_status: 'Pending',
        doc_identity: formData.doc_identity || '',
        doc_identity_name: formData.doc_identity_name || '',
        doc_identity_back: formData.doc_identity_back || '',
        doc_identity_back_name: formData.doc_identity_back_name || '',
        doc_proof_of_address: formData.doc_proof_of_address || '',
        doc_proof_of_address_name: formData.doc_proof_of_address_name || '',
        doc_source_of_funds: formData.doc_source_of_funds || '',
        doc_source_of_funds_name: formData.doc_source_of_funds_name || '',
        doc_existing_policies: formData.doc_existing_policies || '',
        doc_existing_policies_name: formData.doc_existing_policies_name || '',
        doc_banking_proof: formData.doc_banking_proof || '',
        doc_banking_proof_name: formData.doc_banking_proof_name || '',
      });

      const clientFullName = `${formData.first_name} ${formData.last_name}`.trim() || formData.entity_name || 'Client';
      const clientIdNumber = formData.sa_id_number || formData.passport_number || 'N/A';
      const submittedDocs = [
        formData.identity_document_uploaded && 'Uploaded Identity Document\n',
        formData.proof_of_address_uploaded && 'Uploaded Proof of Address\n',
        formData.income_proof_uploaded && 'Uploaded Income / Source of Funds\n',
        formData.existing_policies_uploaded && 'Uploaded Existing Policies\n',
      ].filter(Boolean).join('');

      await base44.functions.invoke('sendTransactionalEmail', {
        to: ADVISOR_NOTIFICATION_EMAIL,
        subject: `New Client Documents Submitted - ${clientFullName}`,
        text: `${clientFullName} has completed their onboarding and submitted their FICA documents.\n\nPlease log in to the WealthWorks Advisor Portal to review the documents and proceed with the proposal.\n\nClient: ${clientFullName}\nID Number: ${clientIdNumber}\nEmail: ${formData.email}\nSubmitted: ${new Date().toLocaleString('en-ZA')}\n\nDocuments submitted:\n${submittedDocs}`,
      });

      const allProposals = await base44.entities.Proposal.list();
      const existing = allProposals.find(p =>
        p.client_id === clientId || p.client_id === String(clientId) || String(p.client_id) === String(clientId)
      ) || null;

      const clientName = `${formData.first_name} ${formData.last_name}`.trim() || formData.entity_name || 'Client';

      // Fetch latest client data to get FICA fields
      const latestClient = await base44.entities.Clients.list().then(clients => clients.find(c => c.id === clientId));

      const proposalFicaData = {
        fica_reference: ficaResult?.fica_reference || latestClient?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || latestClient?.fica_verified_at || '',
        fica_status: ficaResult?.fica_status || latestClient?.fica_status || '',
        fica_risk_band: ficaResult?.risk_band || latestClient?.fica_risk_band || '',
        rmcp_risk_score: ficaResult?.rmcp_score?.score || latestClient?.rmcp_risk_score || 0,
        rmcp_risk_band: ficaResult?.rmcp_score?.band || latestClient?.rmcp_risk_band || 'Low',
        aml_pep_clear: latestClient?.aml_pep_clear !== undefined ? latestClient.aml_pep_clear : true,
        home_affairs_verified: latestClient?.home_affairs_verified !== undefined ? latestClient.home_affairs_verified : false,
        offshore_exposure: (formData.advisory_needs || []).includes('Local and offshore investments'),
      };

      if (existing) {
        await base44.entities.Proposal.update(existing.id, {
          client_id: clientId,
          client_name: clientName,
          advisory_needs: formData.advisory_needs,
          proposal_status: 'Pending Review',
          status: 'new',
          ...proposalFicaData,
        });
      } else {
        await base44.entities.Proposal.create({
          client_id: clientId,
          client_name: clientName,
          advisory_needs: formData.advisory_needs,
          reference: 'WW-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          advisor_name: 'Trevor Fine',
          proposal_status: 'Pending Review',
          status: 'new',
          pdf_status: 'No PDF',
          advisor_signature_completed: false,
          client_signature_completed: false,
          document_version: 1,
          ...proposalFicaData,
        });
      }

      await createOnboardingComplianceEntries({
        ...latestClient,
        ...formData,
        id: clientId,
        full_name: clientName,
        fica_status: proposalFicaData.fica_status,
        fica_risk_band: proposalFicaData.fica_risk_band,
        rmcp_risk_score: proposalFicaData.rmcp_risk_score,
        rmcp_risk_band: proposalFicaData.rmcp_risk_band,
        aml_pep_clear: proposalFicaData.aml_pep_clear,
      });

      // Fire-and-forget background verification - never blocks submission
      base44.functions.invoke('runBackgroundVerification', {
        client_id: clientId,
        client_type: 'Natural Person',
      }).catch(() => {});

      toast.success('Onboarding submitted successfully');
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
  const clientDisplayName = [formData.first_name, formData.last_name].filter(Boolean).join(' ') || formData.email || 'Client';

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
            <button
              key={step.number}
              type="button"
              onClick={() => setCurrentStep(step.number)}
              className={`flex items-center gap-2 py-1 px-2 rounded text-sm mb-0.5 w-full text-left ${isCurrent ? 'text-ocean font-medium' : isComplete ? 'text-muted-foreground hover:text-ocean' : 'text-muted-foreground/50'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${isCurrent ? 'border-ocean bg-ocean text-white' : isComplete ? 'border-teal bg-teal text-white' : 'border-border'}`}>
                {isComplete ? <Check className="w-3 h-3" /> : step.number}
              </div>
              {step.label}
            </button>
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
          <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF 8</span>
        </div>

        {/* Step navigation banner */}
        <div className="bg-card border-b border-border px-5 py-0 flex items-center gap-0 overflow-x-auto shrink-0">
          {STEPS.map(step => {
            const isComplete = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setCurrentStep(step.number)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  isCurrent ? 'border-ocean text-ocean' : isComplete ? 'border-teal text-teal hover:border-ocean hover:text-ocean' : 'border-transparent text-muted-foreground hover:text-navy'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  isCurrent ? 'bg-ocean text-white' : isComplete ? 'bg-teal text-white' : 'bg-border text-muted-foreground'
                }`}>
                  {isComplete ? 'OK' : step.number}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 max-w-6xl mx-auto w-full">
          {/* Step Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">STEP {currentStep} OF 8</p>
            <h1 className="text-2xl font-bold text-navy mb-1">
              {currentStep === 1 && 'Personal information'}
              {currentStep === 2 && 'Document upload'}
              {currentStep === 3 && 'KYC declaration'}
              {currentStep === 4 && 'FICA verification'}
              {currentStep === 5 && 'Income & assets'}
              {currentStep === 6 && 'Existing products'}
              {currentStep === 7 && 'Risk profile & objectives'}
              {currentStep === 8 && 'Review & submit'}
            </h1>
            <p className="text-xs text-muted-foreground mb-1">Client: <span className="font-semibold text-navy">{clientDisplayName}</span></p>
            <p className="text-muted-foreground text-xs max-w-xl">
              {currentStep === 1 && 'Your personal particulars as required under Section 4 of the FAIS Act.'}
              {currentStep === 2 && 'Upload certified copies of required documents. Documents are required before FICA verification can proceed.'}
              {currentStep === 3 && 'Employment, source of funds, and tax/PEP declaration as required under FICA.'}
              {currentStep === 4 && 'Automated identity verification via VerifyNow - Home Affairs, AML/PEP, and document authentication.'}
              {currentStep === 5 && 'Your income, assets and liabilities - required for the financial needs analysis under FAIS GCC Section 8.'}
              {currentStep === 6 && 'Your existing financial products and letter of authority.'}
              {currentStep === 7 && 'Your risk profile is a mandatory requirement under FAIS and forms a core part of your Record of Advice.'}
              {currentStep === 8 && 'Your onboarding is complete. Your WealthWorks advisor has been notified.'}
            </p>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 1: Personal Information Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                    <DatePickerField className="mt-1" value={formData.date_of_birth} onChange={v => handleChange('date_of_birth', v)} />
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
                    <DatePickerField className="mt-1" value={formData.date_of_birth} onChange={v => handleChange('date_of_birth', v)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MARITAL STATUS</Label>
                  <Select value={formData.marital_status || undefined} onValueChange={v => handleChange('marital_status', v)}>
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
                <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">RESIDENTIAL ADDRESS - FICA REQUIRES A PHYSICAL ADDRESS</p>
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

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 2: Document Upload Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'identity_document_uploaded', title: 'IDENTITY DOCUMENT', badge: 'OPTIONAL', desc: 'SA ID / Smart Card / Passport', sub: 'Front & back clearly visible', urlField: 'doc_identity' },
                  { key: 'proof_of_address_uploaded', title: 'PROOF OF ADDRESS', badge: 'OPTIONAL', desc: 'Utility bill / bank statement', sub: 'Must show name and address', urlField: 'doc_proof_of_address' },
                  { key: 'income_proof_uploaded', title: 'INCOME / SOURCE OF FUNDS', badge: 'OPTIONAL', desc: '3 months payslips or 6 months bank statements', sub: 'Multiple files accepted', urlField: 'doc_source_of_funds' },
                  { key: 'existing_policies_uploaded', title: 'EXISTING POLICIES', badge: 'OPTIONAL', desc: 'Current policy documents or statements', sub: 'Assists with needs analysis', urlField: 'doc_existing_policies' },
                  { key: 'banking_proof_uploaded', title: 'PROOF OF BANKING DETAILS', badge: 'OPTIONAL', desc: 'Bank-stamped letter or 3 months bank statements', sub: 'Shows account holder, bank and account number', urlField: 'doc_banking_proof' },
                  ].filter(doc => !(doc.key === 'identity_document_uploaded' && formData.identity_type === 'SA ID')).map(doc => {
                  const isUploaded = !!(formData[doc.key] || formData[doc.urlField]);
                  const fileName = uploadedFileName(doc.key) || formData[`${doc.urlField}_name`] || '';
                  return (
                    <div key={doc.key} className="border border-border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase">{doc.title}</h4>
                        <span className="text-[10px] font-semibold text-muted-foreground">{doc.badge}</span>
                      </div>
                      {isUploaded ? (
                        <label className="block cursor-pointer">
                          <div className="flex items-center justify-between gap-2 p-2 bg-teal/10 border border-teal/20 rounded hover:border-ocean/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {uploadingDocs[doc.key] ? <Loader2 className="w-4 h-4 text-teal animate-spin" /> : <Check className="w-4 h-4 text-teal" />}
                              <span className="text-xs text-teal font-medium">{uploadingDocs[doc.key] ? 'Uploading...' : 'Uploaded'}</span>
                              {fileName && <span className="text-[10px] text-muted-foreground truncate max-w-[170px]" title={fileName}>{fileName}</span>}
                            </div>
                            <span className="text-[10px] text-ocean font-medium">Change document</span>
                          </div>
                          <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                        </label>
                      ) : (
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-ocean/50 transition-colors">
                            <p className="text-xs font-medium text-navy">{doc.desc}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{doc.sub}</p>
                            <p className="text-[10px] text-ocean mt-2">Click to upload</p>
                          </div>
                          <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                  );
                  })}
                {formData.identity_type === 'SA ID' && [
                  { key: 'identity_document_front_uploaded', title: 'SA ID FRONT', desc: 'Front of smart card / green ID', urlField: 'doc_identity' },
                  { key: 'identity_document_back_uploaded', title: 'SA ID BACK', desc: 'Back of smart card / green ID', urlField: 'doc_identity_back' },
                ].map(doc => {
                  const isUploaded = !!(formData[doc.key] || formData[doc.urlField]);
                  const fileName = uploadedFileName(doc.key) || formData[`${doc.urlField}_name`] || '';
                  return (
                  <div key={doc.key} className="border border-border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase">{doc.title}</h4>
                      <span className="text-[10px] font-semibold text-muted-foreground">REQUIRED</span>
                    </div>
                    {isUploaded ? (
                      <label className="block cursor-pointer">
                        <div className="flex items-center justify-between gap-2 p-2 bg-teal/10 border border-teal/20 rounded hover:border-ocean/50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            {uploadingDocs[doc.key] ? <Loader2 className="w-4 h-4 text-teal animate-spin shrink-0" /> : <Check className="w-4 h-4 text-teal shrink-0" />}
                            <span className="text-xs text-teal font-medium shrink-0">{uploadingDocs[doc.key] ? 'Uploading...' : 'Uploaded'}</span>
                            {fileName && <span className="text-[10px] text-muted-foreground truncate" title={fileName}>{fileName}</span>}
                          </div>
                          <span className="text-[10px] text-ocean font-medium shrink-0">Change document</span>
                        </div>
                        <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                      </label>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded p-4 text-center hover:border-ocean/50 transition-colors">
                          <p className="text-xs font-medium text-navy">{doc.desc}</p>
                          <p className="text-[10px] text-ocean mt-2">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                  );
                })}
              </div>
              <div className="p-3 bg-secondary/50 border border-border rounded text-xs text-muted-foreground">
                <p className="font-semibold text-navy mb-0.5">Note</p>
                Documents are required before you can proceed to FICA verification in the next step.
              </div>
            </div>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 3: KYC Declaration Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 3 && (
            <div className="space-y-1.5">
              <div className="border border-border rounded p-1.5">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-[10px] mb-1">EMPLOYMENT & OCCUPATION</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">EMPLOYMENT STATUS *</Label>
                    <Select value={formData.employment_status} onValueChange={v => handleChange('employment_status', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Employed', 'Self-employed', 'Retired', 'Unemployed', 'Student'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">OCCUPATION *</Label>
                    <Input className="mt-0.5 h-7 text-xs" value={formData.occupation} onChange={e => handleChange('occupation', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">EMPLOYER / BUSINESS</Label>
                    <Input className="mt-0.5 h-7 text-xs" value={formData.employer} onChange={e => handleChange('employer', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">INDUSTRY</Label>
                    <Select value={formData.industry} onValueChange={v => handleChange('industry', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded p-1.5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-[10px]">SOURCE OF FUNDS</h3>
                  <span className="text-[8px] text-muted-foreground">SELECT ALL</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {['Salary / employment income', 'Business income / dividends', 'Investment returns', 'Inheritance / gift', 'Retirement / pension fund', 'Sale of property / assets'].map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-1 border border-border rounded hover:bg-secondary/50 text-[9px]">
                      <input type="checkbox" checked={formData.source_of_funds.includes(item)} onChange={() => toggleArrayItem('source_of_funds', item)} className="w-3.5 h-3.5 accent-ocean" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded p-1.5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-[10px]">TAX & PEP DECLARATION</h3>
                  <span className="text-[8px] font-semibold text-ocean">FATCA / CRS</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">SA TAX NUMBER</Label>
                    <Input className="mt-0.5 h-7 text-xs" placeholder="10-digit SARS" value={formData.sa_tax_number} onChange={e => handleChange('sa_tax_number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">TAX RESIDENCY</Label>
                    <Select value={formData.tax_residency} onValueChange={v => handleChange('tax_residency', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['South Africa only', 'South Africa + Other', 'Other country only'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">US PERSON (FATCA)?</Label>
                    <Select value={formData.us_person_fatca} onValueChange={v => handleChange('us_person_fatca', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">PEP STATUS</Label>
                    <Select value={formData.pep_status} onValueChange={v => handleChange('pep_status', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="Related to PEP">Related to PEP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.pep_status === 'Yes' && (
                  <div className="mt-1">
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">PEP DETAILS</Label>
                    <Input className="mt-0.5 h-7 text-xs" placeholder="Describe the public function" value={formData.pep_explanation} onChange={e => handleChange('pep_explanation', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: FICA Verification */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="border-2 border-ocean/20 rounded-lg p-4 bg-ocean/[0.02]">
                <h3 className="font-semibold text-navy text-sm mb-3">Document verification</h3>
                <div className="flex items-start gap-3 p-3 bg-secondary/50 border border-border rounded">
                  <span className="text-base shrink-0">ℹ️</span>
                  <div>
                    <p className="font-semibold text-sm text-navy">Verification is under review</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      WealthWorks will review your submitted documents and identity information. You will be contacted if anything further is required.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-secondary/50 border border-border rounded text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-navy">Privacy note: </span>
                Verification results, AML screening and risk ratings are retained for WealthWorks internal compliance review and are not displayed as client-facing outcomes.
              </div>
            </div>
          )}
          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 5: Income & Assets Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 5 && (
            <div className="space-y-2">
              <div className="border border-border rounded p-2.5">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">INCOME & ASSETS</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">GROSS ANNUAL INCOME BAND</Label>
                    <Select value={formData.gross_annual_income_band || undefined} onValueChange={v => handleChange('gross_annual_income_band', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R150,000', 'R150,000 - R350,000', 'R350,000 - R750,000', 'R750,000 - R1.5m', 'R1.5m - R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">MONTHLY INVESTABLE SURPLUS</Label>
                    <Select value={formData.monthly_investable_surplus || undefined} onValueChange={v => handleChange('monthly_investable_surplus', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R2,000', 'R2,000 - R5,000', 'R5,000 - R15,000', 'R15,000 - R50,000', 'Over R50,000'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">NET WORTH BAND</Label>
                    <Select value={formData.net_worth_band || undefined} onValueChange={v => handleChange('net_worth_band', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Under R500,000', 'R500k - R2m', 'R2m - R5m', 'R5m - R10m', 'R10m - R20m', 'Over R20m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
                    <Select value={formData.total_liabilities || undefined} onValueChange={v => handleChange('total_liabilities', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['None', 'Under R500,000', 'R500k - R1m', 'R1m - R3m', 'Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">WILL IN PLACE?</Label>
                    <Select value={formData.will_in_place || undefined} onValueChange={v => handleChange('will_in_place', v)}>
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
            </div>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 6: Existing Products Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 6 && (
            <div className="space-y-2">
              <div className="border border-border rounded p-2.5">
                <div className="flex justify-between items-center mb-1.5">
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
                        <Select value={product.type || undefined} onValueChange={v => updateProduct(idx, 'type', v)}>
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
                        <Input
                          className="h-8 text-xs"
                          placeholder="0"
                          type="text"
                          value={product.value ? Number(String(product.value).replace(/,/g, '')).toLocaleString('en-ZA') : ''}
                          onChange={e => updateProduct(idx, 'value', e.target.value.replace(/,/g, ''))}
                          onFocus={e => updateProduct(idx, 'value', String(product.value).replace(/,/g, ''))}
                        />
                      </div>
                      <button type="button" onClick={() => removeProduct(idx)} className={`text-muted-foreground hover:text-danger transition-colors ${idx === 0 ? 'mt-5' : ''}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded p-2.5">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-1.5">LETTER OF AUTHORITY</h3>
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

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 7: Risk Profile & Objectives Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 7 && (
            <div className="space-y-1">
              <div className="border border-border rounded p-1.5">
                <h3 className="font-semibold text-navy uppercase tracking-wider text-[10px] mb-1">RISK TOLERANCE QUESTIONNAIRE</h3>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">IF YOUR PORTFOLIO FELL 20% IN 3 MONTHS</Label>
                    <Select value={formData.portfolio_drop_response} onValueChange={v => handleChange('portfolio_drop_response', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select your response" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sell immediately">Sell immediately - protect what's left</SelectItem>
                        <SelectItem value="Hold">Hold - wait for recovery</SelectItem>
                        <SelectItem value="Buy more">Buy more - take the opportunity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">PRIMARY INVESTMENT OBJECTIVE</Label>
                    <Select value={formData.primary_investment_objective} onValueChange={v => handleChange('primary_investment_objective', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Capital preservation', 'Income generation', 'Moderate growth', 'Aggressive growth', 'Speculation'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">TIME HORIZON</Label>
                    <Select value={formData.time_horizon} onValueChange={v => handleChange('time_horizon', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">LIQUIDITY REQUIREMENT</Label>
                    <Select value={formData.liquidity_requirement} onValueChange={v => handleChange('liquidity_requirement', v)}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{['Immediate access required', 'Access within 1 year', 'Access within 3 years', 'Long-term - no immediate need'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.portfolio_drop_response || formData.time_horizon || formData.liquidity_requirement || formData.primary_investment_objective) && (
                  <div className="mt-1 p-1 bg-ocean/5 border border-ocean/20 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-semibold tracking-wider text-ocean uppercase">CALCULATED RISK SCORE</span>
                      <span className="text-xs font-bold text-ocean">{riskScore} / 10</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 my-0.5">
                      <div className="h-1.5 rounded-full bg-ocean transition-all" style={{ width: `${riskScore * 10}%` }} />
                    </div>
                    <p className="text-[8px] text-muted-foreground leading-tight">Based on your answers - auto-selecting <strong>{scoreToProfile(riskScore)}</strong></p>
                  </div>
                )}

                <div className="mt-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <Label className="text-[9px] font-semibold tracking-wider text-navy uppercase">RISK PROFILE *</Label>
                    {profileOverridden && (
                      <button type="button" onClick={() => { setProfileOverridden(false); }} className="text-[8px] text-ocean hover:underline">Reset</button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-0.5">
                    {[
                      { value: 'Conservative', sub: 'Capital protection.' },
                      { value: 'Cautious', sub: 'Low risk.' },
                      { value: 'Moderate', sub: 'Balanced.' },
                      { value: 'Growth', sub: 'Long-term.' },
                      { value: 'Aggressive', sub: 'Max growth.' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => { setProfileOverridden(true); handleChange('risk_profile', opt.value); }}
                        className={`p-1 border rounded text-left transition-all ${formData.risk_profile === opt.value ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
                        <p className={`text-[9px] font-semibold ${formData.risk_profile === opt.value ? 'text-ocean' : 'text-navy'}`}>{opt.value}</p>
                        <p className="text-[8px] text-muted-foreground mt-0">{opt.sub}</p>
                        {formData.risk_profile === opt.value && <div className="h-0.5 bg-ocean mt-0 rounded" />}
                      </button>
                    ))}
                  </div>
                  {profileOverridden && (
                    <p className="text-[8px] text-warn mt-0.5">Profile overridden - suggests <strong>{scoreToProfile(riskScore)}</strong></p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded p-1.5">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="font-semibold text-navy uppercase tracking-wider text-[10px]">ADVISORY NEEDS</h3>
                  <span className="text-[8px] text-muted-foreground">SELECT ALL</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {ADVISORY_NEEDS.map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-1 border border-border rounded hover:bg-secondary/50 text-[9px]">
                      <input type="checkbox" checked={formData.advisory_needs.includes(item)} onChange={() => toggleArrayItem('advisory_needs', item)} className="w-3.5 h-3.5 accent-ocean" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 8: Review & Submit Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {currentStep === 8 && (
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
                  { label: 'RISK PROFILE', value: formData.risk_profile || '-' },
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

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Navigation Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="pt-5 border-t border-border mt-5">
            <div className="flex gap-3">
              {currentStep > 1 && currentStep < 8 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm">
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {currentStep < 8 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingStep || isSubmitting}
                  onClick={handleSaveAndSubmit}
                  className="px-5 h-9 text-sm border-navy text-navy hover:bg-navy hover:text-white"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Save & submit'}
                </Button>
              )}
              {currentStep < 7 && (
                <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
                  {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Continue'}
                </Button>
              )}
              {currentStep === 7 && (
                <Button type="button" onClick={handleContinue} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm bg-navy text-white hover:bg-ocean">
                  {isSavingStep ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Review & submit'}
                </Button>
              )}
              {currentStep === 8 && (
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 h-9 text-sm bg-teal text-white hover:bg-teal/90">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Confirm & done'}
                </Button>
              )}
            </div>
            {currentStep < 8 && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                You can save and submit at any point. You can return to complete remaining sections later.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}