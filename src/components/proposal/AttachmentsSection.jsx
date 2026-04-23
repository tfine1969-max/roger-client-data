import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, X } from 'lucide-react';

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
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-navy mb-6">Attachments</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quote Upload */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-3">
            Quote PDF
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-ocean transition-colors">
            {quoteAttachment ? (
              <div className="space-y-3">
                <FileText className="w-8 h-8 mx-auto text-ocean" />
                <p className="text-sm font-medium text-navy">Quote attached</p>
                <a
                  href={quoteAttachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ocean hover:underline"
                >
                  Download
                </a>
                <button className="block text-xs text-destructive hover:underline w-full">
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag or click to upload</p>
                <button
                  onClick={() => quoteRef.current?.click()}
                  disabled={uploading}
                  className="text-xs text-ocean hover:underline font-medium"
                >
                  {uploading ? 'Uploading...' : 'Upload Quote'}
                </button>
                <input
                  ref={quoteRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleUpload(e, 'Quote')}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Application Form Upload */}
        <div>
          <label className="text-xs font-semibold text-navy uppercase tracking-wide block mb-3">
            Application Form
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-ocean transition-colors">
            {formAttachment ? (
              <div className="space-y-3">
                <FileText className="w-8 h-8 mx-auto text-ocean" />
                <p className="text-sm font-medium text-navy">Form attached</p>
                <a
                  href={formAttachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ocean hover:underline"
                >
                  Download
                </a>
                <button className="block text-xs text-destructive hover:underline w-full">
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag or click to upload</p>
                <button
                  onClick={() => formRef.current?.click()}
                  disabled={uploading}
                  className="text-xs text-ocean hover:underline font-medium"
                >
                  {uploading ? 'Uploading...' : 'Upload Form'}
                </button>
                <input
                  ref={formRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleUpload(e, 'Application Form')}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}