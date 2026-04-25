import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Check, Loader2 } from 'lucide-react';

export default function QuoteUpload({ onFileUploaded, existingUrl }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState(existingUrl ? 'quote.pdf' : '');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileName(file.name);
    setUploading(false);
    onFileUploaded(file_url);
  };

  const hasFile = !!fileName;

  return (
    <div className="border border-border bg-card p-4 h-full">
      <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2.5">
        Quote PDF
        <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground ml-2">
          Optional — attach for client signature
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
        Upload a product quote (e.g. BrightRock, Discovery). A signature page will be automatically appended before it is sent to the client.
      </p>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`w-full border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
          hasFile ? 'border-green-400 bg-green-50' : 'border-border bg-muted hover:border-sky hover:bg-blue-50/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground animate-spin" />
        ) : hasFile ? (
          <Check className="w-6 h-6 mx-auto mb-1.5 text-forest" />
        ) : (
          <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
        )}
        <div className="text-sm font-medium text-navy">
          {hasFile ? fileName : 'Click to upload quote PDF'}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {hasFile ? 'Click to replace' : 'PDF only · Signature page appended automatically'}
        </div>
      </button>
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />

      {hasFile && (
        <div className="bg-blue-50 border border-blue-200 border-l-[3px] border-l-ocean p-2.5 text-xs text-ocean leading-relaxed mt-2.5">
          📋 &nbsp;<strong>Signature page will be appended.</strong> A WealthWorks signature page with client name, case reference, signature line and FSP disclaimer will be added as the final page before sending.
        </div>
      )}
    </div>
  );
}