import React from 'react';
import { CheckCircle2, Download, FileText, FileSignature, Upload } from 'lucide-react';
import ProposalPreview from '@/components/engine/ProposalPreview';
import SignaturePad from '@/components/engine/SignaturePad';

export default function Step04ReviewSend({
  data, investments, riskProducts, attachments,
  onGeneratePdf, onSend, onAttachmentUpload, onFieldChange,
  isSending,
}) {
  const hasSig = !!data.advisor_signature_data;
  const quoteAttachment = attachments.find(a => a.attachment_type === 'Quote');
  const formAttachment = attachments.find(a => a.attachment_type === 'Application Form');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
      <div className="space-y-4">

        {/* Attachments | PDF | Signatures */}
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
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-ocean hover:underline">Download</a>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
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
              ))}
            </div>
          </div>

          {/* PDF */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">PDF Document</h2>
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
            <button onClick={onGeneratePdf}
              className="w-full bg-navy hover:bg-ocean text-white py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-center gap-2 rounded-sm">
              <FileText className="w-3.5 h-3.5" />
              {data.proposal_pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
            </button>
          </div>

          {/* Signatures status + send */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Signatures & Distribution</h2>
            <div className="space-y-2 mb-3">
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
            {!hasSig && <p className="text-[10px] text-muted-foreground text-center mt-1">Sign below to proceed</p>}
          </div>
        </div>

        {/* Advisor Signature */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Advisor Signature</h2>
          <SignaturePad
            signatureData={data.advisor_signature_data}
            signatureType={data.advisor_signature_type}
            signDate={data.sign_date}
            onSignatureChange={(sigData, sigType) => {
              onFieldChange('advisor_signature_data', sigData);
              onFieldChange('advisor_signature_type', sigType);
            }}
            onDateChange={(date) => onFieldChange('sign_date', date)}
          />
        </div>
      </div>

      {/* Side panel */}
      <div className="lg:sticky lg:top-4">
        <ProposalPreview
          proposal={data}
          investments={investments}
          riskProducts={riskProducts}
          onGeneratePdf={onGeneratePdf}
          onSend={onSend}
          canSend={hasSig}
          isSending={isSending}
        />
      </div>
    </div>
  );
}