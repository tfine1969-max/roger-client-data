import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import ReasonChecklist from '@/components/engine/ReasonChecklist';
import { Textarea } from '@/components/ui/textarea';

const updateProductTypes = async (invList, proposalId) => {
  const selectedTypes = new Set();

  invList.forEach(inv => {
    const pt = String(inv.product_type || '').toLowerCase();
    const jur = String(inv.jurisdiction || '').toLowerCase();

    if (pt.includes('model portfolio')) selectedTypes.add('Model Portfolio');
    if (pt.includes('unit trust') || pt.includes('cis') || pt.includes('collective'))
      selectedTypes.add('Unit Trust / CIS');
    if (jur.includes('off') || (inv.currency && inv.currency !== 'ZAR' && inv.currency !== 'R'))
      selectedTypes.add('Offshore Investment Platform');
    if (pt.includes('private equity') || pt.includes('real estate') || pt.includes('unlisted') || pt.includes('alternative'))
      selectedTypes.add('Alternative Investment');
    if (pt.includes('share') || pt.includes('etf') || pt.includes('direct securities'))
      selectedTypes.add('Direct Securities');
  });

  const typesArray = Array.from(selectedTypes);
  const include_annexure_A = typesArray.includes('Model Portfolio');
  const include_annexure_B = typesArray.includes('Unit Trust / CIS') || typesArray.includes('Offshore Investment Platform');
  const include_annexure_C = typesArray.includes('Alternative Investment') || typesArray.includes('Direct Securities');

  const allProposals = await base44.entities.Proposal.list();
  const proposal = allProposals.find(p => p.id === proposalId);
  if (proposal) {
    await base44.entities.Proposal.update(proposalId, {
      selected_product_types: typesArray,
      include_annexure_A,
      include_annexure_B,
      include_annexure_C,
    });
  }
};

