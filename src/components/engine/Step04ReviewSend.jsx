import React, { useState } from 'react';
import {
  CheckCircle2, Download, FileText, Upload, AlertTriangle,
  Copy, Mail, Lock, Clock, RefreshCw,
} from 'lucide-react';
import SignaturePad from '@/components/engine/SignaturePad';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const fmtDT = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return [
      String(d.getDate()).padStart(2, '0'),
      String(d.getMonth() + 1).padStart(2, '0'),
      d.getFullYear(),
    ].join('-') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch { return iso; }
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return [
      String(d.getDate()).padStart(2, '0'),
      String(d.getMonth() + 1).padStart(2, '0'),
      d.getFullYear(),
    ].join('-');
  } catch { return iso; }
};

function AttachmentCell({ type, attachment, onAttachmentUpload }) {
  return (
    <div className="border border-border bg-background flex items-center justify-center gap-1.5 px-2 py-1">
      {attachment ? (
        <>
          <FileText className="w-2.5 h-2.5 text-ocean shrink-0" />
          <a href={attachment.file_url} target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-ocean hover:underline font-medium">View</a>
        </>
      ) : (
        <>
          <Upload className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
          <label className="text-[9px] text-ocean hover:underline font-medium cursor-pointer">
            Upload
            <input type="file" accept=".pdf" className="hidden" onChange={e => onAttachmentUpload(e, type)} />
          </label>
        </>
      )}
    </div>
  );
}

function LockedOverlay({ message }) {
  return (
    <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-1.5 rounded-lg z-10">
      <Lock className="w-4 h-4 text-muted-foreground" />
      <p className="text-[10px] text-muted-foreground text-center px-4">{message}</p>
    </div>
  );
}

