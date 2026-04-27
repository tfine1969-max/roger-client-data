import React, { useState } from 'react';
import { CheckCircle2, Download, FileText, Upload, AlertTriangle, Copy, Mail, Lock, Clock, RefreshCw } from 'lucide-react';
import SignaturePad from '@/components/engine/SignaturePad';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  } catch { return ''; }
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ''; }
};

function AttachmentCell({ type, attachment, onAttachmentUpload }) {
  return (
    <div className="border border-slate-300 bg-white flex items-center justify-center gap-1.5 px-2 py-1">
      {attachment ? (
        <>
          <FileText className="w-2.5 h-2.5 text-sky-600 shrink-0" />
          <a href={attachment.file_url} target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-sky-600 hover:underline font-medium">View</a>
        </>
      ) : (
        <>
          <Upload className="w-2.5 h-2.5 text-slate-500 shrink-0" />
          <label className="text-[9px] text-sky-600 hover:underline font-medium cursor-pointer">
            Upload
            <input type="file" accept=".pdf" className="hidden" onChange={e => onAttachmentUpload(e, type)} />
          </label>
        </>
      )}
    </div>
  );
}

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onAttachmentUpload, onFieldChange,
  proposalId,
}) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Locking logic
  const advisorSigned = !!data.advisor_signature_data;
  const pdfGenerated = !!data.pdf_generated_at;
  const pdfCurrent = data.status !== 'Outdated' && pdfGenerated;
  const clientSigned = data.status === 'Signed';

  const stepLocked = {
    attachments: false,
    signature: false,
    generatePdf: !advisorSigned,
    sendClient: !pdfCurrent,
    documents: !pdfGenerated,
  };

  // Product list for attachments
  const allProducts = [
    ...investments.map(i => ({ id: i.id, label: `${i.provider}${i.product_type ? ` — ${i.product_type}` : ''}`, color: 'text-sky-600' })),
    ...riskProducts.map(r => ({ id: r.id, label: `${r.provider}`, color: 'text-teal-700' })),
  ];

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
    if (!pdfCurrent) {
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
    if (!pdfCurrent) { toast.error('Regenerate the PDF before sending.'); return; }
    setSending(true);
    const result = await prepareToken();
    if (!result) { setSending(false); return; }
    await navigator.clipboard.writeText(result.url);
    setSending(false);
    toast.success('Signing link copied to clipboard');
  };

  const handleEmailClient = async () => {
    if (!pdfCurrent) { toast.error('Regenerate the PDF before sending.'); return; }
    if (!data.client_email) { toast.error('No client email address found'); return; }
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
    setSending(false);
    toast.success(`Email sent to ${data.client_email}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* STEP 1 — ATTACHMENTS */}
      <div className={`bg-white border border-slate-200 rounded-lg p-7 shadow-sm ${stepLocked.attachments ? 'opacity-45 pointer-events-none' : ''}`}>
        <h2 className="text-[11px] font-bold text-navy uppercase tracking-widest mb-5 pb-3 border-b border-slate-200">Step 1 — Attachments</h2>

        {allProducts.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-4">No products added yet.</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center">
                <div />
                <p className="text-[9px] font-bold text-slate-600 uppercase text-center">Quote PDF</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase text-center">App Form</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase text-center">Support Doc</p>
                <div />
              </div>
              {allProducts.map(({ id, label, color }) => {
                const quoteKey = `Quote::${id}`;
                const formKey = `Application Form::${id}`;
                const supportKey = `Supporting Doc::${id}`;
                return (
                  <div key={id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center">
                    <p className={`text-[10px] font-semibold ${color} truncate`}>{label}</p>
                    <AttachmentCell type={quoteKey} attachment={attachments.find(a => a.attachment_type === quoteKey)} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentCell type={formKey} attachment={attachments.find(a => a.attachment_type === formKey)} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentCell type={supportKey} attachment={attachments.find(a => a.attachment_type === supportKey)} onAttachmentUpload={onAttachmentUpload} />
                    <div />
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-600 italic">Uploaded documents will be appended to the PDF and require client initials on each page.</p>
          </>
        )}
      </div>

      {/* STEP 2 — ADVISOR SIGNATURE */}
      <div className={`bg-white border border-slate-200 rounded-lg p-7 shadow-sm ${stepLocked.signature ? 'opacity-45 pointer-events-none' : ''}`}>
        <h2 className="text-[11px] font-bold text-navy uppercase tracking-widest mb-1 pb-3 border-b border-slate-200">Step 2 — Advisor Signature</h2>
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Sign to confirm this recommendation is appropriate under FAIS.</span>
        </p>

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

        {advisorSigned && (
          <div className="mt-5 bg-green-50 border border-green-300 rounded-md px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span className="text-[11px] font-bold text-green-800">✓ SIGNATURE CAPTURED — READY TO GENERATE</span>
          </div>
        )}
      </div>

      {/* STEP 3 — GENERATE PDF */}
      <div className={`bg-white border border-slate-200 rounded-lg p-7 shadow-sm ${stepLocked.generatePdf ? 'opacity-45 pointer-events-none' : ''}`}>
        <h2 className="text-[11px] font-bold text-navy uppercase tracking-widest mb-4 pb-3 border-b border-slate-200">Step 3 — Generate PDF</h2>

        {stepLocked.generatePdf && (
          <p className="text-[10px] text-slate-600 mb-4">Complete Step 2 above to generate the PDF.</p>
        )}

        <button
          onClick={handleGeneratePdf}
          disabled={stepLocked.generatePdf || generating}
          className={`w-full py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-md transition-colors ${
            stepLocked.generatePdf
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-navy hover:bg-sky-900 text-white'
          } disabled:opacity-60`}
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating…' : pdfGenerated ? 'Regenerate PDF' : 'Generate PDF'}
        </button>

        {data.status === 'Outdated' && (
          <div className="mt-4 bg-red-50 border border-red-300 rounded-md px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-700 font-medium">Changes detected — regenerate PDF before sending.</p>
          </div>
        )}

        {pdfCurrent && (
          <div className="mt-4 bg-green-50 border border-green-300 rounded-md px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span className="text-[10px] text-green-800 font-medium">✓ PDF generated — {formatDateTime(data.pdf_generated_at)}</span>
          </div>
        )}
      </div>

      {/* STEP 4 — SEND TO CLIENT */}
      <div className={`bg-white border border-slate-200 rounded-lg p-7 shadow-sm ${stepLocked.sendClient ? 'opacity-45 pointer-events-none' : ''}`}>
        <h2 className="text-[11px] font-bold text-navy uppercase tracking-widest mb-4 pb-3 border-b border-slate-200">Step 4 — Send to Client</h2>

        {stepLocked.sendClient && (
          <p className="text-[10px] text-slate-600 mb-4">Generate a current PDF in Step 3 to send to the client.</p>
        )}

        {/* Signature status */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-md border border-slate-300">
            <span className="text-[10px] font-medium text-slate-700">Advisor signature</span>
            {advisorSigned
              ? <span className="text-[10px] font-bold text-green-700">✓ Signed</span>
              : <span className="text-[10px] font-bold text-amber-700">○ Pending</span>
            }
          </div>
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-md border border-slate-300">
            <span className="text-[10px] font-medium text-slate-700">Client signature</span>
            {clientSigned
              ? <span className="text-[10px] font-bold text-green-700">✓ Signed</span>
              : <span className="text-[10px] font-bold text-amber-700">○ Pending</span>
            }
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 mb-5">
          <button
            onClick={handleCopyLink}
            disabled={!pdfCurrent || sending}
            className={`w-full py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-md transition-colors ${
              pdfCurrent
                ? 'bg-navy hover:bg-sky-900 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Copy className="w-4 h-4" />
            Copy Signing Link
          </button>
          <button
            onClick={handleEmailClient}
            disabled={!pdfCurrent || sending}
            className={`w-full py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-md transition-colors ${
              pdfCurrent
                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email to Client
          </button>
        </div>

        {/* Status displays */}
        {data.status === 'Sent' && data.sent_at && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
            <span className="text-[10px] font-medium text-blue-800">Sent on: {formatDateTime(data.sent_at)}</span>
          </div>
        )}

        {data.status === 'Awaiting Client Signature' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[10px] font-medium text-amber-800">⏳ Awaiting client signature</span>
          </div>
        )}
      </div>

      {/* STEP 5 — DOCUMENTS */}
      <div className={`bg-white border border-slate-200 rounded-lg p-7 shadow-sm ${stepLocked.documents ? 'opacity-45 pointer-events-none' : ''}`}>
        <h2 className="text-[11px] font-bold text-navy uppercase tracking-widest mb-4 pb-3 border-b border-slate-200">Step 5 — Documents</h2>

        {/* PDF Document */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-3">PDF Document</p>
          {pdfGenerated ? (
            <div className="bg-green-50 border border-green-300 rounded-md px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-green-900">✓ PDF Ready — Current version</p>
                  {data.pdf_generated_at && (
                    <p className="text-[9px] text-green-700">Generated: {formatDateTime(data.pdf_generated_at)}</p>
                  )}
                </div>
              </div>
              {data.proposal_pdf_url && (
                <a href={data.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-md text-[9px] font-bold hover:bg-green-800 transition-colors shrink-0">
                  <Download className="w-3 h-3" /> Download
                </a>
              )}
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-300 rounded-md px-4 py-3">
              <p className="text-[10px] text-slate-600">No PDF generated yet — complete Step 3 above.</p>
            </div>
          )}
        </div>

        {/* Signed Document */}
        {clientSigned && data.signed_pdf_url && (
          <>
            <div className="border-t border-slate-200 my-5" />
            <div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-3">Signed Document</p>
              <div className="bg-green-50 border-2 border-green-300 rounded-md px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-green-900">✓ Signed by {data.client_name || 'client'}</p>
                  {data.signed_at && (
                    <p className="text-[9px] text-green-700">Signed on: {formatDate(data.signed_at)}</p>
                  )}
                </div>
                <a href={data.signed_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-md text-[9px] font-bold hover:bg-green-800 transition-colors shrink-0">
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}