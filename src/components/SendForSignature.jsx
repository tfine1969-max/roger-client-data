import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SendForSignature({ proposal, onStatusUpdate }) {
  const [copying, setCopying] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState('');

  const generateToken = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

  const getSigningUrl = (token) =>
    `${window.location.origin}/sign-proposal/${token}`;

  const prepareAndUpdate = async () => {
    const token = generateToken();
    const signingUrl = getSigningUrl(token);
    await base44.entities.Proposal.update(proposal.id, {
      signing_token: token,
      status: 'Sent',
      sent_at: new Date().toISOString(),
      reminder_sent: false,
    });
    if (onStatusUpdate) onStatusUpdate();
    return { token, signingUrl };
  };

  const handleCopyLink = async () => {
    if (!proposal.pdf_generated_at) {
      setMessage('⚠ Generate the PDF first before sending.');
      return;
    }
    setCopying(true);
    try {
      const { signingUrl } = await prepareAndUpdate();
      await navigator.clipboard.writeText(signingUrl);
      setMessage('✓ Signing link copied to clipboard.');
    } catch (err) {
      console.error(err);
      setMessage('✗ Could not copy link. Please try again.');
    }
    setCopying(false);
  };

  const handleEmailClient = async () => {
    if (!proposal.pdf_generated_at) {
      setMessage('⚠ Generate the PDF first before sending.');
      return;
    }
    setEmailing(true);
    setMessage('');
    try {
      const allClients = await base44.entities.Clients.list();
      const client = allClients.find(c => c.id === proposal.client_id);
      const clientName = client?.first_name || client?.full_name || 'Client';

      const { signingUrl } = await prepareAndUpdate();

      // TEST MODE — all emails go to tfine1969@gmail.com
      await base44.integrations.Core.SendEmail({
        from_name: 'Wealthworks',
        to: 'tfine1969@gmail.com',
        subject: `WealthWorks — Document Ready for Signature — ${client?.full_name || 'Client'}`,
        body: `Dear ${clientName},\n\nYour Financial Strategy & Recommendation Report is ready for review and signature.\n\nSigning link:\n${signingUrl}\n\nKind regards,\nThe Wealthworks Team`,
      });

      setMessage(`✓ Email sent to tfine1969@gmail.com (test mode)`);
    } catch (err) {
      console.error('Email error full details:', err);
      setMessage(`✗ Error: ${err?.message || JSON.stringify(err)}`);
    }
    setEmailing(false);
  };

  const advisorSigned = !!proposal.advisor_signature_data;
  const clientSigned = proposal.status === 'Signed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Signature status rows */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#f8fafc',
        borderRadius: 8, fontSize: 13, color: '#334155'
      }}>
        <span>Advisor signature</span>
        <span style={{ color: advisorSigned ? '#166534' : '#92400e', fontWeight: 600 }}>
          {advisorSigned ? '✓ Signed' : '○ Pending'}
        </span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: '#f8fafc',
        borderRadius: 8, fontSize: 13, color: '#334155'
      }}>
        <span>Client signature</span>
        <span style={{ color: clientSigned ? '#166534' : '#92400e', fontWeight: 600 }}>
          {clientSigned ? '✓ Signed' : '○ Pending'}
        </span>
      </div>

      {/* COPY SIGNING LINK */}
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
        □ {copying ? 'COPYING...' : 'COPY SIGNING LINK'}
      </button>

      {/* EMAIL TO CLIENT */}
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
        ✉ {emailing ? 'SENDING...' : 'EMAIL TO CLIENT'}
      </button>

      {/* Feedback message */}
      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: message.startsWith('✓') ? '#f0fdf4' : '#fffbeb',
          color: message.startsWith('✓') ? '#166534' : '#92400e',
          border: `1px solid ${message.startsWith('✓') ? '#bbf7d0' : '#fde68a'}`,
        }}>
          {message}
        </div>
      )}

      {/* Sent timestamp */}
      {proposal.sent_at && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
          Last sent: {new Date(proposal.sent_at).toLocaleDateString('en-ZA', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      )}

      {/* Awaiting / Signed status */}
      {proposal.status === 'Awaiting Client Signature' && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a'
        }}>
          ⏳ Awaiting client signature
        </div>
      )}

      {clientSigned && proposal.signed_at && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0'
        }}>
          ✓ Signed by client on {new Date(proposal.signed_at).toLocaleDateString('en-ZA', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })}
        </div>
      )}
    </div>
  );
}