const STATUS_CONFIG = {
  'In Progress':              { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'In Progress' },
  'Outdated':                 { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Outdated' },
  'PDF Ready':                { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'PDF Ready' },
  'Sent':                     { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Sent' },
  'Awaiting Client Signature':{ bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Awaiting Signature' },
  'Signed':                   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Signed' },
};

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onAttachmentUpload, onFieldChange,
  proposalId,
}) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const hasPdf = !!data.proposal_pdf_url;
  const isOutdated = data.status === 'Outdated';
  const isSigned = data.status === 'Signed';
  const pdfReady = hasPdf && !isOutdated;
  const hasSig = !!data.advisor_signature_data;
  const mandateIncluded = data.mandate_included === 'Yes';
  const noAnnexures = !data.include_annexure_A && !data.include_annexure_B && !data.include_annexure_C;
  const showMandateWarning = mandateIncluded && noAnnexures;

  const statusConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG['In Progress'];

  const handleGeneratePdf = async () => {
    setGenerating(true);
    await onGeneratePdf();
    const now = new Date().toISOString();
    await base44.entities.Proposal.update(proposalId, {
      pdf_generated_at: now,
      status: 'PDF Ready',
    });
    onFieldChange('pdf_generated_at', now);
    onFieldChange('status', 'PDF Ready');
    setGenerating(false);
    toast.success('PDF generated successfully');
  };

  const generateToken = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

  const prepareToken = async () => {
    if (!pdfReady) {
      toast.error('Please regenerate the PDF before sending.');
      return null;
    }
    const token = generateToken();
    const now = new Date().toISOString();
    await base44.entities.Proposal.update(proposalId, {
      signing_token: token,
      status: 'Sent',
      sent_at: now,
      reminder_sent: false,
    });
    onFieldChange('signing_token', token);
    onFieldChange('status', 'Sent');
    onFieldChange('sent_at', now);
    onFieldChange('reminder_sent', false);
    const url = `${window.location.origin}/sign-proposal/${token}`;
    return { token, url };
  };

  const handleCopyLink = async () => {
    if (!pdfReady) { toast.error('Regenerate the PDF before sending.'); return; }
    setSending(true);
    const result = await prepareToken();
    if (!result) { setSending(false); return; }
    await navigator.clipboard.writeText(result.url);
    setLinkCopied(true);
    setSending(false);
    toast.success('Signing link copied to clipboard');
  };

  const handleEmailClient = async () => {
    if (!pdfReady) { toast.error('Regenerate the PDF before sending.'); return; }
    if (!data.client_email) { toast.error('No client email address found on this proposal'); return; }
    setSending(true);
    const result = await prepareToken();
    if (!result) { setSending(false); return; }
    const firstName = (data.client_name || '').split(' ')[0] || 'Client';
    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: data.client_email,
      subject: 'Your Financial Strategy Report — Action Required',
      body: `Dear ${firstName},\n\nPlease find your Financial Strategy & Recommendation Report prepared by Wealthworks.\n\nTo review and sign your document, please click the link below:\n\n${result.url}\n\nThis link is unique to you. Please do not share it.\n\nIf you have any questions, please contact your advisor directly.\n\nKind regards,\nThe Wealthworks Team`,
    });
    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: 'tfine1969@gmail.com',
      subject: `[CC] Signing link sent to ${data.client_name || ''} — ${data.reference || ''}`,
      body: `A signing link has been sent to ${data.client_email}.\n\nClient: ${data.client_name}\nReference: ${data.reference}\nSigning URL: ${result.url}`,
    });
    setEmailSent(true);
    setSending(false);
    toast.success(`Email sent to ${data.client_email}`);
  };

  const allProducts = [
    ...investments.map(i => ({ id: i.id, label: `${i.provider}${i.product_type ? ` — ${i.product_type}` : ''}`, color: 'text-ocean' })),
    ...riskProducts.map(r => ({ id: r.id, label: `${r.provider}${(r._covers || []).length ? ` — ${r._covers.map(c => c.cover_type).join(', ')}` : ''}`, color: 'text-teal' })),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Attachments + Advisor Signature (side by side, above the sequential containers) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attachments */}
        <div className="bg-card border border-border rounded-lg p-3">
          <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-2">Attachments</h2>
          {allProducts.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">No products added yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 items-center">
                <div />
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Quote PDF</p>
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">App Form</p>
                <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Support Doc</p>
              </div>
              {allProducts.map(({ id, label, color }) => {
                const quoteKey = `Quote::${id}`;
                const formKey = `Application Form::${id}`;
                const supportKey = `Supporting Doc::${id}`;
                return (
                  <div key={id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 items-center">
                    <p className={`text-[9px] font-semibold ${color} truncate pr-1`}>{label}</p>
                    <AttachmentCell type={quoteKey} attachment={attachments.find(a => a.attachment_type === quoteKey)} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentCell type={formKey} attachment={attachments.find(a => a.attachment_type === formKey)} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentCell type={supportKey} attachment={attachments.find(a => a.attachment_type === supportKey)} onAttachmentUpload={onAttachmentUpload} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Advisor Signature */}
        <div>
          <SignaturePad
            advisorKey={data.advisor_key || 'trevor'}
            signDate={data.sign_date}
            onSignDateChange={(date) => onFieldChange('sign_date', date)}
            onSignatureChange={(sigData, sigType) => {
              onFieldChange('advisor_signature_data', sigData);
              onFieldChange('advisor_signature_type', sigType);
            }}
            initialData={data.advisor_signature_data}
            initialType={data.advisor_signature_type}
          />
        </div>
      </div>

      {/* ── CONTAINER 1 — PROPOSAL STATUS ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-3">Proposal Status</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Last updated: {fmtDT(data.updated_date)}
          </span>
        </div>
        {isOutdated && (
          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-sm px-2.5 py-2">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            Changes have been made. Regenerate the PDF before proceeding.
          </div>
        )}
      </div>

      {/* ── CONTAINER 2 — STEP 1: GENERATE / UPDATE PDF ───────────────── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-3">Step 1 — Generate / Update PDF</h2>

        {showMandateWarning && (
          <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-sm mb-3">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-800">Mandate is included but no annexure has been selected. At least one annexure must be included.</p>
          </div>
        )}

        {isOutdated && (
          <div className="flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 rounded-sm mb-3">
            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-red-700">PDF is outdated. You must regenerate before sending or downloading.</p>
          </div>
        )}

        <button
          onClick={handleGeneratePdf}
          disabled={generating}
          className={`w-full py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-sm transition-colors ${
            isOutdated
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-navy hover:bg-ocean text-white'
          } disabled:opacity-50`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating…' : hasPdf ? 'Regenerate PDF' : 'Generate PDF'}
        </button>
      </div>

      {/* ── CONTAINER 3 — STEP 2: PDF DOCUMENT ───────────────────────── */}
      <div className={`bg-card border border-border rounded-lg p-4 relative ${!hasPdf ? 'opacity-60' : ''}`}>
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-3">Step 2 — PDF Document</h2>

        {hasPdf ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-sm px-3 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-green-900">PDF Ready — Current version</p>
                {data.pdf_generated_at && (
                  <p className="text-[9px] text-green-700">Generated: {fmtDT(data.pdf_generated_at)}</p>
                )}
              </div>
            </div>
            <a
              href={data.proposal_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-sm text-[9px] font-semibold hover:bg-green-800 transition-colors"
            >
              <Download className="w-2.5 h-2.5" /> Download
            </a>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-sm px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">No PDF generated yet. Use Step 1 above.</p>
          </div>
        )}
      </div>

      {/* ── CONTAINER 4 — STEP 3: SEND FOR SIGNATURE ─────────────────── */}
      <div className={`bg-card border border-border rounded-lg p-4 relative ${!pdfReady ? 'opacity-60' : ''}`}>
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-3">Step 3 — Send for Signature</h2>

        {!pdfReady && (
          <LockedOverlay message="Regenerate the PDF first to continue." />
        )}

        {/* Signature status */}
        <div className="space-y-1 mb-3">
          {[
            { label: 'Advisor signature', signed: !!data.advisor_signature_data },
            { label: 'Client signature',  signed: !!data.client_signature },
          ].map(({ label, signed }) => (
            <div key={label} className="flex items-center justify-between px-2.5 py-1.5 bg-muted/50 rounded-sm">
              <div className="flex items-center gap-1.5">
                {signed
                  ? <CheckCircle2 className="w-3 h-3 text-teal" />
                  : <div className="w-3 h-3 rounded-full border-2 border-border" />}
                <span className="text-[10px] text-navy font-medium">{label}</span>
              </div>
              <span className={`text-[9px] font-semibold ${signed ? 'text-teal' : 'text-muted-foreground'}`}>
                {signed ? '✓ Signed' : '○ Pending'}
              </span>
            </div>
          ))}
        </div>

        {pdfReady && !hasSig && (
          <p className="text-[9px] text-muted-foreground text-center mb-3">Add your advisor signature above to enable sending.</p>
        )}

        {/* Send buttons — only when PDF ready and advisor has signed */}
        {pdfReady && hasSig && (
          <div className="space-y-2 mb-3">
            <button
              onClick={handleCopyLink}
              disabled={sending || isSigned}
              className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded-sm transition-colors bg-ocean hover:bg-sky text-white disabled:opacity-50"
            >
              <Copy className="w-3 h-3" />
              {linkCopied ? 'Link Copied ✓' : 'Copy Signing Link'}
            </button>
            <button
              onClick={handleEmailClient}
              disabled={sending || isSigned}
              className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded-sm transition-colors bg-gold hover:bg-gold/90 text-white disabled:opacity-50"
            >
              <Mail className="w-3 h-3" />
              {emailSent ? 'Email Sent ✓' : 'Email to Client'}
            </button>
          </div>
        )}

        {/* Status info */}
        {data.status === 'Awaiting Client Signature' && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-sm px-2.5 py-2">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-amber-900">⏳ Awaiting client signature</p>
              {data.sent_at && (
                <p className="text-[9px] text-amber-700">Link sent: {fmtDT(data.sent_at)}</p>
              )}
            </div>
          </div>
        )}

        {isSigned && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-sm px-2.5 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-700 shrink-0" />
            <p className="text-[10px] font-semibold text-green-900">
              ✓ Signed by client{data.signed_at ? ` on ${fmtDate(data.signed_at)}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── CONTAINER 5 — SIGNED DOCUMENT ────────────────────────────── */}
      {isSigned && data.signed_pdf_url && (
        <div className="bg-card border-2 border-green-300 rounded-lg p-4">
          <h2 className="text-[9px] font-bold text-green-800 uppercase tracking-wider mb-3">Signed Document</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-green-900">✓ Signed by {data.client_name || 'client'}</p>
              {data.signed_at && (
                <p className="text-[9px] text-green-700">Signed on: {fmtDate(data.signed_at)}</p>
              )}
            </div>
            <a
              href={data.signed_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-sm text-[9px] font-semibold hover:bg-green-800 transition-colors"
            >
              <Download className="w-2.5 h-2.5" /> View / Download Signed PDF
            </a>
          </div>
        </div>
      )}

    </div>
  );
}