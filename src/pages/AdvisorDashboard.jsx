import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ADVISORS } from '@/lib/constants';
import { STATUS_MAP } from '@/components/inbox/InboxMetrics';
import {
  ArrowRight,
  FileText,
  FolderKanban,
  LogOut,
  Plus,
  ShieldCheck,
} from 'lucide-react';

const getProposalCount = (proposals, category) =>
  proposals.filter(p =>
    STATUS_MAP[category].map(s => s.toLowerCase()).includes((p.status || '').toLowerCase())
  ).length;

function getVerificationStatus(client) {
  if (!client) return 'unknown';
  if (client.review_status === 'Approved') return 'ready';
  if (client.review_status === 'Rejected') return 'manual_review';
  const vs = (client.verification_status || '').toLowerCase().replace(/\s/g, '_');
  const ficaStatus = client.fica_status;
  if (vs === 'verified' || ficaStatus === 'Approved') return 'ready';
  if (vs === 'manual_review' || vs === 'manual review' || ficaStatus === 'Referred' || ficaStatus === 'Declined') return 'manual_review';
  if (vs === 'awaiting_documents') return 'awaiting_documents';
  if (!client.onboarding_complete) return 'new';
  return 'new';
}

const countCompliance = (clients, key) => {
  const onboarded = clients.filter(c => c.email && (c.onboarding_complete || c.fica_status || c.doc_status));
  return onboarded.filter(c => getVerificationStatus(c) === key).length;
};

const Metric = ({ label, value, tone = 'text-navy' }) => (
  <div className="border border-border bg-card px-4 py-3">
    <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
    <p className="text-[9px] font-semibold tracking-[.14em] uppercase text-muted-foreground mt-1">{label}</p>
  </div>
);

const PortalCard = ({ icon: Icon, title, description, buttonLabel, onClick, children }) => (
  <section className="border border-border bg-card p-6">
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center text-ocean">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-navy tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-semibold uppercase tracking-[.08em] hover:bg-ocean transition-colors"
      >
        {buttonLabel}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
    {children}
  </section>
);

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 50),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Clients.list(),
  });

  const advisorKey = user?.advisor_key || 'trevor';
  const advisor = ADVISORS[advisorKey] || ADVISORS.trevor;

  const proposalSummary = useMemo(() => ({
    awaiting: getProposalCount(proposals, 'AWAITING REVIEW'),
    inProgress: getProposalCount(proposals, 'IN PROGRESS'),
    sent: getProposalCount(proposals, 'SENT'),
    finalised: getProposalCount(proposals, 'FINALISED'),
  }), [proposals]);

  const complianceSummary = useMemo(() => ({
    new: countCompliance(clients, 'new'),
    manualReview: countCompliance(clients, 'manual_review'),
    awaitingDocuments: countCompliance(clients, 'awaiting_documents'),
    ready: countCompliance(clients, 'ready'),
  }), [clients]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-navy border-b border-border px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">WealthWorks</h1>
          <p className="text-white/60 text-sm">Advisor Portal - {advisor.name}</p>
        </div>
        <button
          onClick={() => base44.auth.logout('/', true)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <main className="flex-1 p-4 md:p-7 max-w-7xl mx-auto w-full">
        <div className="mb-7">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Advisor Portal</p>
          <h1 className="text-3xl font-semibold text-navy tracking-tight mt-2">Workspace index</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Start with compliance review or proposal work. Each section keeps its own queue so the landing page stays clean.
          </p>
        </div>

        <div className="grid gap-5">
          <PortalCard
            icon={ShieldCheck}
            title="1. Compliance"
            description="Open the unified compliance engine for FICA, FAIS, registers, training, oversight, audit trails and inspection exports."
            buttonLabel="Open compliance"
            onClick={() => navigate('/compliance')}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label="New submissions" value={complianceSummary.new} tone="text-blue-700" />
              <Metric label="Manual review" value={complianceSummary.manualReview} tone="text-amber-700" />
              <Metric label="Awaiting documents" value={complianceSummary.awaitingDocuments} tone="text-orange-700" />
              <Metric label="Ready for approval" value={complianceSummary.ready} tone="text-teal" />
            </div>
          </PortalCard>

          <PortalCard
            icon={FolderKanban}
            title="2. Proposals"
            description="Build new proposals, continue draft ROAs, manage PDFs, send client packs and monitor signed reports."
            buttonLabel="Open proposals"
            onClick={() => navigate('/proposals')}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label="Awaiting review" value={proposalSummary.awaiting} />
              <Metric label="In progress" value={proposalSummary.inProgress} tone="text-gold" />
              <Metric label="Sent" value={proposalSummary.sent} tone="text-ocean" />
              <Metric label="Finalised" value={proposalSummary.finalised} tone="text-forest" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/create-proposal')}
                className="inline-flex items-center gap-2 border border-gold bg-gold text-white px-4 py-2 text-xs font-semibold uppercase tracking-[.08em] hover:bg-gold/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New proposal
              </button>
              <button
                type="button"
                onClick={() => navigate('/proposals')}
                className="inline-flex items-center gap-2 border border-border bg-card text-navy px-4 py-2 text-xs font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Proposal inbox
              </button>
            </div>
          </PortalCard>
        </div>
      </main>
    </div>
  );
}
