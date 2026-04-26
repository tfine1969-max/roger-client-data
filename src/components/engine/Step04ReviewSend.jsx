import React from 'react';
import { CheckCircle2, Download, FileText, FileSignature, Upload } from 'lucide-react';
import SignaturePad from '@/components/engine/SignaturePad';

function AttachmentRow({ type, label, attachment, onAttachmentUpload }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="border-2 border-dashed border-border rounded flex items-center justify-between px-2 h-9 hover:border-ocean transition-colors">
        {attachment ? (
          <>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-ocean" />
              <span className="text-xs font-medium text-navy">Attached</span>
            </div>
            <a href={attachment.file_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-ocean hover:underline">View</a>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Upload className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">No file</span>
            </div>
            <label className="text-xs text-ocean hover:underline font-medium cursor-pointer">
              Upload
              <input type="file" accept=".pdf" className="hidden"
                onChange={e => onAttachmentUpload(e, type)} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onSend, onAttachmentUpload, onFieldChange,
  isSending,
}) {
  const hasSig = !!data.advisor_signature_data;

  return (
    <div className="space-y-4">
      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-6 items-stretch">

        {/* TOP-LEFT: Attachments */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
          <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Attachments</h2>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px]">

            {investments.map((inv) => {
              const providerLabel = `${inv.provider}${inv.product_type ? ` — ${inv.product_type}` : ''}`;
              const quoteKey = `Quote::${inv.id}`;
              const formKey = `Application Form::${inv.id}`;
              const quoteAtt = attachments.find(a => a.attachment_type === quoteKey);
              const formAtt = attachments.find(a => a.attachment_type === formKey);
              return (
                <div key={inv.id} className="space-y-2">
                  <p className="text-[10px] font-bold text-ocean uppercase tracking-wider border-b border-border pb-1">{providerLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <AttachmentRow type={quoteKey} label="Quote PDF" attachment={quoteAtt} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentRow type={formKey} label="Application Form" attachment={formAtt} onAttachmentUpload={onAttachmentUpload} />
                  </div>
                </div>
              );
            })}

            {riskProducts.map((rp) => {
              const providerLabel = `${rp.provider}${(rp._covers || []).length ? ` — ${rp._covers.map(c => c.cover_type).join(', ')}` : ''}`;
              const quoteKey = `Quote::${rp.id}`;
              const formKey = `Application Form::${rp.id}`;
              const quoteAtt = attachments.find(a => a.attachment_type === quoteKey);
              const formAtt = attachments.find(a => a.attachment_type === formKey);
              return (
                <div key={rp.id} className="space-y-2">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-wider border-b border-border pb-1">{providerLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <AttachmentRow type={quoteKey} label="Quote PDF" attachment={quoteAtt} onAttachmentUpload={onAttachmentUpload} />
                    <AttachmentRow type={formKey} label="Application Form" attachment={formAtt} onAttachmentUpload={onAttachmentUpload} />
                  </div>
                </div>
              );
            })}

            {investments.length === 0 && riskProducts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No products added yet.</p>
            )}
          </div>
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

        {/* BOTTOM-LEFT: PDF Document */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
          <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">PDF Document</h2>
          <div className="flex-1">
            {data.proposal_pdf_url ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-700" />
                    <div>
                      <p className="text-xs font-semibold text-green-900">PDF Generated</p>
                      <p className="text-[10px] text-green-700">Current version available</p>
                    </div>
                  </div>
                  <a href={data.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
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
          </div>
          <button onClick={onGeneratePdf}
            className="w-full bg-navy hover:bg-ocean text-white py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-center gap-2 rounded-sm">
            <FileText className="w-3.5 h-3.5" />
            {data.proposal_pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
          </button>
        </div>

        {/* BOTTOM-RIGHT: Signatures & Distribution */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
          <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Signatures & Distribution</h2>
          <div className="space-y-2 mb-3 flex-1">
            {[
              { label: 'Advisor signature', signed: !!data.advisor_signature_data },
              { label: 'Client signature', signed: !!data.client_signature_data },
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
            onClick={onSend}
            disabled={!hasSig || isSending}
            className={`w-full py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-center gap-2 rounded-sm transition-colors ${
              hasSig ? 'bg-gold text-white hover:bg-gold/90' : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            {isSending ? 'Generating...' : 'Finalise & Get Signing Link'}
          </button>
          {!hasSig && <p className="text-[10px] text-muted-foreground text-center mt-1">Sign above to proceed</p>}
        </div>

      </div>
    </div>
  );
}