import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ADVISORS } from '@/lib/constants';
import TopBar from '@/components/layout/TopBar';
import ProposalPreview from '@/components/engine/ProposalPreview';
import SignaturePad from '@/components/engine/SignaturePad';
import QuoteUpload from '@/components/engine/QuoteUpload';
import generateProposalPdf from '@/lib/generateProposalPdf';
import { ArrowLeft, CheckCircle2, Download, FileSignature, FileText, Upload, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { debounce } from 'lodash';
import ClientDetailsFormDynamic from '@/components/engine/ClientDetailsFormDynamic';

const STATUS_OPTIONS = ['Pending Review', 'In Progress', 'Awaiting Client Signature', 'Signed', 'Sent'];
const STATUS_MAP = { 'Pending Review': 'new', 'In Progress': 'in_progress', 'Awaiting Client Signature': 'in_progress', 'Signed': 'signed', 'Sent': 'sent' };

export default function ProposalEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState(null);
  const [activeTab, setActiveTab] = useState('client_details');
  const [isSending, setIsSending] = useState(false);

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
      const coversArrays = await Promise.all(products.map(p => base44.entities.RiskCovers.filter({ risk_product_id: p.id })));
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

    const isEntity = client.client_type === 'Company' || client.client_type === 'Trust';
    const advisoryNeeds = Array.isArray(client.advisory_needs) ? client.advisory_needs : [];
    const needsArray = [];
    if (advisoryNeeds.some(n => n.toLowerCase().includes('invest') || n.toLowerCase().includes('offshore'))) needsArray.push('investment');
    if (advisoryNeeds.some(n => n.toLowerCase().includes('risk') || n.toLowerCase().includes('cover'))) needsArray.push('risk_cover');

    const merged = {
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
    if (!localData?.advisor_signature_data) { toast.error('Please sign before sending'); return; }
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

  const handleInvestmentReasonChange = async (investmentId, value) => {
    await base44.entities.Investments.update(investmentId, { reason_for_recommendation: value });
    queryClient.invalidateQueries({ queryKey: ['investments', id] });
  };

  const handleRiskReasonChange = async (riskProductId, value) => {
    await base44.entities.RiskProducts.update(riskProductId, { reason_for_recommendation: value });
    queryClient.invalidateQueries({ queryKey: ['riskProducts', id] });
  };

  const handleMandateToggle = (value) => {
    const docType = value === 'Yes' ? 'Document B' : 'Document A';
    handleFieldChange('mandate_included', value);
    handleFieldChange('output_document_type', docType);
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
  const mandateValue = localData.mandate_included || 'No';
  const displayStatus = localData.proposal_status || (localData.status === 'new' ? 'Pending Review' : localData.status) || '';

  const quoteAttachment = attachments.find(a => a.attachment_type === 'Quote');
  const formAttachment = attachments.find(a => a.attachment_type === 'Application Form');

  const TABS = [
    { key: 'client_details', label: '01 · Client Details' },
    { key: 'recommendations', label: '02 · Recommendations' },
    { key: 'review', label: '03 · Review & Send' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-30 flex flex-col shadow-sm">
        <TopBar advisorName={advisor.name} statusText={localData.reference} />

        {/* Client strip */}
        <div className="bg-navy text-white px-6 py-2 flex items-center justify-between w-full text-xs">
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Client</span><span className="font-semibold">{localData.client_name}</span></div>
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Risk Profile</span><span className="font-medium">{localData.risk_profile || '—'}</span></div>
          <div><span className="text-white/50 text-[9px] uppercase tracking-wider block">Time Horizon</span><span className="font-medium">{localData.time_horizon || '—'}</span></div>
          <div className="max-w-[300px]"><span className="text-white/50 text-[9px] uppercase tracking-wider block">Needs</span><span className="font-medium">{Array.isArray(localData.advisory_needs) && localData.advisory_needs.length > 0 ? localData.advisory_needs.join(', ') : '—'}</span></div>
          <div><span className="font-mono text-[10px] text-white/60">{localData.reference}</span></div>
        </div>

        {/* Tab bar */}
        <div className="bg-card border-b border-border px-4 md:px-6">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-[11px] font-semibold tracking-[.08em] uppercase border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'border-navy text-navy'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.key === 'client_details' && activeTab !== 'client_details' && localData.client_name && (
                  <CheckCircle2 className="w-3 h-3 text-teal opacity-60" />
                )}
                {tab.key === 'recommendations' && activeTab === 'review' && (investments.length > 0 || riskProducts.length > 0) && (
                  <CheckCircle2 className="w-3 h-3 text-teal opacity-60" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6">
        {/* Back to inbox — only shown on recommendations/review tabs as inline link */}
        {activeTab !== 'client_details' && (
          <div className="flex items-center justify-between mb-4">
            <div />
            <button
              onClick={() => navigate('/proposals')}
              className="border border-border text-muted-foreground px-4 py-2 text-xs font-medium tracking-[.06em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to inbox
            </button>
          </div>
        )}

        {/* ── TAB 1: CLIENT DETAILS ── */}
        {activeTab === 'client_details' && (
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => navigate('/proposals')}
                  className="border border-border text-muted-foreground px-4 py-2 text-xs font-medium tracking-[.06em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to inbox
                </button>
              </div>
              <ClientDetailsFormDynamic
                data={localData}
                onChange={handleFieldChange}
                onProceed={() => setActiveTab('recommendations')}
              />
            </div>
          </div>
        )}

        {/* ── TAB 2: RECOMMENDATIONS ── */}
        {activeTab === 'recommendations' && (
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
                          <div key={inv.id || i} className="border border-border rounded-sm p-2.5 bg-background flex flex-col gap-2">
                            <div>
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
                            <div className="border-t border-border pt-2">
                              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Reason for Recommendation</p>
                              <InvestmentReasonField investment={inv} onSave={handleInvestmentReasonChange} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Overall Suitability Rationale</p>
                        <textarea
                          className="border border-border bg-muted text-[11px] text-foreground w-full outline-none p-2 resize-y min-h-[50px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
                          value={localData.investment_rationale || ''}
                          onChange={e => handleFieldChange('investment_rationale', e.target.value)}
                          placeholder="Overall suitability rationale for all investments..."
                        />
                      </div>
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
                          <div key={rp.id || i} className="border border-border rounded-sm p-2.5 bg-background flex flex-col gap-2">
                            <div>
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
                            <div className="border-t border-border pt-2">
                              <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Reason for Recommendation</p>
                              <RiskReasonField riskProduct={rp} onSave={handleRiskReasonChange} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Overall Suitability Rationale</p>
                        <textarea
                          className="border border-border bg-muted text-[11px] text-foreground w-full outline-none p-2 resize-y min-h-[50px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
                          value={localData.risk_cover_rationale || ''}
                          onChange={e => handleFieldChange('risk_cover_rationale', e.target.value)}
                          placeholder="Overall suitability rationale for risk cover..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {investments.length === 0 && riskProducts.length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm mb-3">
                    No investments or risk products added yet.{' '}
                    <button onClick={() => navigate(`/proposal/${id}`)} className="text-ocean hover:underline">Add them from the proposal page.</button>
                  </div>
                )}

                <div className="border border-border bg-card p-4 mb-3">
                  <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2.5">Personalised message to client</div>
                  <Textarea
                    value={localData.personal_message || ''}
                    onChange={e => handleFieldChange('personal_message', e.target.value)}
                    placeholder="e.g. Dear A.B., Based on your answers I have prepared the following recommendation..."
                    className="rounded-sm min-h-[90px] text-[13px] leading-relaxed"
                  />
                </div>

                <div className="max-w-[900px] mx-auto grid grid-cols-2 gap-6 mb-3">
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
                    existingAppFormUrl={localData.app_form_url}
                    onAppFormUploaded={url => handleFieldChange('app_form_url', url)}
                  />
                </div>

                <div className="mt-2">
                  <button
                    onClick={() => setActiveTab('review')}
                    className="w-full bg-navy text-white py-3 text-[11px] font-medium tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
                  >
                    Proceed to Review & Send →
                  </button>
                </div>
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

        {/* ── TAB 3: REVIEW & SEND ── */}
        {activeTab === 'review' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Advisor</label>
                    <Select value={localData.advisor_name || ''} onValueChange={v => handleFieldChange('advisor_name', v)}>
                      <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select advisor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Trevor Fine">Trevor Fine</SelectItem>
                        <SelectItem value="Roger Eskinazi">Roger Eskinazi</SelectItem>
                        <SelectItem value="Malcolm Munsamy">Malcolm Munsamy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Mandate Included</label>
                    <div className="flex gap-2">
                      {['Yes', 'No'].map(opt => (
                        <button key={opt} type="button" onClick={() => handleMandateToggle(opt)}
                          className={`px-3 h-8 text-xs font-medium border rounded-sm transition-all ${
                            mandateValue === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{mandateValue === 'Yes' ? 'Doc B — CDM' : 'Doc A — Disclosure & ROA'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Status</label>
                    <Select value={displayStatus} onValueChange={v => { handleFieldChange('proposal_status', v); handleFieldChange('status', STATUS_MAP[v] || 'new'); }}>
                      <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3-column: Attachments | PDF | Signatures */}
              <div className="grid grid-cols-3 gap-4 items-stretch">
                {/* Attachments */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Attachments</h2>
                  <div className="space-y-3">
                    {[
                      { type: 'Quote', label: 'Quote PDF', attachment: quoteAttachment },
                      { type: 'Application Form', label: 'Application Form', attachment: formAttachment },
                    ].map(({ type, label, attachment }) => (
                      <div key={type}>
                        <p className="text-[10px] font-semibold text-navy uppercase tracking-wide mb-1">{label}</p>
                        <div className="border-2 border-dashed border-border rounded flex items-center justify-between px-3 h-10 hover:border-ocean transition-colors">
                          {attachment ? (
                            <>
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-ocean" />
                                <span className="text-xs font-medium text-navy">Attached</span>
                              </div>
                              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean hover:underline">Download</a>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">No file</span>
                              </div>
                              <label className="text-xs text-ocean hover:underline font-medium cursor-pointer">
                                Upload
                                <input type="file" accept=".pdf" className="hidden" onChange={e => handleAttachmentUpload(e, type)} />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF Document */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">PDF Document</h2>
                  {localData.proposal_pdf_url ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-700" />
                          <div>
                            <p className="text-xs font-semibold text-green-900">PDF Generated</p>
                            <p className="text-[10px] text-green-700">Current version available</p>
                          </div>
                        </div>
                        <a href={localData.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-green-700 text-white rounded-sm text-xs font-medium">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-900">No PDF generated yet.</p>
                    </div>
                  )}
                  <button onClick={handleGeneratePdf}
                    className="w-full bg-navy hover:bg-ocean text-white py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-center gap-2 rounded-sm">
                    <FileText className="w-3.5 h-3.5" />
                    {localData.proposal_pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
                  </button>
                </div>

                {/* Signatures */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Signatures & Distribution</h2>
                  <div className="space-y-2 mb-3">
                    {[
                      { label: 'Advisor signature', signed: !!localData.advisor_signature_data },
                      { label: 'Client signature', signed: !!localData.client_signature_data },
                    ].map(({ label, signed }) => (
                      <div key={label} className="flex items-center justify-between p-2 bg-muted/50 rounded-sm">
                        <div className="flex items-center gap-2">
                          {signed ? <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-border" />}
                          <span className="text-xs text-navy font-medium">{label}</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${signed ? 'text-teal' : 'text-muted-foreground'}`}>
                          {signed ? 'Signed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="w-full bg-ocean hover:bg-sky text-white py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-center gap-2 rounded-sm"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    {hasSig ? 'View / Resend for Signature' : 'Sign & Send to Client'}
                  </button>
                </div>
              </div>
            </div>

            {/* Side panel */}
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
        )}
      </div>
    </div>
  );
}

// Locally-controlled textarea for investment reason — debounced save
function InvestmentReasonField({ investment, onSave }) {
  const [value, setValue] = useState(investment.reason_for_recommendation || '');
  const debouncedSave = useCallback(
    debounce((v) => onSave(investment.id, v), 1000),
    [investment.id]
  );
  return (
    <textarea
      className="border border-border bg-muted text-[10px] text-foreground w-full outline-none p-1.5 resize-y min-h-[48px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
      value={value}
      onChange={e => { setValue(e.target.value); debouncedSave(e.target.value); }}
      placeholder="Why is this recommended for this client..."
    />
  );
}

// Locally-controlled textarea for risk product reason — debounced save
function RiskReasonField({ riskProduct, onSave }) {
  const [value, setValue] = useState(riskProduct.reason_for_recommendation || '');
  const debouncedSave = useCallback(
    debounce((v) => onSave(riskProduct.id, v), 1000),
    [riskProduct.id]
  );
  return (
    <textarea
      className="border border-border bg-muted text-[10px] text-foreground w-full outline-none p-1.5 resize-y min-h-[48px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
      value={value}
      onChange={e => { setValue(e.target.value); debouncedSave(e.target.value); }}
      placeholder="Why is this recommended for this client..."
    />
  );
}