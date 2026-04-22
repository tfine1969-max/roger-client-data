import React, { useState } from 'react';
import { parseRandValue, formatRand } from '@/lib/constants';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';

export default function ProposalPreview({ proposal, onGeneratePdf, onSend, canSend, isSending }) {
  const [copied, setCopied] = useState(false);
  const signingLink = `${window.location.origin}/sign?id=${proposal.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const r1prem = proposal.rec1_premium || '—';
  const r2prem = proposal.rec2_premium || '—';
  const t1 = parseRandValue(r1prem);
  const t2 = parseRandValue(r2prem);
  const total = t1 + t2 > 0 ? formatRand(t1 + t2) : '—';
  const hasRec3 = !!proposal.rec3_amount;

  return (
    <div className="border border-border bg-card sticky top-[60px]">
      {/* Header */}
      <div className="bg-navy px-4 py-3.5 flex items-center justify-between">
        <div className="text-[13px] font-medium text-white">wealthworks</div>
        <div className="text-right text-[9px] text-white/36 leading-relaxed">
          <div>Financial proposal</div>
          <div>{proposal.reference} · {format(new Date(), 'dd/MM/yyyy')}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="text-[9px] font-medium tracking-[.14em] uppercase text-ocean mb-1">Prepared for</div>
        <div className="text-[13px] font-medium text-navy mb-3 pb-2.5 border-b border-border">
          {proposal.client_name} · {proposal.risk_profile || '—'} risk · {proposal.time_horizon || '—'}
        </div>

        <Section title="Client snapshot">
          <PRow label="Needs identified" value={proposal.needs_identified} highlight />
          <PRow label="Risk profile" value={proposal.risk_profile} highlight />
          <PRow label="Monthly budget" value={proposal.monthly_budget} highlight />
          <PRow label="Time horizon" value={proposal.time_horizon} highlight />
        </Section>

        <Section title={proposal.rec1_category || 'Recommendation 1'}>
          <PRow label="Product / provider" value={proposal.rec1_provider} />
          <PRow label="Cover / amount" value={proposal.rec1_amount} />
          <PRow label="Monthly cost" value={r1prem} />
        </Section>

        <Section title={proposal.rec2_category || 'Recommendation 2'}>
          <PRow label="Product / provider" value={proposal.rec2_provider} />
          <PRow label="Cover / amount" value={proposal.rec2_amount} />
          <PRow label="Monthly cost" value={r2prem} />
        </Section>

        {hasRec3 && (
          <Section title={proposal.rec3_category || 'Recommendation 3'}>
            <PRow label="Amount / contribution" value={proposal.rec3_amount} />
          </Section>
        )}

        <Section title="Total monthly commitment">
          <PRow label="Rec 1" value={r1prem} />
          <PRow label="Rec 2" value={r2prem} />
          <div className="flex justify-between text-[13px] pt-2 mt-1.5 border-t border-navy">
            <span className="font-medium text-navy">Total</span>
            <span className="font-medium text-navy">{total}</span>
          </div>
        </Section>
      </div>

      {/* Signing link — shown after sent */}
      {proposal.status === 'sent' || proposal.status === 'client_signed' ? (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-forest mb-1.5">
            ✓ Proposal ready — share signing link with client
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-[11px] text-ocean bg-white border border-border px-2.5 py-1.5 truncate font-mono">
              {signingLink}
            </div>
            <button onClick={copyLink} className="flex-shrink-0 bg-navy text-white px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 hover:bg-ocean transition-colors">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {proposal.proposal_pdf_url && (
            <a href={proposal.proposal_pdf_url} target="_blank" rel="noopener noreferrer"
              className="block text-[11px] text-ocean underline mt-2">
              📄 Download proposal PDF
            </a>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 bg-muted border-t border-border flex items-center justify-between gap-2.5 flex-wrap">
          <p className="text-[10px] text-muted-foreground max-w-[180px] leading-relaxed">
            Does not constitute a binding offer. Subject to underwriting where applicable.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onGeneratePdf}
              className="border border-border text-muted-foreground px-3.5 py-2 text-[11px] font-medium tracking-[.08em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              📄 PDF
            </button>
            <button
              onClick={onSend}
              disabled={!canSend || isSending}
              className={`px-4 py-2 text-[11px] font-medium tracking-[.08em] uppercase transition-colors ${
                canSend ? 'bg-gold text-white hover:bg-gold/90' : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isSending ? 'Generating...' : 'Finalise & get signing link →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-3 pb-3 border-b border-border last:border-b-0 last:mb-0 last:pb-0">
      <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function PRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-ocean' : 'text-navy'}`}>{value || '—'}</span>
    </div>
  );
}