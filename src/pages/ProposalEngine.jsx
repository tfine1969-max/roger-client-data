import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ADVISORS } from '@/lib/constants';
import TopBar from '@/components/layout/TopBar';
import StepNavBar from '@/components/engine/StepNavBar';
import Step01ClientDetails from '@/components/engine/Step01ClientDetails';
import Step02Recommendations from '@/components/engine/Step02Recommendations';
import Step03Suitability from '@/components/engine/Step03Suitability';
import Step04ReviewSend from '@/components/engine/Step04ReviewSend';
import generateProposalPdf from '@/lib/generateProposalPdf';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { useLocation } from 'react-router-dom';

export default function ProposalEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState(null);
  const [activeStep, setActiveStep] = useState(location.state?.step || 'client_details');
  const [isSending, setIsSending] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const list = await base44.entities.Proposal.list();
      return list.find(p => p.id === id) || null;
    },
    enabled: !!id,
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Clients.list(),
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', id],
    queryFn: async () => {
      const all = await base44.entities.Investments.list();
      return all.filter(inv => inv.proposal_id === id);
    },
    enabled: !!id,
  });

  const { data: riskProductsRaw = [] } = useQuery({
    queryKey: ['riskProducts', id],
    queryFn: async () => {
      const all = await base44.entities.RiskProducts.list();
      return all.filter(rp => rp.proposal_id === id);
    },
    enabled: !!id,
  });

  const { data: allRiskCovers = [] } = useQuery({
    queryKey: ['allRiskCovers', id],
    queryFn: async () => {
      const allRp = await base44.entities.RiskProducts.list();
      const products = allRp.filter(rp => rp.proposal_id === id);
      if (!products.length) return [];
      const coversArrays = await Promise.all(
        products.map(p => base44.entities.RiskCovers.filter({ risk_product_id: p.id }))
      );
      return coversArrays.flat();
    },
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => base44.entities.Attachments.filter({ proposal_id: id }),
    enabled: !!id,
  });

  const riskProducts = riskProductsRaw.map(rp => {
    const covers = allRiskCovers.filter(c => c.risk_product_id === rp.id);
    const total_premium = covers.reduce((s, c) => s + (parseFloat(c.premium) || 0), 0);
    return { ...rp, _covers: covers, total_premium };
  });

  // ── Seed localData from proposal + client ─────────────────────────────────
  useEffect(() => {
    if (!proposal || localData || allClients.length === 0) return;

    const client = allClients.find(c => c.id === proposal.client_id)
      || allClients.find(c => {
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
        return fullName === (proposal.client_name || '').toLowerCase();
      });

    if (!client) { setLocalData({ ...proposal }); return; }

    const isEntity = client.client_type === 'Company' || client.client_type === 'Trust';
    const advisoryNeeds = Array.isArray(client.advisory_needs) ? client.advisory_needs : [];
    const needsArray = [];
    if (advisoryNeeds.some(n => n.toLowerCase().includes('invest') || n.toLowerCase().includes('offshore'))) needsArray.push('investment');
    if (advisoryNeeds.some(n => n.toLowerCase().includes('risk') || n.toLowerCase().includes('cover'))) needsArray.push('risk_cover');

    setLocalData({
      ...proposal,
      client_type: isEntity ? client.client_type.toLowerCase() : 'natural_person',
      client_name: isEntity
        ? (client.entity_name || client.trust_name || proposal.client_name)
        : (`${client.first_name || ''} ${client.last_name || ''}`.trim() || proposal.client_name),
      client_id_number: isEntity
        ? (client.trust_number || client.registration_number || '')
        : (client.sa_id_number || client.passport_number || ''),
      identification_type: isEntity ? 'registration'
        : (client.identity_type === 'SA ID' ? 'sa_id' : client.identity_type === 'Passport' ? 'passport' : ''),
      client_dob: client.date_of_birth || '',
      client_email: client.email || '',
      client_mobile: client.mobile_number || '',
      client_tax_residency: client.tax_residency || '',
      risk_profile: proposal.risk_profile || client.risk_profile || '',
      time_horizon: client.time_horizon || '',
      needs_array: proposal.needs_array?.length > 0 ? proposal.needs_array : needsArray,
      advisory_needs: advisoryNeeds,
    });
  }, [proposal, allClients]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const debouncedSave = useCallback(
    debounce((data) => {
      const { id: _id, created_date, updated_date, created_by, ...cleanData } = data;
      updateMutation.mutate({ data: cleanData });
    }, 1500),
    [id]
  );

  const handleFieldChange = (field, value) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    debouncedSave(updated);
  };

  const handleSignatureChange = (data, type) => {
    const updated = { ...localData, advisor_signature_data: data, advisor_signature_type: type };
    if (data) updated.status = updated.status === 'new' ? 'signed' : updated.status;
    setLocalData(updated);
    debouncedSave(updated);
  };

  const handleGeneratePdf = () => {
    if (!localData) return;
    const doc = generateProposalPdf(localData, investments, riskProducts);
    doc.save(`${localData.reference || 'proposal'}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleSend = async () => {
    if (!localData?.advisor_signature_data) { toast.error('Please sign in Step 03 before sending'); return; }
    setIsSending(true);
    const doc = generateProposalPdf(localData, investments, riskProducts);
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${localData.reference}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    const { id: _id, created_date, updated_date, created_by, ...cleanData } = localData;
    await base44.entities.Proposal.update(id, { ...cleanData, proposal_pdf_url: file_url, status: 'sent' });
    setLocalData(prev => ({ ...prev, status: 'sent', proposal_pdf_url: file_url }));
    queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setIsSending(false);
    toast.success('Proposal ready — share the signing link with your client');
  };

  const handleAttachmentUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Attachments.create({ proposal_id: id, attachment_type: type, file_url });
    queryClient.invalidateQueries({ queryKey: ['attachments', id] });
    toast.success(`${type} uploaded`);
  };

  // ── Completed steps heuristic ─────────────────────────────────────────────
  const completedSteps = [];
  if (localData?.client_name && activeStep !== 'client_details') completedSteps.push('client_details');
  if ((investments.length > 0 || riskProducts.length > 0) && (activeStep === 'suitability' || activeStep === 'review')) completedSteps.push('recommendations');
  if (localData?.advisor_signature_data && activeStep === 'review') completedSteps.push('suitability');

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading || !localData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar advisorName="—" statusText="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const advisorKey = localData.advisor_key || 'trevor';
  const advisor = ADVISORS[advisorKey] || ADVISORS.trevor;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 flex flex-col shadow-sm">
        <TopBar advisorName={advisor.name} statusText={localData.reference} />

        {/* Progress bar */}
        <div className="bg-navy px-6 py-3">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div 
              className="bg-forest h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedSteps.length + 1) * 25}%` }}
            />
          </div>
          <p className="text-white/60 text-[9px] mt-1.5">Step {['client_details', 'recommendations', 'suitability', 'review'].indexOf(activeStep) + 1} of 4</p>
        </div>

        {/* Step navbar */}
        <StepNavBar
          activeStep={activeStep}
          completedSteps={completedSteps}
          onStepClick={setActiveStep}
        />
      </div>

      {/* Page content */}
      <div className="flex-1 p-4 md:p-6">
        {/* Back to inbox link */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate('/proposals')}
            className="border border-border text-muted-foreground px-4 py-2 text-xs font-medium tracking-[.06em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to inbox
          </button>
        </div>

        {activeStep === 'client_details' && (
          <Step01ClientDetails
            data={localData}
            onFieldChange={handleFieldChange}
            onNext={() => setActiveStep('recommendations')}
          />
        )}

        {activeStep === 'recommendations' && (
          <Step02Recommendations
            proposalId={id}
            investments={investments}
            riskProducts={riskProducts}
            onNext={() => setActiveStep('suitability')}
          />
        )}

        {activeStep === 'suitability' && (
          <Step03Suitability
            data={localData}
            onFieldChange={handleFieldChange}
            investments={investments}
            riskProducts={riskProducts}
            onNext={() => setActiveStep('review')}
          />
        )}

        {activeStep === 'review' && (
          <Step04ReviewSend
            data={localData}
            investments={investments}
            riskProducts={riskProducts}
            attachments={attachments}
            onGeneratePdf={handleGeneratePdf}
            onSend={handleSend}
            onAttachmentUpload={handleAttachmentUpload}
            onFieldChange={handleFieldChange}
            isSending={isSending}
          />
        )}
      </div>
    </div>
  );
}