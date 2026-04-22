import React, { useState } from 'react';
import { parseRandValue, formatRand, RISK_COVER_TYPES } from '@/lib/constants';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';

function formatNum(val) {
  if (!val) return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return val;
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProposalPreview({ proposal, onGeneratePdf, onSend, canSend, isSending }) {
  const [copied, setCopied] = useState(false);
  const signingLink = `${window.location.origin}/sign?id=${proposal.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const needs = Array.isArray(proposal.needs_array) ? proposal.needs_array : [];
  const hasInvestment = needs.includes('investment');
  const hasRiskCover = needs.includes('risk_cover');
  const riskCoverTypes = Array.isArray(proposal.risk_cover_types) ? proposal.risk_cover_types : [];
  const coverAmounts = proposal.risk_cover_amounts || {};
  const NEEDS_OWN_AMOUNT = ['dread_disease', 'lump_sum_disability', 'income_disability'];
  const selectedSpecialTypes = riskCoverTypes.filter(t => NEEDS_OWN_AMOUNT.includes(t));

  const invPrem = proposal.investment_amount || '—';
  const rcPrem = proposal.risk_cover_premium || '—';
  const t1 = parseRandValue(invPrem);
  const t2 = parseRandValue(rcPrem);
  const total = t1 + t2 > 0 ? formatRand(t1 + t2) : '—';

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="bg-navy px-4 py-3.5 flex items-center justify-between">
        <div className="text-[13px] font-medium text-white">wealthworks</div>
        <div className="text-right text-[9px] text-white/60 leading-relaxed">
          <div>Financial proposal</div>
          <div>{proposal.reference} · {format(new Date(), 'dd/MM/yyyy')}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="text-[9px] font-medium tracking-[.14em] uppercase text-ocean mb-1">Prepared for</div>
        <div className="text-[13px] font-medium text-navy mb-3 pb-2.5 border-b border-border">
          {proposal.client_name}
        </div>

        <Section title="Client snapshot">
          <PRow label="Needs identified" value={proposal.needs_identified} highlight />
          {hasInvestment && <PRow label="Risk profile" value={proposal.risk_profile} highlight />}
          {hasInvestment && <PRow label="Monthly budget" value={proposal.monthly_budget} highlight />}
          {hasInvestment && <PRow label="Time horizon" value={proposal.time_horizon} highlight />}
        </Section>

        {hasInvestment && (
          <Section title="Investment">
            <PRow label="Type" value={proposal.investment_type === 'offshore' ? `Offshore (${proposal.investment_currency || '—'})` : 'Local (ZAR)'} />
            <PRow label="Provider" value={proposal.investment_provider} />
            <PRow label="Amount" value={formatNum(proposal.investment_amount)} />
            <PRow label="Annual fee" value={proposal.investment_fee} />
          </Section>
        )}

        {hasRiskCover && (
          <Section title="Risk cover">
            <PRow label="Provider" value={proposal.risk_cover_provider} />
            <PRow label="Life cover sum assured" value={formatNum(proposal.risk_cover_amount)} />
            {/* Dread Disease / Disability sum assureds */}
            {selectedSpecialTypes.map(typeId => {
              const typeLabel = RISK_COVER_TYPES.find(t => t.id === typeId)?.label || typeId;
              const rowLabel = typeId === 'income_disability' ? `${typeLabel} (per month)` : typeLabel;
              return (
                <PRow key={typeId} label={rowLabel} value={formatNum(coverAmounts[typeId])} />
              );
            })}
            <PRow label="Monthly premium" value={formatNum(rcPrem)} />
          </Section>
        )}


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