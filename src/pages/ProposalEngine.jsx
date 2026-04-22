import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ADVISORS } from '@/lib/constants';
import TopBar from '@/components/layout/TopBar';
import ClientStrip from '@/components/engine/ClientStrip';
import RecommendationCard from '@/components/engine/RecommendationCard';
import ProposalPreview from '@/components/engine/ProposalPreview';
import SignaturePad from '@/components/engine/SignaturePad';
import QuoteUpload from '@/components/engine/QuoteUpload';
import generateProposalPdf from '@/lib/generateProposalPdf';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'lodash';
import ClientDetailsForm from '@/components/engine/ClientDetailsForm';

export default function ProposalEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => base44.entities.Proposal.filter({ id }),
    select: (data) => data[0],
    enabled: !!id,
  });

  // Sync fetched proposal to local state
  useEffect(() => {
    if (proposal && !localData) {
      setLocalData({ ...proposal });
    }
  }, [proposal]);

  const updateMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  // Debounced save
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
    if (data) {
      updated.status = updated.status === 'new' ? 'signed' : updated.status;
    }
    setLocalData(updated);
    debouncedSave(updated);
  };

  const handleGeneratePdf = () => {
    if (!localData) return;
    const doc = generateProposalPdf(localData);
    doc.save(`${localData.reference || 'proposal'}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleSend = async () => {
    if (!localData?.advisor_signature_data) {
      toast.error('Please sign before sending');
      return;
    }

    setIsSending(true);

    // Generate PDF and upload
    const doc = generateProposalPdf(localData);
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${localData.reference}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // Update proposal with PDF URL and status
    const { id: _id, created_date, updated_date, created_by, ...cleanData } = localData;
    await base44.entities.Proposal.update(id, { ...cleanData, proposal_pdf_url: file_url, status: 'sent' });

    setLocalData(prev => ({ ...prev, status: 'sent', proposal_pdf_url: file_url }));
    queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setIsSending(false);
    toast.success('Proposal ready — share the signing link with your client');
  };

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
  const hasSig = !!localData.advisor_signature_data;
  const showLifeWarning = localData.needs_identified?.toLowerCase().includes('life');

  // Determine current phase — stored on record, fallback to 'client_details' for new proposals
  const currentPhase = localData.phase || 'client_details';

  const handleProceedToRecommendations = () => {
    handleFieldChange('phase', 'recommendations');
  };

  const handleBackToClientDetails = () => {
    handleFieldChange('phase', 'client_details');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar advisorName={advisor.name} statusText={localData.reference} />
      <ClientStrip proposal={localData} />

      {/* Phase tabs */}
      <div className="bg-card border-b border-border px-4 md:px-6">
        <div className="flex">
          <button
            onClick={() => handleFieldChange('phase', 'client_details')}
            className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors ${
              currentPhase === 'client_details'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            01 · Client details
          </button>
          <button
            onClick={() => handleFieldChange('phase', 'recommendations')}
            className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors ${
              currentPhase === 'recommendations'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            02 · Recommendations
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-medium text-navy">
            {localData.reference} &nbsp;·&nbsp; {localData.client_name}
          </div>
          <button
            onClick={() => navigate('/')}
            className="border border-border text-muted-foreground px-4 py-2 text-xs font-medium tracking-[.06em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to inbox
          </button>
        </div>

        {/* Phase 1: Client Details */}
        {currentPhase === 'client_details' && (
          <ClientDetailsForm
            data={localData}
            onChange={handleFieldChange}
            onProceed={handleProceedToRecommendations}
          />
        )}

        {/* Phase 2: Recommendations */}
        {currentPhase === 'recommendations' && (
          <>
            <div className="bg-blue-50 border border-blue-200 border-l-[3px] border-l-ocean p-3 text-[13px] text-ocean leading-relaxed mb-4">
              <strong>Complete all recommendation fields below.</strong> The proposal preview updates as you type. Sign before sending to client.
            </div>

            {showLifeWarning && (
              <div className="bg-amber-50 border border-amber-200 border-l-[3px] border-l-warn p-3 text-[13px] text-amber-900 leading-relaxed mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Client has selected <strong>Life cover</strong>. Confirm whether existing cover is in place before recommending new policy — gap analysis required.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
              <div>
                <RecommendationCard num={1} variant="primary" data={localData} onChange={handleFieldChange} />
                <RecommendationCard num={2} variant="secondary" data={localData} onChange={handleFieldChange} />
                <RecommendationCard num={3} variant="tertiary" data={localData} onChange={handleFieldChange} optional />

                <div className="border border-border bg-card p-4 mb-3">
                  <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2.5">
                    Personalised message to client
                  </div>
                  <Textarea
                    value={localData.personal_message || ''}
                    onChange={e => handleFieldChange('personal_message', e.target.value)}
                    placeholder="e.g. Dear A.B., Based on your answers I have prepared the following recommendation..."
                    className="rounded-sm min-h-[90px] text-[13px] leading-relaxed"
                  />
                </div>

                <SignaturePad
                  advisorKey={advisorKey}
                  signDate={localData.sign_date}
                  onSignDateChange={v => handleFieldChange('sign_date', v)}
                  onSignatureChange={handleSignatureChange}
                  initialData={localData.advisor_signature_data}
                  initialType={localData.advisor_signature_type}
                />

                <QuoteUpload
                  existingUrl={localData.quote_file_url}
                  onFileUploaded={url => handleFieldChange('quote_file_url', url)}
                />
              </div>

              <div>
                <ProposalPreview
                  proposal={localData}
                  onGeneratePdf={handleGeneratePdf}
                  onSend={handleSend}
                  canSend={hasSig}
                  isSending={isSending}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}