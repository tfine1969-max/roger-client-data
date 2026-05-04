import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText } from 'lucide-react';

export default function AttachmentsSection({ attachments, proposalId }) {
  const quoteRef = useRef(null);
  const formRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const quoteAttachment = attachments.find(a => a.attachment_type === 'Quote');
  const formAttachment = attachments.find(a => a.attachment_type === 'Application Form');

  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Attachments.create({
        proposal_id: proposalId,
        attachment_type: type,
        file_url
      });
      // Optionally, refresh the attachments
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  return (
    <div className="bg-card rounded-lg p-4 h-full">
      <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-4">Attachments</h2>

      <div className="grid grid-cols-1 gap-3">
        {/* Quote Upload */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-1.5">Quote PDF</label>
          <div className="border-2 border-dashed border-border rounded flex items-center justify-between px-3 h-[44px] hover:border-ocean transition-colors">
            {quoteAttachment ? (
              <>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ocean shrink-0" />
                  <span className="text-xs font-medium text-navy">Quote attached</span>
                </div>
                <a href={quoteAttachment.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean hover:underline">Download</a>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">No file uploaded</span>
                </div>
                <button onClick={() => quoteRef.current?.click()} disabled={uploading} className="text-xs text-ocean hover:underline font-medium shrink-0">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <input ref={quoteRef} type="file" accept=".pdf" onChange={(e) => handleUpload(e, 'Quote')} className="hidden" />
              </>
            )}
          </div>
        </div>

        {/* Application Form Upload */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-1.5">Application Form</label>
          <div className="border-2 border-dashed border-border rounded flex items-center justify-between px-3 h-[44px] hover:border-ocean transition-colors">
            {formAttachment ? (
              <>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ocean shrink-0" />
                  <span className="text-xs font-medium text-navy">Form attached</span>
                </div>
                <a href={formAttachment.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ocean hover:underline">Download</a>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">No file uploaded</span>
                </div>
                <button onClick={() => formRef.current?.click()} disabled={uploading} className="text-xs text-ocean hover:underline font-medium shrink-0">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <input ref={formRef} type="file" accept=".pdf" onChange={(e) => handleUpload(e, 'Application Form')} className="hidden" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
