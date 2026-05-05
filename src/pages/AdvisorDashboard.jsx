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
  UserCheck,
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

const Metric = ({ label, value, tone = 'text-navy', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`border border-border bg-background px-3 py-2 text-left min-h-[58px] ${onClick ? 'hover:border-navy/40 hover:bg-secondary/40 transition-colors cursor-pointer' : 'cursor-default'}`}
  >
    <p className={`text-xl font-semibold ${tone}`}>{value}</p>
    <p className="text-[9px] font-semibold tracking-[.12em] uppercase text-muted-foreground mt-0.5">{label}</p>
  </button>
);

const PortalCard = ({ icon: Icon, title, description, buttonLabel, onClick, actions, children }) => (
  <section className="border border-border bg-card px-4 py-3">
    <div className="grid xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4 items-center">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 border border-border bg-secondary flex items-center justify-center text-ocean shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-navy tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-5">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-0">
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:bg-ocean transition-colors"
      >
        {buttonLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
        {actions}
      </div>
    </div>
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

  const { data: complianceEntries = [] } = useQuery({
    queryKey: ['compliance-registers-dashboard'],
    queryFn: () => base44.entities.Compliance_Registers.list('-created_date', 300),
  });

  const { data: complianceDocuments = [] } = useQuery({
    queryKey: ['compliance-documents-dashboard'],
    queryFn: () => base44.entities.Compliance_Documents.list('-created_date', 100),
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

  const regulatorySummary = useMemo(() => {
    const open = complianceEntries.filter(e => e.status !== 'Closed');
    return {
      entries: complianceEntries.length,
      escalated: open.filter(e => e.status === 'Escalated' || e.risk_level === 'High').length,
      documents: complianceDocuments.length,
      auditReady: complianceEntries.length > 0 || complianceDocuments.length > 0 ? 'Ready' : 'Build',
    };
  }, [complianceEntries, complianceDocuments]);

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

      <main className="flex-1 p-4 md:p-5 max-w-7xl mx-auto w-full">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Advisor Portal</p>
            <h1 className="text-2xl font-semibold text-navy tracking-tight mt-1">Workspace index</h1>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl lg:text-right">
            Choose regulatory registers and audit packs, client FICA review, or proposal work.
          </p>
        </div>

        <div className="space-y-3">
          <PortalCard
            icon={ShieldCheck}
            title="1. Compliance Regulatory Portal"
            description="Registers, RMCP repository, training certificates, regulatory evidence, audit reports and FSCA inspection exports."
            buttonLabel="Open regulatory portal"
            onClick={() => navigate('/compliance')}
            actions={(
              <>
                <button
                  type="button"
                  onClick={() => navigate('/compliance?tab=registers')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Registers
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/compliance?tab=documents')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Document repository
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/compliance?tab=audit')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Audit report
                </button>
              </>
            )}
          >
            <Metric label="Register entries" value={regulatorySummary.entries} tone="text-navy" onClick={() => navigate('/compliance?tab=registers')} />
            <Metric label="Escalated / high risk" value={regulatorySummary.escalated} tone="text-red-700" onClick={() => navigate('/compliance?tab=registers')} />
            <Metric label="Repository docs" value={regulatorySummary.documents} tone="text-ocean" onClick={() => navigate('/compliance?tab=documents')} />
            <Metric label="Audit pack" value={regulatorySummary.auditReady} tone="text-teal" onClick={() => navigate('/compliance?tab=audit')} />
          </PortalCard>

          <PortalCard
            icon={UserCheck}
            title="2. Client Compliance"
            description="Review onboarding submissions, reverify unsuccessful clients, request documents, approve verified clients and move them into proposal phase."
            buttonLabel="Open client compliance"
            onClick={() => navigate('/compliance-review')}
            actions={(
              <>
                <button
                  type="button"
                  onClick={() => navigate('/compliance-review?filter=new')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  New submissions
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/compliance?tab=verification')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Reverify clients
                </button>
              </>
            )}
          >
            <Metric label="New submissions" value={complianceSummary.new} tone="text-blue-700" onClick={() => navigate('/compliance-review?filter=new')} />
            <Metric label="Manual review" value={complianceSummary.manualReview} tone="text-amber-700" onClick={() => navigate('/compliance-review?filter=manual_review')} />
            <Metric label="Awaiting documents" value={complianceSummary.awaitingDocuments} tone="text-orange-700" onClick={() => navigate('/compliance-review?filter=awaiting_documents')} />
            <Metric label="Ready for approval" value={complianceSummary.ready} tone="text-teal" onClick={() => navigate('/compliance-review?filter=ready')} />
          </PortalCard>

          <PortalCard
            icon={FolderKanban}
            title="3. Proposals"
            description="Build new proposals, continue draft ROAs, manage PDFs, send client packs and monitor signed reports."
            buttonLabel="Open proposals"
            onClick={() => navigate('/proposals')}
            actions={(
              <>
                <button
                  type="button"
                  onClick={() => navigate('/create-proposal')}
                  className="inline-flex items-center gap-2 border border-gold bg-gold text-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:bg-gold/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New proposal
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/proposals')}
                  className="inline-flex items-center gap-2 border border-border bg-card text-navy px-3 py-2 text-[10px] font-semibold uppercase tracking-[.08em] hover:border-navy/40 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Proposal inbox
                </button>
              </>
            )}
          >
            <Metric label="Awaiting review" value={proposalSummary.awaiting} />
            <Metric label="In progress" value={proposalSummary.inProgress} tone="text-gold" />
            <Metric label="Sent" value={proposalSummary.sent} tone="text-ocean" />
            <Metric label="Finalised" value={proposalSummary.finalised} tone="text-forest" />
          </PortalCard>
        </div>
      </main>
    </div>
  );
}
