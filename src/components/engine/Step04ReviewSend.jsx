import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Download, FileText, FileSignature, Upload, AlertTriangle } from 'lucide-react';
import SignaturePad from '@/components/engine/SignaturePad';

// Fingerprint of current products — changes invalidate the PDF
function productFingerprint(investments, riskProducts) {
  const invStr = investments.map(i => `${i.id}:${i.updated_date}`).join('|');
  const rpStr = riskProducts.map(r => `${r.id}:${r.updated_date}`).join('|');
  return `${invStr}__${rpStr}`;
}

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

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onSend, onAttachmentUpload, onFieldChange,
  isSending, proposalId,
}) {
  const hasSig = !!data.advisor_signature_data;
  const hasPdf = !!data.proposal_pdf_url;

  // Track whether products changed after last PDF generation
  const [pdfFingerprint, setPdfFingerprint] = useState(() =>
    hasPdf ? productFingerprint(investments, riskProducts) : null
  );
  const currentFingerprint = productFingerprint(investments, riskProducts);
  const pdfOutdated = hasPdf && pdfFingerprint && pdfFingerprint !== currentFingerprint;

  // Signing link — cleared when outdated (need to re-finalise)
  const [signingLink, setSigningLink] = useState(
    (data.status === 'sent' && proposalId && !pdfOutdated)
      ? `${window.location.origin}/sign?id=${proposalId}` : null
  );

  // When PDF is regenerated, reset fingerprint and clear old link
  const handleGeneratePdf = () => {
    onGeneratePdf();
    setPdfFingerprint(currentFingerprint);
    setSigningLink(null); // must re-finalise after regenerating
  };

  const handleSend = async () => {
    await onSend();
    if (proposalId) setSigningLink(`${window.location.origin}/sign?id=${proposalId}`);
  };

  const allProducts = [
    ...investments.map(i => ({ id: i.id, label: `${i.provider}${i.product_type ? ` — ${i.product_type}` : ''}`, color: 'text-ocean' })),
    ...riskProducts.map(r => ({ id: r.id, label: `${r.provider}${(r._covers || []).length ? ` — ${r._covers.map(c => c.cover_type).join(', ')}` : ''}`, color: 'text-teal' })),
  ];

  return (
    <div className="grid grid-cols-2 gap-4">

      {/* TOP-LEFT: Attachments */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-2">Attachments</h2>
        {allProducts.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No products added yet.</p>
        ) : (
          <div className="space-y-2 flex-1">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 items-center">
              <div />
              <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Quote PDF</p>
              <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">App Form</p>
            </div>
            {allProducts.map(({ id, label, color }) => {
              const quoteKey = `Quote::${id}`;
              const formKey = `Application Form::${id}`;
              return (
                <div key={id} className="grid grid-cols-[1fr_1fr_1fr] gap-1 items-center">
                  <p className={`text-[9px] font-semibold ${color} truncate pr-1`}>{label}</p>
                  <AttachmentCell
                    type={quoteKey}
                    attachment={attachments.find(a => a.attachment_type === quoteKey)}
                    onAttachmentUpload={onAttachmentUpload}
                  />
                  <AttachmentCell
                    type={formKey}
                    attachment={attachments.find(a => a.attachment_type === formKey)}
                    onAttachmentUpload={onAttachmentUpload}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Advisor Signature */}
      <div className="flex flex-col">
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

      {/* BOTTOM-LEFT: Distribution */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-2">Distribution</h2>

        {/* Signature status rows */}
        <div className="space-y-1 mb-3">
          {[
            { label: 'Advisor signature', signed: !!data.advisor_signature_data },
            { label: 'Client signature', signed: !!data.client_signature_data },
          ].map(({ label, signed }) => (
            <div key={label} className="flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded-sm">
              <div className="flex items-center gap-1.5">
                {signed
                  ? <CheckCircle2 className="w-3 h-3 text-teal" />
                  : <div className="w-3 h-3 rounded-full border-2 border-border" />}
                <span className="text-[10px] text-navy font-medium">{label}</span>
              </div>
              <span className={`text-[9px] font-semibold ${signed ? 'text-teal' : 'text-muted-foreground'}`}>
                {signed ? 'Signed' : 'Pending'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleSend}
          disabled={!hasSig || isSending || pdfOutdated}
          className={`w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded-sm transition-colors mb-2 ${
            hasSig && !pdfOutdated ? 'bg-gold text-white hover:bg-gold/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <FileSignature className="w-3 h-3" />
          {isSending ? 'Generating...' : 'Finalise & Get Signing Link'}
        </button>

        {!hasSig && (
          <p className="text-[9px] text-muted-foreground text-center mb-2">Sign above to proceed</p>
        )}

        {signingLink && !pdfOutdated && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-sm">
            <p className="text-[8px] font-bold text-green-800 uppercase tracking-wide mb-1">Client Signing Link</p>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={signingLink}
                className="flex-1 text-[9px] text-navy bg-white border border-border px-1.5 py-1 rounded-sm outline-none truncate"
              />
              <button
                onClick={() => navigator.clipboard.writeText(signingLink)}
                className="text-[9px] px-2.5 py-1 bg-navy text-white rounded-sm whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {signingLink && pdfOutdated && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-800">This link is no longer valid — regenerate and finalise again.</p>
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT: PDF Document */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
        <h2 className="text-[9px] font-bold text-navy uppercase tracking-wider mb-2">PDF Document</h2>
        <div className="flex-1">
          {pdfOutdated ? (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-sm px-2.5 py-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-amber-900">PDF is outdated</p>
                <p className="text-[9px] text-amber-700">Products have changed — regenerate before sending.</p>
              </div>
            </div>
          ) : hasPdf ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-sm px-2.5 py-2 mb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-green-700" />
                <div>
                  <p className="text-[10px] font-semibold text-green-900">PDF Ready</p>
                  <p className="text-[9px] text-green-700">Current version</p>
                </div>
              </div>
              <a href={data.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-green-700 text-white rounded-sm text-[9px] font-medium">
                <Download className="w-2.5 h-2.5" /> Download
              </a>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-sm px-2.5 py-2 mb-2">
              <p className="text-[10px] text-blue-900">No PDF generated yet.</p>
            </div>
          )}
        </div>

        <button
          onClick={handleGeneratePdf}
          className={`w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded-sm mt-auto transition-colors ${
            pdfOutdated ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-navy hover:bg-ocean text-white'
          }`}
        >
          <FileText className="w-3 h-3" />
          {hasPdf ? 'Regenerate PDF' : 'Generate PDF'}
        </button>
      </div>

    </div>
  );
}