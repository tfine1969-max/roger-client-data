import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileSignature } from 'lucide-react';

export default function SignatureSection({ proposal, proposalId }) {
  const navigate = useNavigate();

  const advisorSigned = !!proposal.advisor_signature_data;
  const clientSigned = !!proposal.client_signature_data;
  const pdfReady = !!proposal.proposal_pdf_url;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-4">Signatures & Distribution</h2>

      <div className="space-y-2 mb-3">
        {/* Advisor signature status */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-sm">
          <div className="flex items-center gap-2">
            {advisorSigned
              ? <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-border" />
            }
            <span className="text-xs text-navy font-medium">Advisor signature</span>
          </div>
          <span className={`text-[10px] font-semibold ${advisorSigned ? 'text-teal' : 'text-muted-foreground'}`}>
            {advisorSigned ? 'Signed' : 'Pending'}
          </span>
        </div>

        {/* Client signature status */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-sm">
          <div className="flex items-center gap-2">
            {clientSigned
              ? <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-border" />
            }
            <span className="text-xs text-navy font-medium">Client signature</span>
          </div>
          <span className={`text-[10px] font-semibold ${clientSigned ? 'text-teal' : 'text-muted-foreground'}`}>
            {clientSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      </div>

      {advisorSigned && clientSigned && (
        <div className="bg-green-50 border border-green-200 rounded-sm p-2 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
          <p className="text-xs text-green-900 font-medium">Fully signed — ready for CRM upload</p>
        </div>
      )}

      <Button
        onClick={() => navigate(`/proposal/${proposalId}/engine`)}
        className="w-full bg-ocean hover:bg-sky text-white py-2 rounded-sm font-medium text-xs flex items-center justify-center gap-2"
      >
        <FileSignature className="w-3.5 h-3.5" />
        {advisorSigned ? 'View / Resend for Signature' : 'Sign & Send to Client'}
      </Button>

      {!pdfReady && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Generate a PDF first before signing
        </p>
      )}
    </div>
  );
}