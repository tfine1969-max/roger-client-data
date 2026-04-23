import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2 } from 'lucide-react';

export default function SignatureSection({ proposal, proposalId }) {
  const handleSendAdvisor = async () => {
    // TODO: Implement send to advisor logic
    alert('Send to advisor functionality coming soon');
  };

  const handleSendClient = async () => {
    // TODO: Implement send to client logic
    alert('Send to client functionality coming soon');
  };

  const canSend = !!proposal.proposal_pdf_url;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-navy mb-6">Signatures & Distribution</h2>

      <div className="space-y-4">
        {proposal.proposal_status === 'Completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-700 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">Proposal Completed</p>
              <p className="text-sm text-green-700">All signatures and reviews are complete.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleSendAdvisor}
            disabled={!canSend}
            className={`flex items-center justify-center gap-2 py-3 rounded-sm font-medium ${
              canSend
                ? 'bg-ocean hover:bg-sky text-white'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            Send to Advisor
          </Button>

          <Button
            onClick={handleSendClient}
            disabled={!canSend}
            className={`flex items-center justify-center gap-2 py-3 rounded-sm font-medium ${
              canSend
                ? 'bg-forest hover:bg-green-700 text-white'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            Send to Client
          </Button>
        </div>

        {!canSend && (
          <p className="text-sm text-muted-foreground text-center">
            Generate a PDF first before sending to advisor or client.
          </p>
        )}
      </div>
    </div>
  );
}