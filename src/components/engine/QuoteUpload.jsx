import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Check, Loader2 } from 'lucide-react';

function UploadBox({ label, subtitle, existingUrl, onFileUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState(existingUrl ? label.toLowerCase() + '.pdf' : '');

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
    <div>
      <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy mb-2">
        {label}
        {subtitle && (
          <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground ml-2">
            {subtitle}
          </span>
        )}
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`w-full border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
          hasFile ? 'border-green-400 bg-green-50' : 'border-border bg-muted hover:border-sky hover:bg-blue-50/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 mx-auto mb-1 text-muted-foreground animate-spin" />
        ) : hasFile ? (
          <Check className="w-5 h-5 mx-auto mb-1 text-forest" />
        ) : (
          <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        )}
        <div className="text-sm font-medium text-navy">
          {hasFile ? fileName : `Click to upload`}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {hasFile ? 'Click to replace' : 'PDF only'}
        </div>
      </button>
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      {hasFile && label === 'Quote PDF' && (
        <div className="bg-blue-50 border border-blue-200 border-l-[3px] border-l-ocean p-2.5 text-xs text-ocean leading-relaxed mt-2">
          📋 &nbsp;<strong>Signature page will be appended.</strong> A WealthWorks signature page will be added as the final page before sending.
        </div>
      )}
    </div>
  );
}

export default function QuoteUpload({ onFileUploaded, existingUrl, onAppFormUploaded, existingAppFormUrl }) {
  return (
    <div className="border border-border bg-card p-4 h-full space-y-4">
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Upload a product quote (e.g. BrightRock, Discovery). A signature page will be automatically appended before sending.
      </p>
      <UploadBox
        label="Quote PDF"
        subtitle="Optional — attach for client signature"
        existingUrl={existingUrl}
        onFileUploaded={onFileUploaded}
      />
      <UploadBox
        label="Application Form"
        subtitle="Optional — attach completed application"
        existingUrl={existingAppFormUrl}
        onFileUploaded={onAppFormUploaded}
      />
    </div>
  );
}
