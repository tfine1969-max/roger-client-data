import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ADVISORS } from '@/lib/constants';
import TopBar from '@/components/layout/TopBar';
import ClientStrip from '@/components/engine/ClientStrip';
import ProposalPreview from '@/components/engine/ProposalPreview';
import SignaturePad from '@/components/engine/SignaturePad';
import QuoteUpload from '@/components/engine/QuoteUpload';
import generateProposalPdf from '@/lib/generateProposalPdf';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'lodash';
import ClientDetailsFormDynamic from '@/components/engine/ClientDetailsFormDynamic';

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

  const riskProducts = riskProductsRaw.map(rp => {
    const covers = allRiskCovers.filter(c => c.risk_product_id === rp.id);
    const total_premium = covers.reduce((s, c) => s + (parseFloat(c.premium) || 0), 0);
    return { ...rp, _covers: covers, total_premium };
  });

  useEffect(() => {
    if (!proposal || localData || allClients.length === 0) return;

    const client = allClients.find(c => c.id === proposal.client_id)
      || allClients.find(c => {
          const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
          return fullName === (proposal.client_name || '').toLowerCase();
        });

    if (!client) {
      setLocalData({ ...proposal });
      return;
    }

    const advisoryNeeds = Array.isArray(client.advisory_needs) ? client.advisory_needs : [];
    const needsArray = [];
    if (advisoryNeeds.some(n => n.toLowerCase().includes('invest') || n.toLowerCase().includes('offshore'))) {
      needsArray.push('investment');
    }
    if (advisoryNeeds.some(n => n.toLowerCase().includes('risk') || n.toLowerCase().includes('cover'))) {
      needsArray.push('risk_cover');
    }

    const merged = {
      ...proposal,
      client_type: 'natural_person',
      client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || proposal.client_name,
      client_id_number: client.sa_id_number || client.passport_number || '',
      identification_type: client.identity_type === 'SA ID' ? 'sa_id' : client.identity_type === 'Passport' ? 'passport' : '',
      client_dob: client.date_of_birth || '',
      client_email: client.email || '',
      client_mobile: client.mobile_number || '',
      client_tax_residency: client.tax_residency || '',
      risk_profile: proposal.risk_profile || client.risk_profile || '',
      time_horizon: client.time_horizon || '',
      needs_array: proposal.needs_array?.length > 0 ? proposal.needs_array : needsArray,
      advisory_needs: advisoryNeeds,
    };

    setLocalData(merged);
  }, [proposal, allClients]);

  const updateMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
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
    if (data) {
      updated.status = updated.status === 'new' ? 'signed' : updated.status;
    }
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
    if (!localData?.advisor_signature_data) {
      toast.error('Please sign before sending');
      return;
    }
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
  const currentPhase = localData.phase || 'client_details';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 flex flex-col shadow-sm">
        <TopBar advisorName={advisor.name} statusText={localData.reference} />
        <div className="bg-navy text-white px-6 py-2 flex items-center justify-between w-full text-xs">
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Client</span><span className="font-semibold">{localData.client_name}</span></div>
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Risk Profile</span><span className="font-medium">{localData.risk_profile || '—'}</span></div>
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Time Horizon</span><span className="font-medium">{localData.time_horizon || '—'}</span></div>
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Needs</span><span className="font-medium">{Array.isArray(localData.advisory_needs) && localData.advisory_needs.length > 0 ? localData.advisory_needs.join(', ') : '—'}</span></div>
          <div><span className="font-mono text-[10px] text-white/60">{localData.reference}</span></div>
        </div>
        <div className="bg-card border-b border-border px-4 md:px-6">
          <div className="flex">
            <button
              onClick={() => handleFieldChange('phase', 'client_details')}
              className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors ${
                currentPhase === 'client_details' ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              01 · Client details
            </button>
            <button
              onClick={() => handleFieldChange('phase', 'recommendations')}
              className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors ${
                currentPhase === 'recommendations' ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              02 · Recommendations
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <div className="sticky top-0 z-10 bg-background py-2 flex items-center justify-between mb-4 border-b border-border">
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

        {currentPhase === 'client_details' && (
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <ClientDetailsFormDynamic
                data={localData}
                onChange={handleFieldChange}
                onProceed={() => handleFieldChange('phase', 'recommendations')}
              />
            </div>
          </div>
        )}

        {currentPhase === 'recommendations' && (
          <>
            <div className="bg-blue-50 border border-blue-200 border-l-[3px] border-l-ocean p-3 text-[13px] text-ocean leading-relaxed mb-4">
              <strong>Complete all recommendation fields below.</strong> The proposal preview updates as you type. Sign before sending to client.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 items-start">
              <div>
                {investments.length > 0 && (
                  <div className="border border-border bg-card mb-2 overflow-hidden border-t-2 border-t-ocean">
                    <div className="px-3 py-2 border-b border-border bg-muted flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Investment Recommendations</span>
                      <span className="text-[8px] font-medium text-white px-2 py-0.5 tracking-[.06em] uppercase bg-ocean">Investment</span>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {investments.map((inv, i) => (
                          <div key={inv.id || i} className="border border-border rounded-sm p-2.5 bg-background">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-navy">{inv.provider}</span>
                              <span className="text-[9px] text-muted-foreground">{inv.jurisdiction} · {inv.currency}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mb-1.5">{inv.product_type}</div>
                            <div className="space-y-0.5 text-[10px]">
                              {inv.amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Lump sum</span><span className="font-medium text-navy">{inv.currency} {Number(inv.amount).toLocaleString('en-ZA')}</span></div>}
                              {inv.recurring_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Recurring</span><span className="font-medium text-navy">{inv.currency} {Number(inv.recurring_amount).toLocaleString('en-ZA')}</span></div>}
                              {inv.initial_fee_percent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Initial fee</span><span className="font-medium text-navy">{inv.initial_fee_percent}%</span></div>}
                              {inv.annual_advice_fee_percent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Annual fee</span><span className="font-medium text-navy">{inv.annual_advice_fee_percent}%</span></div>}
                              {Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Funds</span><span className="font-medium text-navy text-right max-w-[60%]">{inv.underlying_funds.join(', ')}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <textarea
                        className="border border-border bg-muted text-[11px] text-foreground w-full outline-none p-2 resize-y min-h-[50px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
                        value={localData.investment_rationale || ''}
                        onChange={e => handleFieldChange('investment_rationale', e.target.value)}
                        placeholder="Suitability rationale..."
                      />
                    </div>
                  </div>
                )}

                {riskProducts.length > 0 && (
                  <div className="border border-border bg-card mb-2 overflow-hidden border-t-2 border-t-teal">
                    <div className="px-3 py-2 border-b border-border bg-muted flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Risk Cover Recommendations</span>
                      <span className="text-[8px] font-medium text-white px-2 py-0.5 tracking-[.06em] uppercase bg-teal">Risk Cover</span>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {riskProducts.map((rp, i) => (
                          <div key={rp.id || i} className="border border-border rounded-sm p-2.5 bg-background">
                            <div className="text-xs font-semibold text-navy mb-1.5">{rp.provider}</div>
                            <div className="space-y-0.5">
                              {rp._covers.map((cover, ci) => (
                                <div key={ci} className="flex justify-between text-[10px]">
                                  <span className="text-muted-foreground">{cover.cover_type}</span>
                                  <div className="text-right">
                                    {cover.amount_required > 0 && <div className="font-medium text-navy">R {Number(cover.amount_required).toLocaleString('en-ZA')}</div>}
                                    {cover.premium > 0 && <div className="text-muted-foreground">R {Number(cover.premium).toLocaleString('en-ZA')} pm</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {rp.total_premium > 0 && (
                              <div className="flex justify-between text-[10px] font-semibold text-teal pt-1.5 border-t border-border mt-1.5">
                                <span>Total pm</span>
                                <span>R {Number(rp.total_premium).toLocaleString('en-ZA')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <textarea
                        className="border border-border bg-muted text-[11px] text-foreground w-full outline-none p-2 resize-y min-h-[50px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
                        value={localData.risk_cover_rationale || ''}
                        onChange={e => handleFieldChange('risk_cover_rationale', e.target.value)}
                        placeholder="Suitability rationale..."
                      />
                    </div>
                  </div>
                )}

                {investments.length === 0 && riskProducts.length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm mb-3">
                    No investments or risk products added yet. Go back to the proposal and add them first.
                  </div>
                )}

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

              <div className="lg:sticky lg:top-4">
                <ProposalPreview
                  proposal={localData}
                  investments={investments}
                  riskProducts={riskProducts}
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