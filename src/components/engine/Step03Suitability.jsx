import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';

export default function Step03Suitability({ data, onFieldChange, investments, riskProducts, onNext }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const proposalId = data.id;

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
    <div className="max-w-5xl mx-auto space-y-3">
      {/* Products Recommended */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-1.5 border-b border-border bg-muted">
          <h2 className="text-[9px] font-semibold tracking-wider uppercase text-navy">Products Recommended</h2>
        </div>
        <div className="p-3 space-y-2">
          {/* Investments */}
          {investments.length > 0 && (
            <div>
              <p className="text-[8px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Investments</p>
              <div className="space-y-1">
                {investments.map(inv => (
                  <div key={inv.id} className="border border-border rounded-sm px-2 py-1 bg-background flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-semibold text-navy leading-none">{inv.provider}</p>
                      {inv.product_type && <p className="text-[8px] text-muted-foreground">{inv.product_type}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-[9px]">
                        <p className="text-muted-foreground">{inv.jurisdiction} · {inv.currency}</p>
                        {inv.amount > 0 && <p className="font-semibold text-navy">{inv.currency} {Number(inv.amount).toLocaleString('en-ZA')}</p>}
                        {inv.recurring_amount > 0 && <p className="text-muted-foreground">{inv.currency} {Number(inv.recurring_amount).toLocaleString('en-ZA')} pm</p>}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => navigate(`/proposal/${proposalId}/investment/${inv.id}`)}
                          className="p-0.5 text-muted-foreground hover:text-ocean transition-colors">
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => handleDeleteInvestment(inv.id)}
                          className="p-0.5 text-muted-foreground hover:text-danger transition-colors">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Products */}
          {riskProducts.length > 0 && (
            <div>
              <p className="text-[8px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Risk Products</p>
              <div className="space-y-1">
                {riskProducts.map(rp => (
                  <div key={rp.id} className="border border-border rounded-sm px-2 py-1 bg-background flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-semibold text-navy leading-none">{rp.provider}</p>
                      {(rp._covers || []).length > 0 && <p className="text-[8px] text-muted-foreground">{rp._covers.map(c => c.cover_type).join(', ')}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {rp.total_premium > 0 && (
                        <p className="text-[9px] font-semibold text-teal">R {Number(rp.total_premium).toLocaleString('en-ZA')} pm</p>
                      )}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => navigate(`/proposal/${proposalId}/risk-product/${rp.id}`)}
                          className="p-0.5 text-muted-foreground hover:text-ocean transition-colors">
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => handleDeleteRisk(rp.id)}
                          className="p-0.5 text-muted-foreground hover:text-danger transition-colors">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personalised Message */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h2 className="text-[9px] font-semibold tracking-wider uppercase text-navy mb-1.5">Personalised Message to Client</h2>
        <Textarea
          value={data.personal_message || ''}
          onChange={e => onFieldChange('personal_message', e.target.value)}
          placeholder="e.g. Dear A.B., Based on your answers I have prepared the following recommendation..."
          className="rounded-sm min-h-[64px] text-[12px] leading-relaxed"
        />
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="w-full bg-navy text-white py-2.5 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Sign & Send →
      </button>
    </div>
  );
}