export default function Step02Recommendations({ proposalId, investments, riskProducts, proposal, onProposalFieldChange, onNext }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [allReasons, setAllReasons] = useState([]);
  const [investmentReasons, setInvestmentReasons] = useState([]);
  const [incomeReasons, setIncomeReasons] = useState([]);
  const [riskReasons, setRiskReasons] = useState([]);
  const [personalisedReasons, setPersonalisedReasons] = useState([]);

  useEffect(() => {
    base44.entities.RecommendationReasons.list().then(all => {
      setAllReasons(all);
      const active = all.filter(r => r.is_active !== false);
      setInvestmentReasons(active.filter(r => r.section_context === 'Investment Product Recommendation'));
      setIncomeReasons(active.filter(r => r.section_context === 'Investment Income Drawdown'));
      setRiskReasons(active.filter(r => r.section_context === 'Risk Product Recommendation'));
      setPersonalisedReasons(active.filter(r => r.section_context === 'Personalised Client Message'));
    });
  }, []);

  const resolveTexts = (ids) =>
    (ids || []).map(id => allReasons.find(r => r.id === id)).filter(Boolean);

  const handleDeleteInvestment = async (invId) => {
    if (!window.confirm('Delete this investment?')) return;
    await base44.entities.Investments.delete(invId);
    qc.invalidateQueries({ queryKey: ['investments', proposalId] });
    await updateProductTypes(investments.filter(i => i.id !== invId), proposalId);
  };

  const handleDeleteRisk = async (rpId) => {
    if (!window.confirm('Delete this risk product?')) return;
    await base44.entities.RiskProducts.delete(rpId);
    qc.invalidateQueries({ queryKey: ['riskProducts', proposalId] });
    qc.invalidateQueries({ queryKey: ['allRiskCovers', proposalId] });
  };

  useEffect(() => {
    updateProductTypes(investments, proposalId);
  }, [investments, proposalId]);

  const handlePersonalisedReasonsChange = async (ids) => {
    onProposalFieldChange('personalised_message_reasons', ids);
    const allProposals = await base44.entities.Proposal.list();
    const p = allProposals.find(x => x.id === proposalId);
    if (p) {
      const sentStatuses = ['Sent', 'Awaiting Client Signature', 'Signed'];
      await base44.entities.Proposal.update(proposalId, {
        personalised_message_reasons: ids,
        pdf_status: 'Outdated',
        ...(sentStatuses.includes(p.status) ? { status: 'Outdated' } : {}),
      });
    }
  };

  const handlePersonalisedMessageChange = async (text) => {
    onProposalFieldChange('personalised_client_message', text);
  };

  return (
    <div className="space-y-3">
      {/* Investments */}
      <div className="bg-card border border-border overflow-hidden border-t-2 border-t-ocean">
        <div className="px-3 py-2 border-b border-border bg-muted flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Investments</span>
          <button
            onClick={() => navigate(`/proposal/${proposalId}/add-investment`)}
            className="flex items-center gap-1 bg-ocean text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide hover:bg-sky transition-colors rounded-sm"
          >
            <Plus className="w-3 h-3" /> Add Investment
          </button>
        </div>
        <div className="p-2">
          {investments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No investments added yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {investments.map((inv) => (
                <div key={inv.id} className="border border-border rounded-sm p-2 bg-background">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-semibold text-navy">{inv.provider}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{inv.jurisdiction} · {inv.currency}</span>
                      <button onClick={() => navigate(`/proposal/${proposalId}/investment/${inv.id}`)}
                        className="p-0.5 text-muted-foreground hover:text-ocean transition-colors ml-1">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => handleDeleteInvestment(inv.id)}
                        className="p-0.5 text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                  {inv.product_type && <div className="text-[9px] text-muted-foreground mb-1">{inv.product_type}</div>}
                  <div className="space-y-px text-[9px]">
                    {inv.amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Lump sum</span><span className="font-medium text-navy">{inv.currency} {Number(inv.amount).toLocaleString('en-ZA')}</span></div>}
                    {inv.recurring_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Recurring</span><span className="font-medium text-navy">{inv.currency} {Number(inv.recurring_amount).toLocaleString('en-ZA')}</span></div>}
                    {(() => {
                      const ann = inv.applicable_annexure;
                      const mandate = inv.investment_mandate === 'Yes';
                      const fmt = (v) => `${Number(v).toFixed(2)}%`;
                      if (mandate && ann === 'B') return (
                        <>
                          {inv.management_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Mgmt fee</span><span className="font-medium text-navy">{fmt(inv.management_fee_percent)}</span></div>}
                          {inv.performance_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Perf fee</span><span className="font-medium text-navy">{fmt(inv.performance_fee_percent)}</span></div>}
                          {inv.hurdle_rate_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Hurdle</span><span className="font-medium text-navy">{fmt(inv.hurdle_rate_percent)}</span></div>}
                        </>
                      );
                      if (mandate && ann === 'C') return (
                        <>
                          {inv.management_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Mgmt fee</span><span className="font-medium text-navy">{fmt(inv.management_fee_percent)}</span></div>}
                          {inv.structuring_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Structuring fee</span><span className="font-medium text-navy">{fmt(inv.structuring_fee_percent)}</span></div>}
                          {inv.carry_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Carry fee</span><span className="font-medium text-navy">{fmt(inv.carry_fee_percent)}</span></div>}
                        </>
                      );
                      return (
                        <>
                          {inv.initial_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Initial fee</span><span className="font-medium text-navy">{fmt(inv.initial_fee_percent)}</span></div>}
                          {inv.annual_advice_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Annual fee</span><span className="font-medium text-navy">{fmt(inv.annual_advice_fee_percent)}</span></div>}
                          {inv.platform_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="font-medium text-navy">{fmt(inv.platform_fee_percent)}</span></div>}
                        </>
                      );
                    })()}
                    {Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Funds</span><span className="font-medium text-navy text-right max-w-[60%]">{inv.underlying_funds.join(', ')}</span></div>
                    )}
                  </div>

                  {/* Income requirement summary */}
                  {inv.income_required === 'Yes' ? (
                    <div className="border-t border-border mt-1.5 pt-1.5 space-y-px text-[9px]">
                      <div className="text-[9px] font-semibold text-ocean uppercase tracking-wide mb-0.5">Income Requirement</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Income required</span><span className="font-medium text-navy">Yes</span></div>
                      {inv.income_type && <div className="flex justify-between"><span className="text-muted-foreground">Income basis</span><span className="font-medium text-navy">{inv.income_type}</span></div>}
                      {inv.income_type === 'Percentage' && inv.income_percentage > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Income amount</span><span className="font-medium text-navy">{Number(inv.income_percentage).toFixed(2)}%</span></div>
                      )}
                      {inv.income_type === 'Fixed Amount' && inv.income_amount > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Income amount</span><span className="font-medium text-navy">{inv.currency || 'R'} {Number(inv.income_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>
                      )}
                      {inv.income_frequency && <div className="flex justify-between"><span className="text-muted-foreground">Frequency</span><span className="font-medium text-navy">{inv.income_frequency}</span></div>}
                    </div>
                  ) : (
                    <div className="border-t border-border mt-1.5 pt-1 text-[9px] text-muted-foreground italic">No income drawdown required.</div>
                  )}

                  {/* Investment Recommendation Rationale */}
                  {(inv.investment_recommendation_reasons || []).length > 0 && (
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <p className="text-[9px] font-semibold text-ocean uppercase tracking-wide mb-1">Investment Rationale</p>
                      <ul className="space-y-0.5">
                        {resolveTexts(inv.investment_recommendation_reasons).map((r, i) => (
                          <li key={i} className="text-[9px] text-foreground flex items-start gap-1">
                            <span className="text-ocean shrink-0 mt-0.5">–</span> {r.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Income Drawdown Rationale */}
                  {inv.income_required === 'Yes' && (inv.income_drawdown_reasons || []).length > 0 && (
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <p className="text-[9px] font-semibold text-teal uppercase tracking-wide mb-1">Income Drawdown Rationale</p>
                      <ul className="space-y-0.5">
                        {resolveTexts(inv.income_drawdown_reasons).map((r, i) => (
                          <li key={i} className="text-[9px] text-foreground flex items-start gap-1">
                            <span className="text-teal shrink-0 mt-0.5">–</span> {r.text}
                          </li>
                        ))}
                      </ul>
                      {inv.income_notes && <p className="text-[9px] text-muted-foreground italic mt-1">{inv.income_notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Products */}
      <div className="bg-card border border-border overflow-hidden border-t-2 border-t-teal">
        <div className="px-3 py-2 border-b border-border bg-muted flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[.06em] uppercase text-navy">Risk Products</span>
          <button
            onClick={() => navigate(`/proposal/${proposalId}/add-risk-product`)}
            className="flex items-center gap-1 bg-teal text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide hover:bg-teal/80 transition-colors rounded-sm"
          >
            <Plus className="w-3 h-3" /> Add Risk Product
          </button>
        </div>
        <div className="p-2">
          {riskProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No risk products added yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {riskProducts.map((rp) => (
                <div key={rp.id} className="border border-border rounded-sm p-2 bg-background">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-navy">{rp.provider}</span>
                    <div className="flex items-center gap-1">
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
                  <div className="space-y-px">
                    {(rp._covers || []).map((cover, ci) => (
                      <div key={ci} className="flex justify-between text-[9px]">
                        <span className="text-muted-foreground">{cover.cover_type}</span>
                        <div className="text-right">
                          {cover.amount_required > 0 && <div className="font-medium text-navy">R {Number(cover.amount_required).toLocaleString('en-ZA')}</div>}
                          {cover.premium > 0 && <div className="text-muted-foreground">R {Number(cover.premium).toLocaleString('en-ZA')} pm</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {rp.total_premium > 0 && (
                    <div className="flex justify-between text-[9px] font-semibold text-teal pt-1 border-t border-border mt-1">
                      <span>Total pm</span>
                      <span>R {Number(rp.total_premium).toLocaleString('en-ZA')}</span>
                    </div>
                  )}

                  {/* Risk Recommendation Rationale */}
                  {(rp.risk_recommendation_reasons || []).length > 0 && (
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <p className="text-[9px] font-semibold text-teal uppercase tracking-wide mb-1">Risk Rationale</p>
                      <ul className="space-y-0.5">
                        {resolveTexts(rp.risk_recommendation_reasons).map((r, i) => (
                          <li key={i} className="text-[9px] text-foreground flex items-start gap-1">
                            <span className="text-teal shrink-0 mt-0.5">–</span> {r.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personalised Client Message */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h2 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Personalised Message to Client</h2>
        <p className="text-[10px] text-muted-foreground mb-3">Select relevant message statements and/or type a personalised message.</p>
        <ReasonChecklist
          reasons={personalisedReasons}
          selectedIds={proposal?.personalised_message_reasons}
          onChange={handlePersonalisedReasonsChange}
        />
        <div className="mt-3">
          <Textarea
            placeholder="Or type a personalised message..."
            value={proposal?.personalised_client_message || ''}
            onChange={e => handlePersonalisedMessageChange(e.target.value)}
            className="rounded-sm min-h-[64px] text-xs"
          />
        </div>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="w-full bg-navy text-white py-3 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Review →
      </button>
    </div>
  );
}