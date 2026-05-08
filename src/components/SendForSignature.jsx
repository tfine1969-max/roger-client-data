import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SendForSignature({ proposal, onStatusUpdate }) {
  const [copying, setCopying] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState('');

  const createSigningToken = () => {
    if (proposal.signing_token) return proposal.signing_token;
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
    return `${Date.now()}${Math.random().toString(36).slice(2, 14)}`;
  };

  const markAsSent = async () => {
    const signingToken = createSigningToken();
    // Use backend function (service role) to bypass RLS on Proposal entity
    await base44.functions.invoke('signProposal', {
      action: 'markSent',
      proposalId: proposal.id,
      signingToken,
    });
    if (onStatusUpdate) onStatusUpdate();
    return signingToken;
  };

  const getSigningUrl = (signingToken) =>
    `${window.location.origin}/sign-proposal/${signingToken || proposal.id}`;

  const handleCopyLink = async () => {
    if (!proposal.pdf_generated_at) {
      setMessage('Generate the PDF first before sending.');
      return;
    }
    setCopying(true);
    setMessage('');
    try {
      const signingToken = await markAsSent();
      const signingUrl = getSigningUrl(signingToken);
      await navigator.clipboard.writeText(signingUrl);
      setMessage('Signing link copied to clipboard.');
    } catch (err) {
      console.error('Copy error:', err);
      setMessage(`Error: ${err?.message || 'Could not copy link.'}`);
    }
    setCopying(false);
  };

  const handleEmailClient = async () => {
    if (!proposal.pdf_generated_at) {
      setMessage('Generate the PDF first before sending.');
      return;
    }
    setEmailing(true);
    setMessage('');
    try {
      const signingToken = await markAsSent();
      const signingUrl = getSigningUrl(signingToken);

      const allClients = await base44.entities.Clients.list();
      const client = allClients.find(c => c.id === proposal.client_id);
      const clientName = client?.first_name || client?.full_name || 'Client';

      await base44.functions.invoke('sendTransactionalEmail', {
        to: client?.email || proposal.client_email || '',
        subject: `Your Financial Strategy Report - Action Required`,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:0.7;">Wealthworks Investments (Pty) Ltd - FSP 45624</p><p style="margin:6px 0 0;color:#ffffff;font-size:18px;font-weight:700;">Financial Strategy &amp; Recommendation Report</p></td></tr><tr><td style="padding:40px 40px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1e3a5f;font-weight:600;">Dear ${clientName},</p><p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">Your Financial Strategy &amp; Recommendation Report has been prepared by Wealthworks and is ready for your review and signature.</p><p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">Please click the link below to review and sign your document:</p><table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="background:#1e3a5f;border-radius:6px;padding:14px 28px;"><a href="${signingUrl}" style="color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.8px;text-transform:uppercase;">Review &amp; Sign Document</a></td></tr></table><p style="margin:0 0 8px;font-size:12px;color:#64748b;">Or copy this link into your browser:</p><p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${signingUrl}" style="color:#1e3a5f;font-weight:600;">${signingUrl}</a></p><p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">This link is unique to you. Please do not share it.</p><p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">If you have any questions, please contact your advisor directly.</p><p style="margin:0;font-size:13px;color:#334155;line-height:1.7;">Kind regards,<br/><strong>The Wealthworks Team</strong></p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0 0 4px;font-size:11px;color:#64748b;font-weight:700;">For more information go to: <a href="https://www.wealthworks.co.za" style="color:#1e3a5f;">www.wealthworks.co.za</a></p><p style="margin:0 0 16px;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337</p></td></tr></table></td></tr></table></body></html>`,
      });

      setMessage('Email sent successfully.');
    } catch (err) {
      console.error('Send error:', err);
      setMessage(`Error: ${err?.message || 'Failed to send. Please try again.'}`);
    }
    setEmailing(false);
  };

  const advisorSigned = !!proposal.advisor_signature_data;
  const clientSigned = proposal.status === 'Signed' || !!proposal.client_signature || !!proposal.signed_at;
  const hasError = message.startsWith('Error') || message.startsWith('Generate');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#f8fafc',
        borderRadius: 8, fontSize: 13, color: '#334155'
      }}>
        <span>Advisor signature</span>
        <span style={{ color: advisorSigned ? '#166534' : '#92400e', fontWeight: 600 }}>
          {advisorSigned ? 'Signed' : 'Pending'}
        </span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#f8fafc',
        borderRadius: 8, fontSize: 13, color: '#334155'
      }}>
        <span>Client signature</span>
        <span style={{ color: clientSigned ? '#166534' : '#92400e', fontWeight: 600 }}>
          {clientSigned ? 'Signed' : 'Pending'}
        </span>
      </div>

      <button
        onClick={handleCopyLink}
        disabled={copying}
        style={{
          background: '#1e3a5f', color: '#ffffff', border: 'none',
          borderRadius: 8, padding: '14px 24px', fontSize: 13,
          fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          width: '100%', cursor: copying ? 'not-allowed' : 'pointer',
          opacity: copying ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 4,
        }}
      >
        {copying ? 'COPYING...' : 'COPY SIGNING LINK'}
      </button>

      <button
        onClick={handleEmailClient}
        disabled={emailing}
        style={{
          background: '#0d9488', color: '#ffffff', border: 'none',
          borderRadius: 8, padding: '14px 24px', fontSize: 13,
          fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          width: '100%', cursor: emailing ? 'not-allowed' : 'pointer',
          opacity: emailing ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 10,
        }}
      >
        {emailing ? 'SENDING...' : 'EMAIL TO CLIENT'}
      </button>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: hasError ? '#fffbeb' : '#f0fdf4',
          color: hasError ? '#92400e' : '#166534',
          border: `1px solid ${hasError ? '#fde68a' : '#bbf7d0'}`,
        }}>
          {message}
        </div>
      )}

      {proposal.sent_at && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
          Last sent: {new Date(proposal.sent_at).toLocaleDateString('en-ZA', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      )}

      {proposal.status === 'Awaiting Client Signature' && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a'
        }}>
          Awaiting client signature
        </div>
      )}

      {clientSigned && proposal.signed_at && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0'
        }}>
          Signed by client on {new Date(proposal.signed_at).toLocaleDateString('en-ZA', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })}
        </div>
      )}
    </div>
  );
}