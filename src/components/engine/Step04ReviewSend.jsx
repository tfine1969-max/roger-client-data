import React, { useState } from 'react';
import { CheckCircle2, Download, FileText, FileSignature, Upload } from 'lucide-react';
import SignaturePad from '@/components/engine/SignaturePad';

function AttachmentRow({ type, label, attachment, onAttachmentUpload }) {
  return (
    <div className="flex items-center justify-between border border-border rounded-sm px-2 h-7 bg-background">
      <div className="flex items-center gap-1">
        {attachment
          ? <FileText className="w-3 h-3 text-ocean" />
          : <Upload className="w-3 h-3 text-muted-foreground" />}
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </div>
      {attachment ? (
        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer"
          className="text-[9px] text-ocean hover:underline font-medium">View</a>
      ) : (
        <label className="text-[9px] text-ocean hover:underline font-medium cursor-pointer">
          Upload
          <input type="file" accept=".pdf" className="hidden" onChange={e => onAttachmentUpload(e, type)} />
        </label>
      )}
    </div>
  );
}

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onSend, onAttachmentUpload, onFieldChange,
  isSending, proposalId,
}) {
  const [signingLinkLocal, setSigningLinkLocal] = useState(
    data.status === 'sent' && proposalId ? `${window.location.origin}/sign?id=${proposalId}` : null
  );
  const hasSig = !!data.advisor_signature_data;

  const handleSend = async () => {
    await onSend();
    if (proposalId) {
      setSigningLinkLocal(`${window.location.origin}/sign?id=${proposalId}`);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">

      {/* LEFT: Attachments */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
        <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Attachments</h2>
        <div className="space-y-2 flex-1">
          {investments.map((inv) => {
            const label = `${inv.provider}${inv.product_type ? ` — ${inv.product_type}` : ''}`;
            const quoteKey = `Quote::${inv.id}`;
            const formKey = `Application Form::${inv.id}`;
            return (
              <div key={inv.id}>
                <p className="text-[9px] font-bold text-ocean uppercase tracking-wider border-b border-border pb-0.5 mb-1">{label}</p>
                <div className="space-y-1">
                  <AttachmentRow type={quoteKey} label="Quote PDF" attachment={attachments.find(a => a.attachment_type === quoteKey)} onAttachmentUpload={onAttachmentUpload} />
                  <AttachmentRow type={formKey} label="Application Form" attachment={attachments.find(a => a.attachment_type === formKey)} onAttachmentUpload={onAttachmentUpload} />
                </div>
              </div>
            );
          })}
          {riskProducts.map((rp) => {
            const label = `${rp.provider}${(rp._covers || []).length ? ` — ${rp._covers.map(c => c.cover_type).join(', ')}` : ''}`;
            const quoteKey = `Quote::${rp.id}`;
            const formKey = `Application Form::${rp.id}`;
            return (
              <div key={rp.id}>
                <p className="text-[9px] font-bold text-teal uppercase tracking-wider border-b border-border pb-0.5 mb-1">{label}</p>
                <div className="space-y-1">
                  <AttachmentRow type={quoteKey} label="Quote PDF" attachment={attachments.find(a => a.attachment_type === quoteKey)} onAttachmentUpload={onAttachmentUpload} />
                  <AttachmentRow type={formKey} label="Application Form" attachment={attachments.find(a => a.attachment_type === formKey)} onAttachmentUpload={onAttachmentUpload} />
                </div>
              </div>
            );
          })}
          {investments.length === 0 && riskProducts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No products added yet.</p>
          )}
        </div>
      </div>

      {/* RIGHT: Signature + PDF + Distribution stacked */}
      <div className="flex flex-col gap-3">

        {/* Signature pad */}
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

        {/* PDF + Distribution side by side */}
        <div className="grid grid-cols-2 gap-3">

          {/* PDF */}
          <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">PDF Document</h2>
            {data.proposal_pdf_url ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-sm px-2 py-1.5 mb-2">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-green-700" />
                  <p className="text-[9px] font-semibold text-green-900">PDF Ready</p>
                </div>
                <a href={data.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-green-700 text-white rounded-sm text-[9px] font-medium">
                  <Download className="w-2.5 h-2.5" /> Download
                </a>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-sm px-2 py-1.5 mb-2">
                <p className="text-[9px] text-blue-900">No PDF yet.</p>
              </div>
            )}
            <button onClick={onGeneratePdf}
              className="w-full bg-navy hover:bg-ocean text-white py-1.5 text-[9px] font-medium uppercase tracking-wide flex items-center justify-center gap-1 rounded-sm mt-auto">
              <FileText className="w-3 h-3" />
              {data.proposal_pdf_url ? 'Regenerate' : 'Generate PDF'}
            </button>
          </div>

          {/* Signatures & Distribution */}
          <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
            <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Distribution</h2>
            <div className="space-y-1 mb-2 flex-1">
              {[
                { label: 'Advisor signature', signed: !!data.advisor_signature_data },
                { label: 'Client signature', signed: !!data.client_signature_data },
              ].map(({ label, signed }) => (
                <div key={label} className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded-sm">
                  <div className="flex items-center gap-1.5">
                    {signed
                      ? <CheckCircle2 className="w-3 h-3 text-teal" />
                      : <div className="w-3 h-3 rounded-full border-2 border-border" />}
                    <span className="text-[9px] text-navy font-medium">{label}</span>
                  </div>
                  <span className={`text-[9px] font-semibold ${signed ? 'text-teal' : 'text-muted-foreground'}`}>
                    {signed ? 'Signed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSend}
              disabled={!hasSig || isSending}
              className={`w-full py-1.5 text-[9px] font-medium uppercase tracking-wide flex items-center justify-center gap-1 rounded-sm transition-colors mt-auto ${
                hasSig ? 'bg-gold text-white hover:bg-gold/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <FileSignature className="w-3 h-3" />
              {isSending ? 'Generating...' : 'Finalise & Get Link'}
            </button>
            {!hasSig && <p className="text-[9px] text-muted-foreground text-center mt-1">Sign above first</p>}
          </div>
        </div>

        {/* Signing link — shown after finalise */}
        {signingLinkLocal && (
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-sm">
            <p className="text-[9px] font-semibold text-green-800 uppercase tracking-wide mb-1">Client Signing Link — share with client</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={signingLinkLocal}
                className="flex-1 text-[10px] text-navy bg-white border border-border px-2 py-1 rounded-sm outline-none truncate"
              />
              <button
                onClick={() => navigator.clipboard.writeText(signingLinkLocal)}
                className="text-[9px] px-2 py-1 bg-navy text-white rounded-sm whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}