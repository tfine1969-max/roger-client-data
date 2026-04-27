import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

export default function ProposalEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState(null);
  const [activeStep, setActiveStep] = useState(location.state?.step || 'client_details');


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
    return { ...rp, covers, _covers: covers, total_premium };
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
      time_horizon: client.time_horizon || proposal.time_horizon || '',
      needs_array: proposal.needs_array?.length > 0 ? proposal.needs_array : needsArray,
      advisory_needs: advisoryNeeds,
      // ── Financial profile fields pulled from client ──────────────────────
      annual_income_band: proposal.annual_income_band || client.annual_income_band || client.gross_annual_income_band || '',
      net_worth_band: proposal.net_worth_band || client.net_worth_band || '',
      liquidity_requirement: proposal.liquidity_requirement || client.liquidity_requirement || client.liquidity_needs || '',
      tax_residency: proposal.tax_residency || client.tax_residency || '',
      source_of_funds: proposal.source_of_funds?.length > 0 ? proposal.source_of_funds : (client.source_of_funds || []),
    });
  }, [proposal, allClients]);

  // ── Step change invalidations ──────────────────────────────────────────────
  useEffect(() => {
    if (activeStep === 'client_details') {
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    }
  }, [activeStep]);

  useEffect(() => {
    if (activeStep === 'recommendations') {
      queryClient.invalidateQueries({ queryKey: ['investments', id] });
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    }
  }, [activeStep]);

  // ── Mutations ──────────────────────────────────────────────────────────────
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
    setLocalData(prev => {
      const updated = { ...prev, [field]: value };
      debouncedSave(updated);
      return updated;
    });
  };

  const handleSignatureChange = (data, type) => {
    const updated = { ...localData, advisor_signature_data: data, advisor_signature_type: type };
    if (data) updated.status = updated.status === 'new' ? 'signed' : updated.status;
    setLocalData(updated);
    debouncedSave(updated);
  };



  const handleGeneratePdf = async () => {
    if (!localData) return;
    const { appendAttachmentsToPdf } = await import('@/lib/appendAttachmentsToPdf');
    // Note: pdf_generated_at and status='PDF Ready' are set inside Step04ReviewSend after this resolves

    const doc = await generateProposalPdf(localData, investments, riskProducts);

    // Build ordered attachment list: for each investment, Quote → App Form → Supporting Doc
    const allProducts = [
      ...investments.map(i => ({ id: i.id, label: `${i.provider}${i.product_type ? ` — ${i.product_type}` : ''}` })),
      ...riskProducts.map(r => ({ id: r.id, label: `${r.provider}${(r._covers || []).length ? ` — ${r._covers.map(c => c.cover_type).join(', ')}` : ''}` })),
    ];
    const orderedAttachments = [];
    for (const product of allProducts) {
      for (const [key, docType] of [
        [`Quote::${product.id}`, 'Quote PDF'],
        [`Application Form::${product.id}`, 'App Form'],
        [`Supporting Doc::${product.id}`, 'Supporting Document'],
      ]) {
        const att = attachments.find(a => a.attachment_type === key);
        if (att?.file_url) orderedAttachments.push({ label: product.label, docType, file_url: att.file_url });
      }
    }

    // Get current page count from doc (jsPDF internal)
    let pageNum = doc.internal.getNumberOfPages();
    await appendAttachmentsToPdf(doc, orderedAttachments, localData.client_initials || '', pageNum);

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${localData.reference || 'proposal'}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    await base44.entities.Proposal.update(id, { proposal_pdf_url: file_url });
    setLocalData(prev => ({ ...prev, proposal_pdf_url: file_url }));
    queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    toast.success('PDF generated');
  };

  const handleAttachmentUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Attachments.create({ proposal_id: id, attachment_type: type, file_url });
    queryClient.invalidateQueries({ queryKey: ['attachments', id] });
    toast.success(`${type} uploaded`);
  };

  // ── Completed steps heuristic ──────────────────────────────────────────────
  const completedSteps = [];
  if (localData?.client_name && activeStep !== 'client_details') completedSteps.push('client_details');
  if ((investments.length > 0 || riskProducts.length > 0) && (activeStep === 'suitability' || activeStep === 'review')) completedSteps.push('recommendations');
  if (localData?.advisor_signature_data && activeStep === 'review') completedSteps.push('suitability');

  // ── Loading state ──────────────────────────────────────────────────────────
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

  // Get the full client object for ClientDocumentRepository
  const clientObj = allClients.find(c => c.id === localData.client_id || 
    (c.first_name && c.last_name && 
      `${c.first_name} ${c.last_name}`.trim().toLowerCase() === 
      (localData.client_name || '').toLowerCase()));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 flex flex-col shadow-sm">
        <TopBar advisorName={advisor.name} clientName={localData.client_name} />
        <StepNavBar
          activeStep={activeStep}
          completedSteps={completedSteps}
          onStepClick={setActiveStep}
        />
      </div>

      <div className="flex-1 p-4 md:p-6">
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
            client={clientObj}
            onClientStatusUpdate={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
          />
        )}

        {activeStep === 'recommendations' && (
          <Step02Recommendations
            proposalId={id}
            investments={investments}
            riskProducts={riskProducts}
            proposal={localData}
            onProposalFieldChange={handleFieldChange}
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
            onAttachmentUpload={handleAttachmentUpload}
            onFieldChange={handleFieldChange}
            proposalId={id}
          />
        )}
      </div>
    </div>
  );
}