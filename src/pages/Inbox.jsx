import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import InboxMetrics from '@/components/inbox/InboxMetrics';
import InboxTable from '@/components/inbox/InboxTable';
import NewProposalModal from '@/components/inbox/NewProposalModal';
import { Plus, LogOut } from 'lucide-react';
import { ADVISORS } from '@/lib/constants';

async function checkAndSendReminders(proposals) {
  const awaiting = proposals.filter(
    p => p.status === 'Awaiting Client Signature' && p.sent_at && !p.reminder_sent
  );
  for (const proposal of awaiting) {
    const hoursSinceSent = (Date.now() - new Date(proposal.sent_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSent < 48) continue;

    const signingUrl = proposal.signing_token
      ? `${window.location.origin}/sign-proposal/${proposal.signing_token}`
      : '';
    const firstName = (proposal.client_name || '').split(' ')[0] || 'Client';

    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: proposal.client_email || '',
      subject: 'Reminder — Document Awaiting Your Signature',
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:0.7;">Wealthworks Investments (Pty) Ltd · FSP 45624</p><p style="margin:6px 0 0;color:#ffffff;font-size:18px;font-weight:700;">Financial Strategy &amp; Recommendation Report</p></td></tr><tr><td style="padding:40px 40px 32px;"><p style="margin:0 0 16px;font-size:15px;color:#1e3a5f;font-weight:600;">Dear ${firstName},</p><p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">This is a reminder that your Financial Strategy &amp; Recommendation Report is still awaiting your signature.</p><p style="margin:0 0 8px;font-size:13px;color:#64748b;">Sent: ${new Date(proposal.sent_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</p><p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.7;">Please click the link below to review and sign your document:</p><table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="background:#1e3a5f;border-radius:6px;padding:14px 28px;"><a href="${signingUrl}" style="color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.8px;text-transform:uppercase;">Review &amp; Sign Document →</a></td></tr></table><p style="margin:0 0 8px;font-size:12px;color:#64748b;">Or copy this link into your browser:</p><p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${signingUrl}" style="color:#1e3a5f;font-weight:600;">${signingUrl}</a></p><p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">This link is unique to you. Please do not share it.</p><p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6;">If you have any questions, please contact your advisor directly.</p><p style="margin:0;font-size:13px;color:#334155;line-height:1.7;">Kind regards,<br/><strong>The Wealthworks Team</strong></p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0 0 4px;font-size:11px;color:#64748b;font-weight:700;">For more information go to: <a href="https://www.wealthworks.co.za" style="color:#1e3a5f;">www.wealthworks.co.za</a></p><p style="margin:0 0 16px;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337</p><img src="https://wealth-works-flow.base44.app/logo.png" alt="Wealthworks" width="120" style="display:block;margin-top:8px;" onerror="this.style.display='none'"/></td></tr></table></td></tr></table></body></html>`,
    });

    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: 'tfine1969@gmail.com',
      subject: `Reminder — ${proposal.client_name || ''} Has Not Yet Signed`,
      body: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;"><tr><td style="background:#1e3a5f;padding:28px 40px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Signature Reminder — Action Required</p></td></tr><tr><td style="padding:40px;"><p style="font-size:15px;color:#1e3a5f;font-weight:600;margin:0 0 16px;">Dear Trevor,</p><p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;">This is a reminder that <strong>${proposal.client_name || ''}</strong> has not yet signed their Financial Strategy &amp; Recommendation Report.</p><table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;"><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;width:40%;">Client</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.client_name || '—'}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;">Proposal Reference</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${proposal.reference || '—'}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 0;color:#64748b;">Sent</td><td style="padding:10px 0;color:#1e3a5f;font-weight:600;">${new Date(proposal.sent_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr><tr><td style="padding:10px 0;color:#64748b;">Status</td><td style="padding:10px 0;color:#92400e;font-weight:600;">Awaiting Client Signature</td></tr></table><p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">Please follow up with the client directly.</p></td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"/></td></tr><tr><td style="padding:24px 40px 32px;"><p style="margin:0 0 4px;font-size:11px;color:#64748b;font-weight:700;">For more information go to: <a href="https://www.wealthworks.co.za" style="color:#1e3a5f;">www.wealthworks.co.za</a></p><p style="margin:0;font-size:11px;color:#94a3b8;">Authorised Financial Services Provider FSP no 28337</p></td></tr></table></td></tr></table></body></html>`,
    });

    await base44.entities.Proposal.update(proposal.id, { reminder_sent: true });
  }
}

export default function Inbox() {
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 50),
  });

  // Run 48-hour reminder check whenever proposals load
  useEffect(() => {
    if (proposals.length > 0) {
      checkAndSendReminders(proposals).catch(() => {});
    }
  }, [proposals]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Clients.list(),
  });

  // Build clientMap for quick lookup
  const clientMap = clients.reduce((acc, client) => {
    if (client.id) acc[client.id] = client;
    if (client.client_id) acc[client.client_id] = client;
    return acc;
  }, {});

  // Default to trevor if no advisor_key on user
  const advisorKey = user?.advisor_key || 'trevor';
  const advisor = ADVISORS[advisorKey] || ADVISORS.trevor;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-navy border-b border-border px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">WealthWorks</h1>
          <p className="text-white/60 text-sm">Advisor Portal</p>
        </div>
        <button
          onClick={() => base44.auth.logout('/', true)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="flex-1 p-4 md:p-7 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-medium text-navy tracking-tight">Proposal inbox</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-gold text-white px-5 py-2.5 text-xs font-medium tracking-[.08em] uppercase flex items-center gap-2 hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New proposal
          </button>
        </div>

        <InboxMetrics proposals={proposals} activeFilter={statusFilter} onFilter={setStatusFilter} />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <InboxTable proposals={proposals} clientMap={clientMap} statusFilter={statusFilter} onClearFilter={() => setStatusFilter(null)} />
        )}
      </div>

      <NewProposalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        advisorKey={advisorKey}
        advisorName={advisor.name}
      />
    </div>
  );
}