import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDateTime } from '@/lib/constants';
import { Check, Download, Upload, FileSignature, Loader2, PenLine, Type, Image as ImageIcon } from 'lucide-react';

const LOA_AUTHORITY_WORDING = 'I authorise Wealth Works (Pty) Ltd to obtain information relating to my existing policies, investments, retirement products and financial products from the relevant product providers, insurers, investment platforms, financial institutions and Astute Financial Services Exchange, for purposes of financial planning, advice, administration, compliance and ongoing servicing.';

const LOA_STATUS = {
  notStarted: 'Not started',
  pending: 'Pending signature',
  uploaded: 'Uploaded manually',
  signed: 'Electronically signed',
  completed: 'Completed',
  review: 'Requires review',
};

export default function LoaSection({
  formData,
  handleChange,
  loaPreviewDetails,
  signatureCanvasRef,
  startSignatureDrawing,
  drawSignature,
  endSignatureDrawing,
  saveDrawnSignature,
  clearDrawnSignature,
  handleTypedSignature,
  handleUploadSignatureImage,
  uploadedSignatureName,
  setLoaCompletionMethod,
  setLoaSignatureMethod,
  handleGenerateSignedLoa,
  handleDownloadManualLoa,
  handleManualLoaUpload,
  isLoaGenerating,
  isLoaUploading,
  todayISO,
}) {
  // If LOA is already completed and saved, show a read-only summary
  if (formData.loa_document_saved && formData.loa_pdf_url) {
    return (
      <div className="border border-teal/30 rounded p-2.5 bg-teal/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">LETTER OF AUTHORITY</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-teal/10 text-teal border-teal/20">
            {formData.loa_status || LOA_STATUS.signed}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 p-2 bg-teal/10 border border-teal/20 rounded mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-teal shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-teal font-medium">Letter of Authority signed and saved</p>
              {formData.loa_pdf_name && (
                <p className="text-[10px] text-muted-foreground truncate">{formData.loa_pdf_name}</p>
              )}
              {formData.loa_signature_timestamp && (
                <p className="text-[10px] text-muted-foreground">
                  Signed: {fmtDateTime(formData.loa_signature_timestamp)}
                </p>
              )}
            </div>
          </div>
          <a
            href={formData.loa_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1 text-[10px] text-ocean font-bold hover:underline shrink-0"
          >
            <Download className="w-3 h-3" /> View / Download
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Method: {formData.loa_completion_method === 'electronic' ? 'Electronically signed' : 'Manually uploaded'}
          {formData.loa_date_signed ? ` · Date: ${formData.loa_date_signed}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded p-2.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-navy uppercase tracking-wider text-xs">LETTER OF AUTHORITY</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
          formData.loa_document_saved ? 'bg-teal/10 text-teal border-teal/20' : 'bg-secondary text-muted-foreground border-border'
        }`}>{formData.loa_status || LOA_STATUS.notStarted}</span>
      </div>

      {formData.loa_pdf_url && (
        <div className="flex items-center justify-between gap-2 p-2 bg-teal/10 border border-teal/20 rounded mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-teal shrink-0" />
            <span className="text-xs text-teal font-medium truncate">{formData.loa_pdf_name || 'Letter of Authority saved'}</span>
          </div>
          <a
            href={formData.loa_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1 text-[10px] text-ocean font-bold hover:underline shrink-0"
          >
            <Download className="w-3 h-3" /> View / Download
          </a>
        </div>
      )}

      <div className="mb-3">
        <p className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-1.5">How would you like to complete the Letter of Authority?</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'electronic', label: 'Sign electronically', helper: 'Complete and sign in this step.' },
            { value: 'manual', label: 'Download and upload signed form', helper: 'Download, sign manually, then upload.' },
          ].map(option => (
            <label key={option.value} className={`cursor-pointer border rounded p-2 transition-colors ${formData.loa_completion_method === option.value ? 'border-ocean bg-ocean/10' : 'border-border hover:border-ocean/50'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="loa_completion_method"
                  checked={formData.loa_completion_method === option.value}
                  onChange={() => setLoaCompletionMethod(option.value)}
                  className="w-3.5 h-3.5 accent-ocean"
                />
                <span className="text-xs font-semibold text-navy">{option.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-5">{option.helper}</p>
            </label>
          ))}
        </div>
      </div>

      {formData.loa_completion_method === 'electronic' && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 cursor-pointer p-2 border border-border rounded">
            <input
              type="checkbox"
              checked={formData.loa_authorised}
              onChange={e => handleChange('loa_authorised', e.target.checked)}
              className="w-3.5 h-3.5 accent-ocean mt-0.5 shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">{LOA_AUTHORITY_WORDING}</span>
          </label>

          <div className="border border-border rounded p-2 bg-secondary/30">
            <p className="text-[10px] font-bold tracking-wider text-navy uppercase mb-2">Auto-populated Letter of Authority preview</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {loaPreviewDetails.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
                  <p className="text-xs text-navy">{value || '-'}</p>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1">
              <p className="font-bold text-navy">WEALTH WORKS (PTY) LTD | FSP No. 28337 | LETTER OF AUTHORITY</p>
              <p><strong>Sections:</strong> Client Details; Appointment of Wealth Works; Authority to Obtain Information; Astute Authorisation; Consent and Acknowledgements; Client Signature.</p>
            </div>
          </div>

          {formData.loa_authorised && (
            <div className="border border-border rounded p-2">
              <p className="text-[10px] font-semibold tracking-wider text-navy uppercase mb-1.5">Signature method</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { value: 'drawn', label: 'Draw signature', icon: PenLine },
                  { value: 'typed', label: 'Type signature', icon: Type },
                  { value: 'uploaded', label: 'Upload signature image', icon: ImageIcon },
                ].map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLoaSignatureMethod(option.value)}
                      className={`flex items-center justify-center gap-1 border rounded px-2 py-1.5 text-[10px] font-semibold transition-colors ${formData.loa_signature_method === option.value ? 'border-ocean bg-ocean/10 text-ocean' : 'border-border text-navy hover:border-ocean/50'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {option.label}
                    </button>
                  );
                })}
              </div>

              {formData.loa_signature_method === 'drawn' && (
                <div className="space-y-2">
                  <canvas
                    ref={signatureCanvasRef}
                    width={900}
                    height={160}
                    onMouseDown={startSignatureDrawing}
                    onMouseMove={drawSignature}
                    onMouseUp={endSignatureDrawing}
                    onMouseLeave={endSignatureDrawing}
                    onTouchStart={startSignatureDrawing}
                    onTouchMove={drawSignature}
                    onTouchEnd={endSignatureDrawing}
                    className="block w-full h-24 bg-white border border-border rounded cursor-crosshair touch-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={clearDrawnSignature} className="h-8 px-3 text-xs">Clear</Button>
                    <Button type="button" onClick={saveDrawnSignature} className="h-8 px-3 text-xs bg-navy text-white hover:bg-ocean">Save Signature</Button>
                  </div>
                </div>
              )}

              {formData.loa_signature_method === 'typed' && (
                <div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Type your full name"
                    value={formData.loa_typed_signature_name}
                    onChange={e => handleTypedSignature(e.target.value)}
                  />
                  {formData.loa_typed_signature_name && (
                    <div className="mt-2 border border-border rounded bg-white px-3 py-2 font-serif italic text-xl text-navy">
                      {formData.loa_typed_signature_name}
                    </div>
                  )}
                </div>
              )}

              {formData.loa_signature_method === 'uploaded' && (
                <div className="space-y-2">
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                      <Upload className="w-4 h-4 text-ocean mx-auto mb-1" />
                      <p className="text-xs font-medium text-navy">{uploadedSignatureName || 'Upload PNG, JPG or JPEG signature image'}</p>
                    </div>
                    <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" className="hidden" onChange={e => handleUploadSignatureImage(e.target.files?.[0])} />
                  </label>
                  {formData.loa_signature_data?.startsWith('data:image') && (
                    <img src={formData.loa_signature_data} alt="Signature preview" className="max-h-20 border border-border rounded bg-white p-2" />
                  )}
                </div>
              )}

              {formData.loa_signature_method && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                  <p className="text-[10px] text-muted-foreground">Date signed: {formData.loa_date_signed || todayISO()}</p>
                  <div className="flex items-center gap-2">
                    {formData.loa_pdf_url && formData.loa_document_saved && (
                      <a
                        href={formData.loa_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-ocean text-ocean hover:bg-ocean hover:text-white transition-colors rounded-md font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> View / Download LOA
                      </a>
                    )}
                    <Button type="button" onClick={handleGenerateSignedLoa} disabled={isLoaGenerating} className="h-8 px-3 text-xs bg-navy text-white hover:bg-ocean">
                      {isLoaGenerating ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Generating...</> : <><FileSignature className="w-3.5 h-3.5 mr-1" /> Generate signed LOA</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {formData.loa_completion_method === 'manual' && (
        <div className="space-y-3">
          <Button type="button" onClick={handleDownloadManualLoa} disabled={isLoaGenerating} className="h-8 px-3 text-xs bg-navy text-white hover:bg-ocean">
            {isLoaGenerating ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Preparing...</> : <><Download className="w-3.5 h-3.5 mr-1" /> Download Letter of Authority</>}
          </Button>
          {formData.loa_downloaded && (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-border rounded p-3 text-center hover:border-ocean/50 transition-colors">
                <Upload className="w-4 h-4 text-ocean mx-auto mb-1" />
                <p className="text-xs font-medium text-navy">Upload signed Letter of Authority</p>
                <p className="text-[10px] text-muted-foreground mt-1">Accepted: PDF, JPG, JPEG, PNG</p>
                {isLoaUploading && <p className="text-[10px] text-ocean mt-1">Uploading...</p>}
              </div>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={e => handleManualLoaUpload(e.target.files?.[0])} />
            </label>
          )}
          {formData.loa_pdf_url && formData.loa_document_saved && (
            <a
              href={formData.loa_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-ocean text-ocean hover:bg-ocean hover:text-white transition-colors rounded-md font-medium"
            >
              <Download className="w-3.5 h-3.5" /> View / Download Signed LOA
            </a>
          )}
        </div>
      )}
    </div>
  );
}