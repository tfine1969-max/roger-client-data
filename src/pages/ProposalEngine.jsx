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
    if (!localData?.client_email) {
      toast.error('Client email is required to send');
      return;
    }

    setIsSending(true);

    // Generate PDF
    const doc = generateProposalPdf(localData);
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${localData.reference}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // Update proposal with PDF URL and status
    const { id: _id, created_date, updated_date, created_by, ...cleanData } = localData;
    await base44.entities.Proposal.update(id, { ...cleanData, proposal_pdf_url: file_url, status: 'sent' });

    // Send email to client
    const advisorKey = localData.advisor_key || 'trevor';
    const advisor = ADVISORS[advisorKey] || ADVISORS.trevor;

    await base44.integrations.Core.SendEmail({
      to: localData.client_email,
      from_name: `${advisor.name} — WealthWorks`,
      subject: `WealthWorks Financial Proposal — ${localData.reference}`,
      body: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0E4166; padding: 20px 28px;">
            <span style="color: #fff; font-size: 16px; font-weight: 500;">wealthworks</span>
            <span style="color: rgba(255,255,255,0.4); font-size: 12px; float: right; margin-top: 4px;">Financial Proposal</span>
          </div>
          <div style="padding: 28px; border: 1px solid #D8E4EC; border-top: none;">
            <p style="color: #2D3A45; font-size: 15px; line-height: 1.8;">
              Dear ${localData.client_name},
            </p>
            ${localData.personal_message ? `<p style="color: #2D3A45; font-size: 14px; line-height: 1.8; margin: 16px 0;">${localData.personal_message}</p>` : ''}
            <p style="color: #2D3A45; font-size: 14px; line-height: 1.8;">
              Please find your financial proposal attached as a PDF document. Reference: <strong>${localData.reference}</strong>
            </p>
            <p style="color: #2D3A45; font-size: 14px; line-height: 1.8;">
              <a href="${file_url}" style="color: #1A6494; text-decoration: underline;">Download your proposal PDF</a>
            </p>
            <p style="color: #8A9AAA; font-size: 12px; margin-top: 24px; line-height: 1.8;">
              This proposal does not constitute a binding offer and is subject to underwriting where applicable.<br>
              Wealth Works (Pty) Ltd — FSP 28337 (Category I)<br>
              Wealthworks Investments (Pty) Ltd — FSP 45624 (Category II)
            </p>
          </div>
        </div>
      `
    });

    setLocalData(prev => ({ ...prev, status: 'sent', proposal_pdf_url: file_url }));
    queryClient.invalidateQueries({ queryKey: ['proposal', id] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    setIsSending(false);
    toast.success('Proposal sent to ' + localData.client_email);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar advisorName={advisor.name} statusText={localData.reference} />
      <ClientStrip proposal={localData} />

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
          {/* Left — Rec cards + signature + quote */}
          <div>
            <RecommendationCard num={1} variant="primary" data={localData} onChange={handleFieldChange} />
            <RecommendationCard num={2} variant="secondary" data={localData} onChange={handleFieldChange} />
            <RecommendationCard num={3} variant="tertiary" data={localData} onChange={handleFieldChange} optional />

            {/* Personal message */}
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

            {/* Signature */}
            <SignaturePad
              advisorKey={advisorKey}
              signDate={localData.sign_date}
              onSignDateChange={v => handleFieldChange('sign_date', v)}
              onSignatureChange={handleSignatureChange}
              initialData={localData.advisor_signature_data}
              initialType={localData.advisor_signature_type}
            />

            {/* Quote upload */}
            <QuoteUpload
              existingUrl={localData.quote_file_url}
              onFileUploaded={url => handleFieldChange('quote_file_url', url)}
            />
          </div>

          {/* Right — Preview */}
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
      </div>
    </div>
  );
}