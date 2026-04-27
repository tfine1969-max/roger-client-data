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
      body: `Dear ${firstName},\n\nThis is a reminder that your Financial Strategy & Recommendation Report is still awaiting your signature.\n\nPlease use the link below to review and sign your document:\n\n${signingUrl}\n\nKind regards,\nThe Wealthworks Team`,
    });

    await base44.integrations.Core.SendEmail({
      from_name: 'Wealthworks',
      to: 'tfine1969@gmail.com',
      subject: `Reminder — ${proposal.client_name || ''} Has Not Yet Signed`,
      body: `This is a reminder that ${proposal.client_name || ''} (${proposal.reference || ''}) has not yet signed their proposal.\n\nSent: ${proposal.sent_at}\nStatus: Awaiting Client Signature\n\nPlease follow up with the client.`,
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
          <InboxTable proposals={proposals} clientMap={clientMap} statusFilter={statusFilter} />
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