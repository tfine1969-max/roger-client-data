import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import InboxMetrics from '@/components/inbox/InboxMetrics';
import InboxTable from '@/components/inbox/InboxTable';
import NewProposalModal from '@/components/inbox/NewProposalModal';
import { Plus, LogOut } from 'lucide-react';
import { ADVISORS } from '@/lib/constants';

export default function Inbox() {
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 50),
  });

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

        <InboxMetrics proposals={proposals} />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <InboxTable proposals={proposals} />
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