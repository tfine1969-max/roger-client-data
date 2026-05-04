import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerField from '@/components/ui/date-picker-field';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Check, Plus } from 'lucide-react';
import PersonCard from '@/components/onboarding/PersonCard';
import { uploadedDocumentName, uploadOnboardingDocument } from '@/lib/onboardingDocuments';
import { buildRmcpUpdate, calculateRmcpScore } from '@/lib/rmcpRiskScoring';
import { ADVISORS } from '@/lib/constants';

const ADVISOR_NOTIFICATION_EMAIL = ADVISORS.trevor.email;

const STEPS = [
  { number: 1, label: 'Trust details' },
  { number: 2, label: 'Trustees' },
  { number: 3, label: 'Document upload' },
  { number: 4, label: 'KYC declaration' },
  { number: 5, label: 'FICA verification' },
  { number: 6, label: 'Financial profile' },
  { number: 7, label: 'Risk & objectives' },
  { number: 8, label: 'Submit' },
];

const ADVISORY_NEEDS = ['Local and offshore investments', 'Retirement planning', 'Estate planning', 'Tax planning', 'Business assurance'];
const PROVINCES = ['Western Cape','Gauteng','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];

const calcRiskScore = (fd) => {
  let s = 0;
  s += ({ 'Sell immediately': 0, 'Hold': 1.5, 'Buy more': 3 })[fd.portfolio_drop_response] || 0;
  s += ({ 'Less than 1 year': 0, '1-3 years': 0.75, '3-5 years': 1.5, '5-10 years': 2.25, '10+ years': 3 })[fd.time_horizon] || 0;
  s += ({ 'Immediate access required': 0, 'Access within 1 year': 0.67, 'Access within 3 years': 1.33, 'Long-term - no immediate need': 2 })[fd.liquidity_requirement] || 0;
  s += ({ 'Capital preservation': 0, 'Income generation': 0.5, 'Moderate growth': 1, 'Aggressive growth': 1.5, 'Speculation': 2 })[fd.primary_investment_objective] || 0;
  return Math.round(Math.min(10, s));
};
const scoreToProfile = (s) => s <= 2 ? 'Conservative' : s <= 4 ? 'Cautious' : s <= 6 ? 'Moderate' : s <= 8 ? 'Growth' : 'Aggressive';

const normalizeRangeValue = (value) => (
  typeof value === 'string'
    ? value.replace(/Ã¢â‚¬â€œ|â€“|-/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim()
    : value
);

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
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [profileOverridden, setProfileOverridden] = useState(false);
  const [profileInitialised, setProfileInitialised] = useState(false);
  const [ficaRunning, setFicaRunning] = useState(false);
  const [ficaResult, setFicaResult] = useState(null);
  const [trusteeChecks, setTrusteeChecks] = useState([]);

  const [formData, setFormData] = useState({
    entity_name: '', trust_number: '', trust_type: '', trust_deed_date: '',
    contact_trustee_name: '',
    street_address: '', suburb: '', city: '', province: '', postal_code: '',
    email: '', mobile_number: '',
    // Docs
    trust_deed_uploaded: false, loa_uploaded: false,
    trust_proof_of_address_uploaded: false, trust_bank_statement_uploaded: false,
    doc_identity: '', doc_identity_name: '',
    doc_proof_of_address: '', doc_proof_of_address_name: '',
    doc_source_of_funds: '', doc_source_of_funds_name: '',
    doc_existing_policies: '', doc_existing_policies_name: '',
    trust_deed_uploaded_name: '', loa_uploaded_name: '',
    trust_proof_of_address_uploaded_name: '', trust_bank_statement_uploaded_name: '',
    // KYC
    trust_purpose: '', trust_source_of_funds: [], beneficiary_declaration: '',
    entity_tax_number: '', entity_tax_residency: '', entity_fatca: 'No', entity_pep: 'No',
    // Financial
    trust_asset_value_band: '', trust_income_band: '', entity_total_liabilities: '',
    entity_existing_products: '', entity_loa_uploaded: false, entity_loa_authorised: false,
    // Risk
    portfolio_drop_response: '', primary_investment_objective: '',
    time_horizon: '', liquidity_requirement: '', risk_profile: '', advisory_needs: [],
  });

  const [trustees, setTrustees] = useState([emptyTrustee(), emptyTrustee()]);

  useEffect(() => {
    const id = sessionStorage.getItem('pending_client_id');
    if (!id) { navigate('/client-registration', { replace: true }); return; }
    const entityType = sessionStorage.getItem('pending_entity_type');
    if (entityType && entityType !== 'Trust') {
      if (entityType === 'Company') { navigate('/client-onboarding-company', { replace: true }); return; }
      navigate('/client-onboarding', { replace: true }); return;
    }
    base44.entities.Clients.list().then(clients => {
      const c = clients.find(x => x.id === id);
      if (c) {
        setFormData(prev => ({
          ...prev,
          entity_name: c.entity_name || prev.entity_name,
          trust_number: c.trust_number || prev.trust_number,
          trust_deed_date: c.trust_deed_date || prev.trust_deed_date,
          trust_type: c.trust_type || prev.trust_type,
          contact_trustee_name: c.contact_trustee_name || prev.contact_trustee_name,
          street_address: c.street_address || prev.street_address,
          suburb: c.suburb || prev.suburb, city: c.city || prev.city,
          province: c.province || prev.province, postal_code: c.postal_code || prev.postal_code,
          email: c.email || prev.email, mobile_number: c.mobile_number || prev.mobile_number,
          trust_deed_uploaded: c.trust_deed_uploaded || !!c.doc_identity || prev.trust_deed_uploaded,
          loa_uploaded: c.loa_uploaded || !!c.doc_existing_policies || prev.loa_uploaded,
          trust_proof_of_address_uploaded: c.trust_proof_of_address_uploaded || !!c.doc_proof_of_address || prev.trust_proof_of_address_uploaded,
          trust_bank_statement_uploaded: c.trust_bank_statement_uploaded || !!c.doc_source_of_funds || prev.trust_bank_statement_uploaded,
          doc_identity: c.doc_identity || prev.doc_identity,
          doc_identity_name: c.doc_identity_name || prev.doc_identity_name,
          doc_proof_of_address: c.doc_proof_of_address || prev.doc_proof_of_address,
          doc_proof_of_address_name: c.doc_proof_of_address_name || prev.doc_proof_of_address_name,
          doc_source_of_funds: c.doc_source_of_funds || prev.doc_source_of_funds,
          doc_source_of_funds_name: c.doc_source_of_funds_name || prev.doc_source_of_funds_name,
          doc_existing_policies: c.doc_existing_policies || prev.doc_existing_policies,
          doc_existing_policies_name: c.doc_existing_policies_name || prev.doc_existing_policies_name,
          trust_deed_uploaded_name: c.trust_deed_uploaded_name || prev.trust_deed_uploaded_name,
          loa_uploaded_name: c.loa_uploaded_name || prev.loa_uploaded_name,
          trust_proof_of_address_uploaded_name: c.trust_proof_of_address_uploaded_name || prev.trust_proof_of_address_uploaded_name,
          trust_bank_statement_uploaded_name: c.trust_bank_statement_uploaded_name || prev.trust_bank_statement_uploaded_name,
          trust_purpose: c.trust_purpose || prev.trust_purpose,
          trust_source_of_funds: Array.isArray(c.trust_source_of_funds)
            ? c.trust_source_of_funds
            : Array.isArray(c.entity_source_of_funds)
            ? c.entity_source_of_funds
            : prev.trust_source_of_funds,
          beneficiary_declaration: c.beneficiary_declaration || prev.beneficiary_declaration,
          entity_tax_number: c.entity_tax_number || prev.entity_tax_number,
          entity_tax_residency: c.entity_tax_residency || prev.entity_tax_residency,
          entity_fatca: c.entity_fatca || prev.entity_fatca,
          entity_pep: c.entity_pep || prev.entity_pep,
          trust_asset_value_band: normalizeRangeValue(c.trust_asset_value_band || c.total_assets_band) || prev.trust_asset_value_band,
          trust_income_band: normalizeRangeValue(c.trust_income_band || c.gross_annual_turnover) || prev.trust_income_band,
          entity_total_liabilities: normalizeRangeValue(c.entity_total_liabilities) || prev.entity_total_liabilities,
          entity_existing_products: c.existing_products_notes || prev.entity_existing_products,
          entity_loa_uploaded: c.entity_loa_uploaded || prev.entity_loa_uploaded,
          entity_loa_authorised: c.entity_loa_authorised || prev.entity_loa_authorised,
          portfolio_drop_response: c.portfolio_drop_response || prev.portfolio_drop_response,
          primary_investment_objective: c.primary_investment_objective || prev.primary_investment_objective,
          time_horizon: normalizeRangeValue(c.time_horizon) || prev.time_horizon,
          liquidity_requirement: normalizeRangeValue(c.liquidity_requirement) || prev.liquidity_requirement,
          risk_profile: c.risk_profile || prev.risk_profile,
          advisory_needs: Array.isArray(c.advisory_needs) ? c.advisory_needs.filter(n => ADVISORY_NEEDS.includes(n)) : prev.advisory_needs,
        }));
        if (c.risk_profile_overridden) setProfileOverridden(true);
        if (Array.isArray(c.trustees_list) && c.trustees_list.length > 0) setTrustees(c.trustees_list);
      }
    }).catch(() => {}).finally(() => { setClientId(id); setIsInitializing(false); setProfileInitialised(true); });
  }, [navigate]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleSof = (item) => setFormData(prev => ({
    ...prev,
    trust_source_of_funds: prev.trust_source_of_funds.includes(item)
      ? prev.trust_source_of_funds.filter(i => i !== item)
      : [...prev.trust_source_of_funds, item],
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
  }, [profileInitialised, profileOverridden, formData.portfolio_drop_response, formData.time_horizon, formData.liquidity_requirement, formData.primary_investment_objective]);

  const updateTrustee = (idx, field, value) => setTrustees(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  const addTrustee = () => setTrustees(prev => [...prev, emptyTrustee()]);
  const removeTrustee = (idx) => { if (trustees.length > 1) setTrustees(prev => prev.filter((_, i) => i !== idx)); };

  const handleDocumentUpload = async (fieldKey, file) => {
    if (!file) return;
    setUploadingDocs(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const { updateData } = await uploadOnboardingDocument({ clientId, fieldKey, file });
      setFormData(prev => ({ ...prev, ...updateData }));
      toast.success('Document uploaded and sent to advisor portal');
    } catch (error) {
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const fileNameFor = (person, key) => person?.[`${key}_name`] || '';

  const handleTrusteeDocumentUpload = async (idx, docType, file) => {
    if (!file || !clientId) return;
    const fieldKey = `trustee_${idx}_${docType}_uploaded`;
    setUploadingDocs(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const { file_url: fileUrl } = await base44.integrations.Core.UploadFile({ file });
      const updatedTrustees = trustees.map((trustee, trusteeIdx) => {
        if (trusteeIdx !== idx) return trustee;
        if (docType === 'id_front') return { ...trustee, id_front_uploaded: true, id_front_file_url: fileUrl, id_front_file_name: file.name, id_uploaded: trustee.id_back_uploaded || trustee.identity_type !== 'SA ID', id_file_url: fileUrl, id_file_name: file.name };
        if (docType === 'id_back') return { ...trustee, id_back_uploaded: true, id_back_file_url: fileUrl, id_back_file_name: file.name, id_uploaded: trustee.id_front_uploaded || trustee.identity_type !== 'SA ID' };
        return docType === 'id'
          ? { ...trustee, id_uploaded: true, id_file_url: fileUrl, id_file_name: file.name }
          : { ...trustee, addr_uploaded: true, addr_file_url: fileUrl, addr_file_name: file.name };
      });
      setTrustees(updatedTrustees);
      setFormData(prev => ({ ...prev, [fieldKey]: true }));
      await base44.entities.Clients.update(clientId, {
        trustees_list: updatedTrustees,
        trustee_documents_json: JSON.stringify(updatedTrustees.map((trustee, trusteeIndex) => ({
          trustee_index: trusteeIndex,
          name: [trustee.first_name, trustee.last_name].filter(Boolean).join(' '),
          id_file_url: trustee.id_file_url || '',
          id_file_name: trustee.id_file_name || '',
          id_front_file_url: trustee.id_front_file_url || '',
          id_front_file_name: trustee.id_front_file_name || '',
          id_back_file_url: trustee.id_back_file_url || '',
          id_back_file_name: trustee.id_back_file_name || '',
          addr_file_url: trustee.addr_file_url || '',
          addr_file_name: trustee.addr_file_name || '',
        }))),
        doc_submitted_at: new Date().toISOString(),
        doc_status: 'Submitted',
      });
      toast.success('Trustee document uploaded and indexed');
    } catch (error) {
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

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

  const runTrustFicaVerification = async () => {
    if (trustees.filter(t => t.first_name && t.id_number).length === 0) { toast.error('Please complete trustee details first'); return; }
    setFicaRunning(true); setFicaResult(null);
    const activeTrustees = trustees.filter(t => t.first_name && t.id_number);
    setTrusteeChecks(activeTrustees.map(t => ({ name: t.first_name + ' ' + t.last_name, id: 'pending', address: 'pending', doc: 'pending', aml: 'pending' })));
    try {
      let allPass = true, anyFlag = false;
      const updatedChecks = [];
      for (let i = 0; i < activeTrustees.length; i++) {
        const trustee = activeTrustees[i];
        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, id: 'running' } : c));
        const idResult = await base44.functions.invoke('ficaVerify', { action: 'verifyId', payload: { id_number: trustee.id_number, first_name: trustee.first_name, last_name: trustee.last_name, date_of_birth: trustee.date_of_birth } });
        const idPass = idResult?.data?.data?.results?.said_verification?.Status === 'Success';
        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, id: idPass ? 'pass' : 'fail' } : c));
        if (!idPass) allPass = false;

        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, address: 'running' } : c));
        const traceResult = await base44.functions.invoke('ficaVerify', {
          action: 'consumerTrace',
          payload: {
            id_number: trustee.id_number,
            first_name: trustee.first_name,
            last_name: trustee.last_name,
            street_address: trustee.street_address,
            suburb: trustee.suburb,
            city: trustee.city,
            province: trustee.province,
            postal_code: trustee.postal_code,
          },
        });
        const addressVerified = traceResult?.data?.data?.results?.consumer_trace?.Status === 'Success';
        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, address: addressVerified ? 'pass' : 'flag' } : c));

        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, doc: 'running' } : c));
        const docResult = (trustee.id_front_file_url || trustee.id_file_url)
          ? await base44.functions.invoke('ficaVerify', {
              action: 'authenticateDoc',
              payload: {
                id_number: trustee.id_number,
                document_url: trustee.id_front_file_url || trustee.id_file_url,
                back_document_url: trustee.id_back_file_url,
                document_type: trustee.identity_type === 'Passport' ? 'passport' : 'sa_id',
                reference: 'ww-trust-' + clientId + '-trustee-' + i + '-' + Date.now(),
              },
            })
          : { data: null, error: 'No uploaded trustee ID document available for OCR' };
        const docVerification = docResult?.data?.data?.results?.document_verification || docResult?.data?.data?.results?.id_verification || {};
        const docStatus = docVerification.Status || docVerification.status || docResult?.data?.data?.Status || docResult?.data?.data?.status;
        const docReason = docVerification.Reason || docVerification.reason || '';
        const docIsForgery = ['Failed', 'Rejected', 'Declined'].includes(docStatus) && /Forgery|Tampered|Fraud/i.test(docReason);
        const docAuthenticated = ['Success', 'Approved'].includes(docStatus);
        if (docIsForgery) allPass = false;
        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, doc: docIsForgery ? 'fail' : docAuthenticated ? 'pass' : 'flag' } : c));

        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, aml: 'running' } : c));
        const amlResult = await base44.functions.invoke('ficaVerify', { action: 'screenAml', payload: { name: trustee.first_name + ' ' + trustee.last_name, entity: 0, country: 'za', dataset: 'all' } });
        const amlMatch = amlResult?.data?.data?.totalHits > 0 || false;
        if (amlMatch) anyFlag = true;
        setTrusteeChecks(prev => prev.map((c, idx) => idx === i ? { ...c, aml: amlMatch ? 'flag' : 'pass' } : c));
        updatedChecks.push({ ...trustee, id_verified: idPass, address_verified: addressVerified, document_authenticated: docAuthenticated, document_issue: !!docIsForgery, aml_clear: !amlMatch });
      }
      const ficaStatus = !allPass ? 'Referred' : anyFlag ? 'Referred' : 'Approved';
      const ficaRef = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
      const rmcpResult = calculateRmcpScore({
        formData,
        clientType: 'trust',
        amlMatch: anyFlag,
        roleChecks: updatedChecks,
      });
      const failedTrustees = updatedChecks
        .filter(t => !t.id_verified || !t.aml_clear)
        .map(t => `${[t.first_name, t.last_name].filter(Boolean).join(' ') || 'Trustee'}: ${!t.id_verified ? 'ID verification failed' : 'AML / PEP match detected'}`);
      const failureReason = failedTrustees.join('; ');
      const finalResult = { fica_status: ficaStatus, verification_status: ficaStatus === 'Approved' ? 'Verified' : 'Manual Review', advisor_review_required: ficaStatus !== 'Approved', fica_reference: ficaRef, verified_at: new Date().toISOString(), failure_reason: failureReason, rmcp_score: rmcpResult };
      setFicaResult(finalResult);
      await base44.entities.Clients.update(clientId, {
        fica_status: ficaStatus, verification_status: ficaStatus === 'Approved' ? 'Verified' : 'Manual Review', advisor_review_required: ficaStatus !== 'Approved', fica_reference: ficaRef, fica_verified_at: finalResult.verified_at,
        fica_risk_band: rmcpResult.band,
        entity_aml_clear: !anyFlag,
        trustees_json: JSON.stringify(updatedChecks),
        fica_checks_json: JSON.stringify({ trustees: updatedChecks }),
        fica_failure_reason: failureReason,
        ...buildRmcpUpdate(rmcpResult),
      });
      if (ficaStatus !== 'Approved') {
        await base44.integrations.Core.SendEmail({ from_name: 'WealthWorks FICA', to: ADVISOR_NOTIFICATION_EMAIL, subject: 'Trust FICA ' + ficaStatus + ' - ' + formData.entity_name, body: 'FICA verification for trust ' + formData.entity_name + ' (Reg: ' + formData.trust_number + ') returned: ' + ficaStatus + '\n\nReference: ' + ficaRef + '\nTrustees checked: ' + activeTrustees.length + '\n\nLog in to the WealthWorks Advisor Portal to review.' });
      }
      if (ficaStatus === 'Approved') toast.success('Trust verification completed - ' + ficaRef);
      else toast.info('Verification submitted. Your advisor will review anything that needs attention.');
    } catch (err) {
      const ref = 'FICA-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000) + '-ZA';
      setFicaResult({ fica_status: 'Referred', fica_reference: ref, verified_at: new Date().toISOString(), failure_reason: err.message || 'Verification service unavailable' });
      toast.info('Verification submitted. Your advisor will review anything that needs attention.');
    } finally { setFicaRunning(false); }
  };

  const handleContinue = async () => {
    let data = {};
    if (currentStep === 1) {
      if (!formData.entity_name || !formData.trust_number) { toast.error('Please fill in trust name and registration number'); return; }
      data = {
        client_type: 'Trust', identity_type: 'Trust',
        entity_name: formData.entity_name, trust_number: formData.trust_number,
        trust_type: formData.trust_type, trust_deed_date: formData.trust_deed_date,
        contact_trustee_name: formData.contact_trustee_name,
        street_address: formData.street_address, suburb: formData.suburb, city: formData.city,
        province: formData.province, postal_code: formData.postal_code,
        email: formData.email, mobile_number: formData.mobile_number,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (trustees.some(t => !t.first_name || !t.last_name || !t.id_number)) { toast.error('Please complete all trustee names and ID numbers'); return; }
      data = { trustees_list: trustees };
    } else if (currentStep === 3) {
      const perTrusteeDocs = {};
      trustees.forEach((_, idx) => {
        perTrusteeDocs[`trustee_${idx}_id_uploaded`] = formData[`trustee_${idx}_id_uploaded`] || false;
        perTrusteeDocs[`trustee_${idx}_addr_uploaded`] = formData[`trustee_${idx}_addr_uploaded`] || false;
      });
      data = {
        trust_deed_uploaded: formData.trust_deed_uploaded || false,
        loa_uploaded: formData.loa_uploaded || false,
        trust_proof_of_address_uploaded: formData.trust_proof_of_address_uploaded || false,
        trust_bank_statement_uploaded: formData.trust_bank_statement_uploaded || false,
        doc_identity: formData.doc_identity,
        doc_identity_name: formData.doc_identity_name,
        doc_proof_of_address: formData.doc_proof_of_address,
        doc_proof_of_address_name: formData.doc_proof_of_address_name,
        doc_source_of_funds: formData.doc_source_of_funds,
        doc_source_of_funds_name: formData.doc_source_of_funds_name,
        doc_existing_policies: formData.doc_existing_policies,
        doc_existing_policies_name: formData.doc_existing_policies_name,
        trust_deed_uploaded_name: formData.trust_deed_uploaded_name,
        loa_uploaded_name: formData.loa_uploaded_name,
        trust_proof_of_address_uploaded_name: formData.trust_proof_of_address_uploaded_name,
        trust_bank_statement_uploaded_name: formData.trust_bank_statement_uploaded_name,
        ...perTrusteeDocs,
      };
    } else if (currentStep === 4) {
      data = {
        trust_purpose: formData.trust_purpose,
        trust_source_of_funds: formData.trust_source_of_funds,
        entity_source_of_funds: formData.trust_source_of_funds,
        beneficiary_declaration: formData.beneficiary_declaration,
        entity_tax_number: formData.entity_tax_number,
        entity_tax_residency: formData.entity_tax_residency,
        entity_fatca: formData.entity_fatca,
        entity_pep: formData.entity_pep,
      };
    } else if (currentStep === 5) {
      if (!ficaResult) {
        toast.info('Verification will continue in the background. You can keep completing onboarding.');
        runTrustFicaVerification();
      }
      data = {
        fica_status: ficaResult?.fica_status || 'Pending',
        verification_status: ficaResult ? (ficaResult.fica_status === 'Approved' ? 'Verified' : 'Manual Review') : 'Pending',
        advisor_review_required: ficaResult ? ficaResult.fica_status !== 'Approved' : false,
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        entity_aml_clear: ficaResult?.fica_status !== 'Referred',
        trustees_json: ficaResult ? JSON.stringify(trustees) : '',
      };
    } else if (currentStep === 6) {
      data = {
        trust_asset_value_band: normalizeRangeValue(formData.trust_asset_value_band),
        trust_income_band: normalizeRangeValue(formData.trust_income_band),
        total_assets_band: formData.trust_asset_value_band,
        gross_annual_turnover: formData.trust_income_band,
        entity_total_liabilities: normalizeRangeValue(formData.entity_total_liabilities),
        existing_products_notes: formData.entity_existing_products,
        entity_loa_uploaded: formData.entity_loa_uploaded,
        entity_loa_authorised: formData.entity_loa_authorised,
      };
    } else if (currentStep === 7) {
      if (!formData.risk_profile) { toast.error('Please select a risk profile'); return; }
      data = {
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
    const saved = await saveStep(data);
    if (saved) setCurrentStep(prev => prev + 1);
  };

  const handleSaveAndSubmit = async () => {
    if (currentStep === 8) {
      await handleSubmit();
      return;
    }

    let data = {};
    if (currentStep === 1) {
      if (!formData.entity_name || !formData.trust_number) { toast.error('Please fill in trust name and registration number'); return; }
      data = {
        client_type: 'Trust', identity_type: 'Trust',
        entity_name: formData.entity_name, trust_number: formData.trust_number,
        trust_type: formData.trust_type, trust_deed_date: formData.trust_deed_date,
        contact_trustee_name: formData.contact_trustee_name,
        street_address: formData.street_address, suburb: formData.suburb, city: formData.city,
        province: formData.province, postal_code: formData.postal_code,
        email: formData.email, mobile_number: formData.mobile_number,
        residential_address: `${formData.street_address}, ${formData.suburb}, ${formData.city}, ${formData.province}, ${formData.postal_code}`,
      };
    } else if (currentStep === 2) {
      if (trustees.some(t => !t.first_name || !t.last_name || !t.id_number)) { toast.error('Please complete all trustee names and ID numbers'); return; }
      data = { trustees_list: trustees };
    } else if (currentStep === 3) {
      const perTrusteeDocs = {};
      trustees.forEach((t, idx) => {
        perTrusteeDocs[`trustee_${idx}_id_uploaded`] = formData[`trustee_${idx}_id_uploaded`] || t.id_uploaded || false;
        perTrusteeDocs[`trustee_${idx}_addr_uploaded`] = formData[`trustee_${idx}_addr_uploaded`] || t.addr_uploaded || false;
      });
      data = {
        trust_deed_uploaded: formData.trust_deed_uploaded || false,
        loa_uploaded: formData.loa_uploaded || false,
        trust_proof_of_address_uploaded: formData.trust_proof_of_address_uploaded || false,
        trust_bank_statement_uploaded: formData.trust_bank_statement_uploaded || false,
        doc_identity: formData.doc_identity,
        doc_identity_name: formData.doc_identity_name,
        doc_proof_of_address: formData.doc_proof_of_address,
        doc_proof_of_address_name: formData.doc_proof_of_address_name,
        doc_source_of_funds: formData.doc_source_of_funds,
        doc_source_of_funds_name: formData.doc_source_of_funds_name,
        doc_existing_policies: formData.doc_existing_policies,
        doc_existing_policies_name: formData.doc_existing_policies_name,
        trust_deed_uploaded_name: formData.trust_deed_uploaded_name,
        loa_uploaded_name: formData.loa_uploaded_name,
        trust_proof_of_address_uploaded_name: formData.trust_proof_of_address_uploaded_name,
        trust_bank_statement_uploaded_name: formData.trust_bank_statement_uploaded_name,
        ...perTrusteeDocs,
      };
    } else if (currentStep === 4) {
      data = {
        trust_purpose: formData.trust_purpose,
        trust_source_of_funds: formData.trust_source_of_funds,
        entity_source_of_funds: formData.trust_source_of_funds,
        beneficiary_declaration: formData.beneficiary_declaration,
        entity_tax_number: formData.entity_tax_number,
        entity_tax_residency: formData.entity_tax_residency,
        entity_fatca: formData.entity_fatca,
        entity_pep: formData.entity_pep,
      };
    } else if (currentStep === 5) {
      data = {
        fica_status: ficaResult?.fica_status || 'Pending',
        verification_status: ficaResult ? (ficaResult.fica_status === 'Approved' ? 'Verified' : 'Manual Review') : 'Pending',
        advisor_review_required: ficaResult ? ficaResult.fica_status !== 'Approved' : false,
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        entity_aml_clear: ficaResult ? ficaResult.fica_status !== 'Referred' : false,
        trustees_json: ficaResult ? JSON.stringify(trustees) : '',
      };
    } else if (currentStep === 6) {
      data = {
        trust_asset_value_band: normalizeRangeValue(formData.trust_asset_value_band),
        trust_income_band: normalizeRangeValue(formData.trust_income_band),
        total_assets_band: formData.trust_asset_value_band,
        gross_annual_turnover: formData.trust_income_band,
        entity_total_liabilities: normalizeRangeValue(formData.entity_total_liabilities),
        existing_products_notes: formData.entity_existing_products,
        entity_loa_uploaded: formData.entity_loa_uploaded,
        entity_loa_authorised: formData.entity_loa_authorised,
      };
    } else if (currentStep === 7) {
      data = {
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

    const saved = await saveStep(data);
    if (saved) await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!clientId) return;
    setIsSubmitting(true);
    try {
      const rmcpResult = ficaResult?.rmcp_score || calculateRmcpScore({
        formData,
        clientType: 'trust',
        amlMatch: ficaResult ? ficaResult.fica_status === 'Referred' : false,
        roleChecks: trustees,
      });
      await base44.entities.Clients.update(clientId, {
        client_status: 'Under Review', onboarding_complete: true,
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        fica_risk_band: rmcpResult.band,
        ...buildRmcpUpdate(rmcpResult),
        home_affairs_verified: ficaResult?.fica_status === 'Approved',
        aml_pep_clear: ficaResult?.fica_status === 'Approved',
      });
      const allProposals = await base44.entities.Proposal.list();
      const existing = allProposals.find(p => p.client_id === clientId);
      const clientName = formData.entity_name || 'Trust Client';
      const proposalData = {
        client_id: clientId, client_name: clientName, advisory_needs: formData.advisory_needs,
        status: 'new',
        fica_reference: ficaResult?.fica_reference || '',
        fica_verified_at: ficaResult?.verified_at || '',
        fica_risk_band: rmcpResult.band,
        rmcp_risk_score: rmcpResult.score,
        rmcp_risk_band: rmcpResult.band,
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
      await base44.integrations.Core.SendEmail({
        from_name: 'WealthWorks',
        to: ADVISOR_NOTIFICATION_EMAIL,
        subject: 'New Trust Onboarding - ' + clientName,
        body: 'Trust ' + clientName + ' has completed onboarding.\n\nFICA Reference: ' + (ficaResult?.fica_reference || 'Not verified') + '\nAdvisory needs: ' + formData.advisory_needs.join(', ') + '\n\nLog in to the WealthWorks Advisor Portal to review.',
      });
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
  const clientDisplayName = formData.entity_name || formData.email || 'Trust client';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-5 py-2.5 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> WEALTHWORKS.CO.ZA
        </button>
        <span className="text-xs text-muted-foreground font-mono">STEP {currentStep} OF 8 - TRUST</span>
      </div>

      <div className="bg-card border-b border-border px-5 py-0 flex items-center gap-0 overflow-x-auto shrink-0">
        {STEPS.map(step => {
          const isComplete = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <button key={step.number} type="button" onClick={() => setCurrentStep(step.number)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${isCurrent ? 'border-ocean text-ocean' : isComplete ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isCurrent ? 'bg-ocean text-white' : isComplete ? 'bg-teal text-white' : 'bg-border text-muted-foreground'}`}>
                {isComplete ? 'OK' : step.number}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-4xl mx-auto w-full">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-widest text-ocean uppercase mb-1">STEP {currentStep} OF 8 - TRUST ONBOARDING</p>
          <h1 className="text-2xl font-bold text-navy mb-1">{STEPS[currentStep - 1]?.label}</h1>
          <p className="text-xs text-muted-foreground">Client: <span className="font-semibold text-navy">{clientDisplayName}</span></p>
        </div>

        {/* STEP 1 - Trust Details */}
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
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST TYPE</Label>
                <Select value={formData.trust_type} onValueChange={v => handleChange('trust_type', v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter Vivos Trust">Inter Vivos Trust</SelectItem>
                    <SelectItem value="Testamentary Trust">Testamentary Trust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">TRUST DEED DATE</Label>
                <DatePickerField value={formData.trust_deed_date} onChange={v => handleChange('trust_deed_date', v)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">CONTACT TRUSTEE NAME</Label>
                <Input className="mt-1 h-8 text-sm" value={formData.contact_trustee_name} onChange={e => handleChange('contact_trustee_name', e.target.value)} placeholder="Primary contact person" />
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

        {/* STEP 2 - Trustees */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add all trustees of this trust. Minimum 2 required.</p>
            {trustees.map((trustee, idx) => (
              <PersonCard key={idx} person={trustee} idx={idx} role="Trustee" onUpdate={updateTrustee} onRemove={removeTrustee} canRemove={trustees.length > 1} />
            ))}
            <button type="button" onClick={addTrustee} className="flex items-center gap-1.5 text-xs text-ocean hover:text-navy font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add trustee
            </button>
          </div>
        )}

        {/* STEP 3 - Document Upload */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">TRUST DOCUMENTS</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'trust_deed_uploaded', title: 'TRUST DEED', desc: 'Certified copy of the trust deed' },
                  { key: 'loa_uploaded', title: 'LETTER OF AUTHORITY', desc: "Master of the High Court letter" },
                  { key: 'trust_proof_of_address_uploaded', title: 'PROOF OF REGISTERED ADDRESS', desc: 'Utility bill / bank statement' },
                  { key: 'trust_bank_statement_uploaded', title: 'TRUST BANK STATEMENT', desc: 'Most recent 3 months' },
                ].map(doc => (
                  <div key={doc.key} className="border border-border rounded p-3">
                    <h4 className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">{doc.title}</h4>
                    {formData[doc.key] ? (
                      <label className="block cursor-pointer">
                        <div className="flex items-center justify-between gap-2 p-2 bg-teal/10 border border-teal/20 rounded hover:border-ocean/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {uploadingDocs[doc.key] ? <Loader2 className="w-4 h-4 text-teal animate-spin" /> : <Check className="w-4 h-4 text-teal" />}<span className="text-xs text-teal font-medium">{uploadingDocs[doc.key] ? 'Uploading...' : 'Uploaded'}</span>
                            {uploadedDocumentName(formData, doc.key) && <span className="text-[10px] text-muted-foreground truncate max-w-[170px]" title={uploadedDocumentName(formData, doc.key)}>{uploadedDocumentName(formData, doc.key)}</span>}
                          </div>
                          <span className="text-[10px] text-ocean font-medium">Change document</span>
                        </div>
                        <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                      </label>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                          <p className="text-xs font-medium text-navy">{doc.desc}</p>
                          <p className="text-[10px] text-ocean mt-1">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" onChange={e => handleDocumentUpload(doc.key, e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-ocean uppercase mb-2">PER TRUSTEE DOCUMENTS</p>
              <div className="space-y-3">
                {trustees.map((t, idx) => {
                  const name = [t.first_name, t.last_name].filter(Boolean).join(' ') || `Trustee ${idx + 1}`;
                  return (
                    <div key={idx} className="border border-border rounded p-3">
                      <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Trustee {idx + 1} - {name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: `trustee_${idx}_id_uploaded`, title: 'SA ID / PASSPORT', desc: 'Certified copy of identity document' },
                          { key: `trustee_${idx}_addr_uploaded`, title: 'PROOF OF RESIDENTIAL ADDRESS', desc: 'Utility bill / bank statement' },
                        ].map(doc => (
                          <div key={doc.key} className="border border-border rounded p-2">
                            <h4 className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-1">{doc.title}</h4>
                            {doc.key.endsWith('_id_uploaded') && t.identity_type === 'SA ID' ? (
                              <div className="grid grid-cols-2 gap-2">
                                {[{ key: 'id_front', label: 'Front' }, { key: 'id_back', label: 'Back' }].map(part => {
                                  const uploaded = t[`${part.key}_uploaded`];
                                  const uploadKey = `trustee_${idx}_${part.key}_uploaded`;
                                  return (
                                    <label key={part.key} className="block cursor-pointer">
                                      <div className={`p-1.5 rounded border transition-colors ${uploaded ? 'bg-teal/10 border-teal/20 hover:border-ocean/50' : 'border-dashed border-border hover:border-ocean/50 text-center'}`}>
                                        {uploaded ? (
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {uploadingDocs[uploadKey] ? <Loader2 className="w-3.5 h-3.5 text-teal animate-spin shrink-0" /> : <Check className="w-3.5 h-3.5 text-teal shrink-0" />}
                                            <span className="text-[10px] text-teal font-medium shrink-0">{part.label}</span>
                                            {fileNameFor(t, `${part.key}_file`) && <span className="text-[10px] text-muted-foreground truncate" title={fileNameFor(t, `${part.key}_file`)}>{fileNameFor(t, `${part.key}_file`)}</span>}
                                          </div>
                                        ) : (
                                          <><p className="text-[10px] font-medium text-navy">{part.label}</p><p className="text-[10px] text-ocean">Upload</p></>
                                        )}
                                      </div>
                                      <input type="file" className="hidden" onChange={e => handleTrusteeDocumentUpload(idx, part.key, e.target.files?.[0])} />
                                    </label>
                                  );
                                })}
                              </div>
                            ) : formData[doc.key] || (doc.key.endsWith('_id_uploaded') ? t.id_uploaded : t.addr_uploaded) ? (
                              <label className="block cursor-pointer">
                                <div className="flex items-center justify-between gap-2 p-1.5 bg-teal/10 border border-teal/20 rounded hover:border-ocean/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    {uploadingDocs[doc.key] ? <Loader2 className="w-3.5 h-3.5 text-teal animate-spin" /> : <Check className="w-3.5 h-3.5 text-teal" />}<span className="text-xs text-teal font-medium">{uploadingDocs[doc.key] ? 'Uploading...' : 'Uploaded'}</span>
                                    {(doc.key.endsWith('_id_uploaded') ? t.id_file_name : t.addr_file_name) && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={doc.key.endsWith('_id_uploaded') ? t.id_file_name : t.addr_file_name}>{doc.key.endsWith('_id_uploaded') ? t.id_file_name : t.addr_file_name}</span>}
                                  </div>
                                  <span className="text-[10px] text-ocean font-medium">Change</span>
                                </div>
                                <input type="file" className="hidden" onChange={e => handleTrusteeDocumentUpload(idx, doc.key.endsWith('_id_uploaded') ? 'id' : 'addr', e.target.files?.[0])} />
                              </label>
                            ) : (
                              <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-border rounded p-2 text-center hover:border-ocean/50 transition-colors">
                                  <p className="text-[10px] font-medium text-navy">{doc.desc}</p>
                                  <p className="text-[10px] text-ocean mt-0.5">Click to upload</p>
                                </div>
                                <input type="file" className="hidden" onChange={e => handleTrusteeDocumentUpload(idx, doc.key.endsWith('_id_uploaded') ? 'id' : 'addr', e.target.files?.[0])} />
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

        {/* STEP 4 - KYC Declaration */}
        {currentStep === 4 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">TRUST INFORMATION</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST PURPOSE / OBJECTIVE *</Label>
                  <Input className="mt-1 h-8 text-sm" value={formData.trust_purpose} onChange={e => handleChange('trust_purpose', e.target.value)} placeholder="Describe the purpose of the trust" />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-2 block">SOURCE OF FUNDS</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Trust income','Investment returns','Donations and contributions','Asset sales','Inheritance','Other'].map(item => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer p-1.5 border border-border rounded hover:bg-secondary/50 text-xs">
                        <input type="checkbox" checked={formData.trust_source_of_funds.includes(item)} onChange={() => toggleSof(item)} className="w-3.5 h-3.5 accent-ocean" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">BENEFICIARY DECLARATION</Label>
                  <p className="text-[10px] text-muted-foreground mb-1">List all named beneficiaries of the trust</p>
                  <textarea
                    className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                    value={formData.beneficiary_declaration} onChange={e => handleChange('beneficiary_declaration', e.target.value)}
                    placeholder="e.g. John Smith (son), Jane Smith (daughter), Smith Foundation (charity)..."
                  />
                </div>
              </div>
            </div>
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-2">TAX & COMPLIANCE DECLARATION</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">SA TAX NUMBER (TRUST)</Label>
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
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">FATCA (US TRUST?)</Label>
                  <Select value={formData.entity_fatca} onValueChange={v => handleChange('entity_fatca', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">ANY TRUSTEE IS A PEP?</Label>
                  <Select value={formData.entity_pep} onValueChange={v => handleChange('entity_pep', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 - FICA Verification */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-2 border-ocean/20 rounded-lg p-4 bg-ocean/[0.02]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-navy text-sm">Trust verification</h3>
                  
                </div>
                {!ficaRunning && (
                  <button type="button" onClick={runTrustFicaVerification} className={`h-8 text-xs px-4 rounded font-medium transition-all ${ficaResult ? 'bg-secondary text-navy border border-border' : 'bg-ocean text-white hover:bg-navy'}`}>
                    {ficaResult ? 'Re-submit verification' : 'Submit verification'}
                  </button>
                )}
                {ficaRunning && <span className="text-xs text-ocean font-medium animate-pulse">Submitting...</span>}
              </div>
              <div className={`flex items-start gap-3 p-3 border rounded ${ficaResult?.fica_status === 'Approved' ? 'bg-teal/10 border-teal/20' : ficaResult ? 'bg-amber-50 border-amber-200' : 'bg-secondary/50 border-border'}`}>
                <span className="text-base shrink-0">{ficaResult?.fica_status === 'Approved' ? 'OK' : 'i'}</span>
                <div>
                  <p className={`font-semibold text-sm ${ficaResult ? 'text-navy' : 'text-navy'}`}>
                    {ficaResult ? 'Verification submitted' : 'Ready for submission'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ficaResult
                      ? 'Additional verification may be required. WealthWorks will contact you if further documentation is needed.'
                      : 'Submit this section so WealthWorks can review the required information.'}
                  </p>
                  {ficaResult?.fica_reference && <p className="text-[10px] text-muted-foreground mt-1">Reference: <span className="font-mono font-semibold">{ficaResult.fica_reference}</span></p>}
                </div>
              </div>
            </div>
            <div className="p-3 bg-secondary/50 border border-border rounded text-[10px] text-muted-foreground">
              <span className="font-semibold text-navy">Privacy note: </span>
              Trustee screening, AML and risk results are retained for WealthWorks internal compliance review and are not displayed as client-facing pass/fail decisions.
            </div>
          </div>
        )}
        {/* STEP 6 - Financial Profile */}
        {currentStep === 6 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">TRUST FINANCIALS</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST ASSET VALUE BAND</Label>
                  <Select value={formData.trust_asset_value_band} onValueChange={v => handleChange('trust_asset_value_band', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Under R500k','R500k - R2m','R2m - R10m','R10m - R50m','Over R50m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TRUST INCOME BAND</Label>
                  <Select value={formData.trust_income_band} onValueChange={v => handleChange('trust_income_band', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Under R150,000','R150,000 - R350,000','R350,000 - R750,000','R750,000 - R1.5m','R1.5m - R3m','Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">TOTAL LIABILITIES</Label>
                  <Select value={formData.entity_total_liabilities} onValueChange={v => handleChange('entity_total_liabilities', v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['None','Under R500,000','R500k - R1m','R1m - R3m','Over R3m'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">EXISTING INVESTMENTS / POLICIES</Label>
                <textarea
                  className="w-full mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                  value={formData.entity_existing_products} onChange={e => handleChange('entity_existing_products', e.target.value)}
                  placeholder="List current investments and policies held by the trust..."
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

        {/* STEP 7 - Risk & Objectives */}
        {currentStep === 7 && (
          <div className="space-y-3">
            <div className="border border-border rounded p-3">
              <h3 className="font-semibold text-navy uppercase tracking-wider text-xs mb-3">RISK TOLERANCE</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'portfolio_drop_response', label: 'IF PORTFOLIO FELL 20%', opts: ['Sell immediately','Hold','Buy more'] },
                  { field: 'primary_investment_objective', label: 'PRIMARY OBJECTIVE', opts: ['Capital preservation','Income generation','Moderate growth','Aggressive growth','Speculation'] },
                  { field: 'time_horizon', label: 'TIME HORIZON', opts: ['Less than 1 year','1-3 years','3-5 years','5-10 years','10+ years'] },
                  { field: 'liquidity_requirement', label: 'LIQUIDITY REQUIREMENT', opts: ['Immediate access required','Access within 1 year','Access within 3 years','Long-term - no immediate need'] },
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
                {profileOverridden && <p className="text-[10px] text-warn mt-1">Profile manually overridden - calculated score suggests <strong>{scoreToProfile(calcRiskScore(formData))}</strong></p>}
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

        {/* STEP 8 - Submit */}
        {currentStep === 8 && (
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
                { label: 'RISK PROFILE', value: formData.risk_profile || '-' },
                { label: 'TRUSTEES VERIFIED', value: `${trustees.filter(t => t.first_name || t.last_name).length} added` },
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
            <Button type="button" variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={isSavingStep || isSubmitting} className="px-6 h-9 text-sm">Back</Button>
          )}
          <div className="flex-1" />
          {currentStep < 8 && (
            <Button type="button" variant="outline" onClick={handleSaveAndSubmit} disabled={isSavingStep || isSubmitting} className="px-5 h-9 text-sm border-navy text-navy hover:bg-navy hover:text-white">
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
      </div>
    </div>
  );
}
