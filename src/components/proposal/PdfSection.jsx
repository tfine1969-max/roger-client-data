import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';

export default function PdfSection({ proposal, proposalId }) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full">
      <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-4">PDF Document</h2>
      <div className="space-y-3">
        {proposal.proposal_pdf_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-700" />
                <div>
                  <p className="text-xs font-semibold text-green-900">PDF Generated</p>
                  <p className="text-[10px] text-green-700">Current version available</p>
                </div>
              </div>
              <a
                href={proposal.proposal_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-sm hover:bg-green-800 transition-colors text-xs font-medium"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">No PDF generated yet. Click below to create and sign the proposal.</p>
          </div>
        )}

        <Button
          onClick={() => navigate(`/proposal/${proposalId}/engine`)}
          className="w-full bg-navy hover:bg-ocean text-white py-2 rounded-sm font-medium text-xs flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {proposal.proposal_pdf_url ? 'Open Proposal Engine' : 'Generate PDF & Sign'}
        </Button>

        {proposal.proposal_pdf_url && (
          <p className="text-[10px] text-muted-foreground text-center">
            Regenerate by opening the proposal engine and signing again
          </p>
        )}
      </div>
    </div>
  );
}