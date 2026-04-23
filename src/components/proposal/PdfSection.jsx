import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

export default function PdfSection({ proposal, proposalId }) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    // TODO: Implement PDF generation logic
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-navy mb-6">PDF Document</h2>

      <div className="space-y-4">
        {proposal.proposal_pdf_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-700" />
                <div>
                  <p className="font-medium text-green-900">PDF Generated</p>
                  <p className="text-sm text-green-700">Current version available</p>
                </div>
              </div>
              <a
                href={proposal.proposal_pdf_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-sm hover:bg-green-800 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">No PDF generated yet. Create one to send to client.</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleGeneratePdf}
            disabled={generating}
            className="flex-1 bg-navy hover:bg-ocean text-white py-2 rounded-sm font-medium"
          >
            {generating ? 'Generating...' : 'Generate PDF'}
          </Button>
          {proposal.proposal_pdf_url && (
            <Button
              onClick={handleGeneratePdf}
              disabled={generating}
              variant="outline"
              className="flex-1 border-border hover:bg-muted py-2 rounded-sm font-medium"
            >
              Regenerate PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}