import React, { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';

function formatNum(val) {
  if (!val && val !== 0) return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '—';
  return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProposalPreview({ proposal, investments = [], riskProducts = [], onGeneratePdf, onSend, canSend, isSending }) {
  const [copied, setCopied] = useState(false);
  const signingLink = `${window.location.origin}/sign?id=${proposal.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalInvestment = investments.reduce((s, inv) => s + (parseFloat(inv.amount) || 0) + (parseFloat(inv.recurring_amount) || 0), 0);
  const totalRisk = riskProducts.reduce((s, rp) => s + (parseFloat(rp.total_premium) || 0), 0);

  return (
    <div className="border border-border bg-card">
      <div className="bg-navy px-4 py-3.5 flex items-center justify-between">
        <div className="text-[13px] font-medium text-white">wealthworks</div>
        <div className="text-right text-[9px] text-white/60 leading-relaxed">
          <div>Financial proposal</div>
          <div>{proposal.reference} · {format(new Date(), 'dd-MM-yyyy')}</div>
        </div>
      </div>

      <div className="p-4">
        <div className="text-[9px] font-medium tracking-[.14em] uppercase text-ocean mb-1">Prepared for</div>
        <div className="text-[13px] font-medium text-navy mb-3 pb-2.5 border-b border-border">
          {proposal.client_name}
        </div>

        {/* Client snapshot */}
        <div className="mb-3 pb-3 border-b border-border">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-1.5">Client snapshot</div>
          {proposal.risk_profile && <PRow label="Risk profile" value={proposal.risk_profile} highlight />}
          {proposal.time_horizon && <PRow label="Time horizon" value={proposal.time_horizon} highlight />}
          {Array.isArray(proposal.advisory_needs) && proposal.advisory_needs.length > 0 && (
            <PRow label="Advisory needs" value={proposal.advisory_needs.join(', ')} />
          )}
        </div>

        {/* Investments */}
        {investments.length > 0 && (
          <div className="mb-3 pb-3 border-b border-border">
            <div className="text-[9px] font-medium tracking-[.12em] uppercase text-ocean mb-1.5">Investments</div>
            {investments.map((inv, i) => (
              <div key={inv.id || i} className="mb-2 last:mb-0">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-navy">{inv.provider}</span>
                  <span className="text-muted-foreground">{inv.jurisdiction}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{inv.product_type}</div>
                {inv.amount > 0 && <PRow label="Lump sum" value={`${inv.currency} ${Number(inv.amount).toLocaleString('en-ZA')}`} />}
                {inv.recurring_amount > 0 && <PRow label="Recurring" value={`${inv.currency} ${Number(inv.recurring_amount).toLocaleString('en-ZA')}`} />}
                {inv.initial_fee_percent > 0 && <PRow label="Initial fee" value={`${inv.initial_fee_percent}%`} />}
                {inv.annual_advice_fee_percent > 0 && <PRow label="Annual advice fee" value={`${inv.annual_advice_fee_percent}%`} />}
              </div>
            ))}
            {totalInvestment > 0 && (
              <div className="flex justify-between text-[11px] font-semibold text-ocean pt-1 border-t border-border mt-1">
                <span>Total investment</span>
                <span>{formatNum(totalInvestment)}</span>
              </div>
            )}
          </div>
        )}

        {/* Risk products */}
        {riskProducts.length > 0 && (
          <div className="mb-3 pb-3 border-b border-border">
            <div className="text-[9px] font-medium tracking-[.12em] uppercase text-teal mb-1.5">Risk cover</div>
            {riskProducts.map((rp, i) => (
              <div key={rp.id || i} className="mb-2 last:mb-0">
                <div className="text-[11px] font-semibold text-navy mb-1">{rp.provider}</div>
                {Array.isArray(rp._covers) && rp._covers.map((cover, ci) => (
                  <div key={ci} className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">{cover.cover_type}</span>
                    <span className="font-medium text-navy">{cover.premium > 0 ? `R ${Number(cover.premium).toLocaleString('en-ZA')} pm` : '—'}</span>
                  </div>
                ))}
                {rp.total_premium > 0 && (
                  <div className="flex justify-between text-[10px] font-semibold text-teal pt-0.5 border-t border-border mt-0.5">
                    <span>Subtotal</span>
                    <span>R {Number(rp.total_premium).toLocaleString('en-ZA')}</span>
                  </div>
                )}
              </div>
            ))}
            {totalRisk > 0 && (
              <div className="flex justify-between text-[11px] font-semibold text-teal pt-1 border-t border-border mt-1">
                <span>Total monthly premium</span>
                <span>R {Number(totalRisk).toLocaleString('en-ZA')}</span>
              </div>
            )}
          </div>
        )}

        {proposal.investment_rationale && (
          <div className="mb-3 pb-3 border-b border-border">
            <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-1">Suitability rationale</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{proposal.investment_rationale}</p>
          </div>
        )}

        {proposal.risk_cover_rationale && (
          <div className="mb-3 pb-3 border-b border-border">
            <div className="text-[9px] font-medium tracking-[.12em] uppercase text-navy mb-1">Risk cover rationale</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{proposal.risk_cover_rationale}</p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground italic">Does not constitute a binding offer. Subject to underwriting where applicable.</p>
      </div>

      {proposal.status === 'sent' || proposal.status === 'client_signed' ? (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-green-700 mb-1.5">
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
          <div className="flex gap-2 w-full">
            <button
              onClick={onGeneratePdf}
              className="border border-border text-muted-foreground px-3.5 py-2 text-[11px] font-medium tracking-[.08em] uppercase hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              📄 PDF
            </button>
            <button
              onClick={onSend}
              disabled={!canSend || isSending}
              className={`flex-1 py-2 text-[11px] font-medium tracking-[.08em] uppercase transition-colors ${
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

function PRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-ocean' : 'text-navy'}`}>{value || '—'}</span>
    </div>
  );
}