import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';

const fmt = (value) => {
  if (!value && value !== 0) return '—';
  return Number(value).toLocaleString('en-ZA');
};

const RISK_BADGE = {
  Conservative: 'bg-slate-100 text-slate-700',
  Cautious: 'bg-blue-100 text-blue-700',
  Moderate: 'bg-green-100 text-green-700',
  Growth: 'bg-amber-100 text-amber-700',
  Aggressive: 'bg-red-100 text-red-700',
};

export default function ProposalSidePanel({ client, investments, riskProducts, proposal, proposalId }) {
  const navigate = useNavigate();

  const totalRiskPremium = riskProducts.reduce((sum, rp) => {
    return sum + (parseFloat(rp.total_premium) || 0);
  }, 0);

  const totalInvestment = investments.reduce((sum, inv) => {
    return sum + (parseFloat(inv.amount) || 0);
  }, 0);

  const ficaOk = client?.identity_document_uploaded && client?.proof_of_address_uploaded;

  return (
    <div className="w-80 shrink-0">
      <div className="sticky top-4 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">

        {/* Section 1 — Client Summary */}
        <div className="p-3 border-b border-slate-200 overflow-y-auto flex-1">
          <p className="text-[9px] font-bold tracking-[.12em] uppercase text-slate-400 mb-2">Client Summary</p>

          {!client ? (
            <p className="text-xs text-muted-foreground italic">No client linked</p>
          ) : (
            <>
              {/* Name & FICA */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-bold text-navy leading-tight">
                    {client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || '—'}
                  </p>
                  {(client.sa_id_number || client.passport_number) && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {client.sa_id_number || client.passport_number}
                    </p>
                  )}
                  {client.date_of_birth && (
                    <p className="text-[10px] text-muted-foreground">DOB: {client.date_of_birth}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {ficaOk ? (
                    <span className="flex items-center gap-1 text-[9px] text-green-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> FICA
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Circle className="w-3 h-3" /> FICA
                    </span>
                  )}
                </div>
              </div>

              {/* Risk Profile Badge */}
              {client.risk_profile && (
                <div className="mb-2">
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${RISK_BADGE[client.risk_profile] || 'bg-slate-100 text-slate-600'}`}>
                    {client.risk_profile}
                  </span>
                </div>
              )}

              {/* Key fields */}
              <div className="space-y-1 text-[10px]">
                {client.time_horizon && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wide">Time Horizon</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{client.time_horizon}</span>
                  </div>
                )}
                {client.primary_investment_objective && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wide">Objective</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{client.primary_investment_objective}</span>
                  </div>
                )}
                {client.gross_annual_income_band && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wide">Annual Income</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{client.gross_annual_income_band}</span>
                  </div>
                )}
                {client.monthly_investable_surplus && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-wide">Investable Surplus</span>
                    <span className="font-medium text-navy text-right max-w-[60%]">{client.monthly_investable_surplus}</span>
                  </div>
                )}
              </div>

              {/* Advisory Needs */}
              {Array.isArray(client.advisory_needs) && client.advisory_needs.length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Advisory Needs</p>
                  <div className="flex flex-wrap gap-1">
                    {client.advisory_needs.map(need => (
                      <span key={need} className="text-[9px] px-1.5 py-0.5 bg-ocean/10 text-ocean rounded font-medium">{need}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section 2 — Proposal Summary */}
        <div className="p-3 border-b border-slate-200 overflow-y-auto max-h-48">
          <p className="text-[9px] font-bold tracking-[.12em] uppercase text-slate-400 mb-2">Proposal Summary</p>

          {/* Risk Products */}
          {riskProducts.length > 0 && (
            <div className="mb-2">
              <p className="text-[9px] font-bold text-teal uppercase tracking-wide mb-1">Risk Products</p>
              {riskProducts.map((rp, i) => (
                <div key={rp.id || i} className="mb-1.5">
                  <p className="text-[10px] font-semibold text-navy">{rp.provider}</p>
                  {Array.isArray(rp._covers) && rp._covers.map((cover, ci) => (
                    <div key={ci} className="flex justify-between text-[9px] text-slate-500 pl-2">
                      <span>{cover.cover_type}</span>
                      <span>R {fmt(cover.premium)}</span>
                    </div>
                  ))}
                  {parseFloat(rp.total_premium) > 0 && (
                    <div className="flex justify-between text-[9px] font-semibold text-teal pl-2 border-t border-slate-100 mt-0.5 pt-0.5">
                      <span>Subtotal</span>
                      <span>R {fmt(rp.total_premium)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Investments */}
          {investments.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-ocean uppercase tracking-wide mb-1">Investments</p>
              {investments.map((inv, i) => (
                <div key={inv.id || i} className="mb-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold text-navy">{inv.provider || '—'}</span>
                    <span className="text-slate-500">{inv.jurisdiction}</span>
                  </div>
                  {inv.product_type && <p className="text-[9px] text-slate-500">{inv.product_type}</p>}
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{inv.currency} {fmt(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {riskProducts.length === 0 && investments.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">No products added yet</p>
          )}
        </div>

        {/* Section 3 — Totals + Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">Total Monthly Risk Premium</span>
              <span className="font-bold text-teal">R {fmt(totalRiskPremium)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">Total Investment Amount</span>
              <span className="font-bold text-ocean">R {fmt(totalInvestment)}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/proposal/${proposalId}/engine`)}
            className="w-full h-8 text-xs bg-navy text-white hover:bg-ocean rounded-sm"
          >
            Generate PDF
          </Button>
          <Button
            variant="outline"
            className="w-full h-8 text-xs border-navy text-navy hover:bg-navy hover:text-white rounded-sm"
          >
            Send to Client
          </Button>
        </div>
      </div>
    </div>
  );
}