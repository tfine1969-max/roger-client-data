import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

function ReasonField({ entityId, entityType, initialValue }) {
  const [value, setValue] = useState(initialValue || '');
  const qc = useQueryClient();
  const save = useCallback(
    debounce(async (v) => {
      if (entityType === 'investment') {
        await base44.entities.Investments.update(entityId, { reason_for_recommendation: v });
        qc.invalidateQueries({ queryKey: ['investments'] });
      } else {
        await base44.entities.RiskProducts.update(entityId, { reason_for_recommendation: v });
        qc.invalidateQueries({ queryKey: ['riskProducts'] });
      }
    }, 1000),
    [entityId, entityType]
  );

  return (
    <div className="border-t border-border pt-2 mt-2">
      <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Reason for Recommendation</p>
      <textarea
        className="border border-border bg-muted text-[10px] text-foreground w-full outline-none p-1.5 resize-y min-h-[52px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm"
        value={value}
        onChange={e => { setValue(e.target.value); save(e.target.value); }}
        placeholder="Why is this product recommended for this client..."
      />
    </div>
  );
}

export default function Step02Recommendations({ proposalId, investments, riskProducts, onNext }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleDeleteInvestment = async (invId) => {
    if (!window.confirm('Delete this investment?')) return;
    await base44.entities.Investments.delete(invId);
    qc.invalidateQueries({ queryKey: ['investments', proposalId] });
  };

  const handleDeleteRisk = async (rpId) => {
    if (!window.confirm('Delete this risk product?')) return;
    await base44.entities.RiskProducts.delete(rpId);
    qc.invalidateQueries({ queryKey: ['riskProducts', proposalId] });
    qc.invalidateQueries({ queryKey: ['allRiskCovers', proposalId] });
  };

  return (
    <div className="space-y-4">
      {/* Investments */}
      <div className="bg-card border border-border overflow-hidden border-t-2 border-t-ocean">
        <div className="px-3 py-2.5 border-b border-border bg-muted flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Investments</span>
          <button
            onClick={() => navigate(`/proposal/${proposalId}/add-investment`)}
            className="flex items-center gap-1 bg-ocean text-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide hover:bg-sky transition-colors rounded-sm"
          >
            <Plus className="w-3 h-3" /> Add Investment
          </button>
        </div>
        <div className="p-3">
          {investments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No investments added yet. Click "Add Investment" to begin.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {investments.map((inv) => (
                <div key={inv.id} className="border border-border rounded-sm p-3 bg-background">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-navy">{inv.provider}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{inv.jurisdiction} · {inv.currency}</span>
                      <button onClick={() => navigate(`/proposal/${proposalId}/investment/${inv.id}`)}
                        className="p-0.5 text-muted-foreground hover:text-ocean transition-colors ml-1">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteInvestment(inv.id)}
                        className="p-0.5 text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-1">{inv.product_type}</div>
                  <div className="space-y-0.5 text-[10px]">
                    {inv.amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Lump sum</span><span className="font-medium text-navy">{inv.currency} {Number(inv.amount).toLocaleString('en-ZA')}</span></div>}
                    {inv.recurring_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Recurring</span><span className="font-medium text-navy">{inv.currency} {Number(inv.recurring_amount).toLocaleString('en-ZA')}</span></div>}
                    {inv.initial_fee_percent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Initial fee</span><span className="font-medium text-navy">{inv.initial_fee_percent}%</span></div>}
                    {inv.annual_advice_fee_percent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Annual fee</span><span className="font-medium text-navy">{inv.annual_advice_fee_percent}%</span></div>}
                    {Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Funds</span><span className="font-medium text-navy text-right max-w-[60%]">{inv.underlying_funds.join(', ')}</span></div>
                    )}
                  </div>
                  <ReasonField entityId={inv.id} entityType="investment" initialValue={inv.reason_for_recommendation} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Products */}
      <div className="bg-card border border-border overflow-hidden border-t-2 border-t-teal">
        <div className="px-3 py-2.5 border-b border-border bg-muted flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Risk Products</span>
          <button
            onClick={() => navigate(`/proposal/${proposalId}/add-risk-product`)}
            className="flex items-center gap-1 bg-teal text-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide hover:bg-teal/80 transition-colors rounded-sm"
          >
            <Plus className="w-3 h-3" /> Add Risk Product
          </button>
        </div>
        <div className="p-3">
          {riskProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No risk products added yet. Click "Add Risk Product" to begin.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {riskProducts.map((rp) => (
                <div key={rp.id} className="border border-border rounded-sm p-3 bg-background">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-semibold text-navy">{rp.provider}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/proposal/${proposalId}/risk-product/${rp.id}`)}
                        className="p-0.5 text-muted-foreground hover:text-ocean transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteRisk(rp.id)}
                        className="p-0.5 text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {(rp._covers || []).map((cover, ci) => (
                      <div key={ci} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{cover.cover_type}</span>
                        <div className="text-right">
                          {cover.amount_required > 0 && <div className="font-medium text-navy">R {Number(cover.amount_required).toLocaleString('en-ZA')}</div>}
                          {cover.premium > 0 && <div className="text-muted-foreground">R {Number(cover.premium).toLocaleString('en-ZA')} pm</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {rp.total_premium > 0 && (
                    <div className="flex justify-between text-[10px] font-semibold text-teal pt-1.5 border-t border-border mt-1.5">
                      <span>Total pm</span>
                      <span>R {Number(rp.total_premium).toLocaleString('en-ZA')}</span>
                    </div>
                  )}
                  <ReasonField entityId={rp.id} entityType="risk" initialValue={rp.reason_for_recommendation} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="w-full bg-navy text-white py-3.5 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Review →
      </button>
    </div>
  );
}