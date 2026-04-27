import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import PhraseLibrary, { LibraryButton } from '@/components/engine/PhraseLibrary';

function ReasonField({ entityId, entityType, initialValue }) {
  const [value, setValue] = useState(initialValue || '');
  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
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

  const handlePhraseSelect = (phrase) => {
    const separator = value && !value.trim().endsWith('.') ? '. ' : value ? ' ' : '';
    const newVal = value + separator + phrase;
    setValue(newVal);
    save(newVal);
  };

  return (
    <div className="border-t border-border mt-1.5 pt-1">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase text-left"
        >
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          Reason {value ? '✓' : ''}
        </button>
        <LibraryButton onOpen={() => { setOpen(true); setLibraryOpen(true); }} />
      </div>
      {open && (
        <textarea
          className="border border-border bg-muted text-[10px] text-foreground w-full outline-none p-1.5 resize-none min-h-[48px] leading-relaxed focus:border-ocean transition-colors placeholder:text-muted-foreground/50 placeholder:italic rounded-sm mt-1"
          value={value}
          onChange={e => { setValue(e.target.value); save(e.target.value); }}
          placeholder="Why is this product recommended for this client..."
        />
      )}
      {libraryOpen && (
        <PhraseLibrary
          onSelect={handlePhraseSelect}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}

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

  await base44.entities.Proposal.update(proposalId, {
    selected_product_types: typesArray,
    include_annexure_A,
    include_annexure_B,
    include_annexure_C,
  });
};

export default function Step02Recommendations({ proposalId, investments, riskProducts, onNext }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  // Run auto-detection on Step 02 load with all current investments
  useEffect(() => {
    updateProductTypes(investments, proposalId);
  }, [investments, proposalId]);

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
                      if (mandate && ann === 'B') return (
                        <>
                          {inv.management_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Mgmt fee</span><span className="font-medium text-navy">{inv.management_fee_percent}%</span></div>}
                          {inv.performance_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Perf fee</span><span className="font-medium text-navy">{inv.performance_fee_percent}%</span></div>}
                          {inv.hurdle_rate_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Hurdle</span><span className="font-medium text-navy">{inv.hurdle_rate_percent}%</span></div>}
                        </>
                      );
                      if (mandate && ann === 'C') return (
                        <>
                          {inv.management_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Mgmt fee</span><span className="font-medium text-navy">{inv.management_fee_percent}%</span></div>}
                          {inv.structuring_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Structuring fee</span><span className="font-medium text-navy">{inv.structuring_fee_percent}%</span></div>}
                          {inv.raising_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Raising fee</span><span className="font-medium text-navy">{inv.raising_fee_percent}%</span></div>}
                          {inv.carry_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Carry fee</span><span className="font-medium text-navy">{inv.carry_fee_percent}%</span></div>}
                          {inv.carry_hurdle_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Carry hurdle</span><span className="font-medium text-navy">{inv.carry_hurdle_percent}%</span></div>}
                        </>
                      );
                      // No mandate OR Annexure A
                      return (
                        <>
                          {inv.initial_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Initial fee</span><span className="font-medium text-navy">{inv.initial_fee_percent}%</span></div>}
                          {inv.annual_advice_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Annual fee</span><span className="font-medium text-navy">{inv.annual_advice_fee_percent}%</span></div>}
                          {inv.platform_fee_percent != null && <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="font-medium text-navy">{inv.platform_fee_percent}%</span></div>}
                        </>
                      );
                    })()}
                    {Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Funds</span><span className="font-medium text-navy text-right max-w-[60%]">{inv.underlying_funds.join(', ')}</span></div>
                    )}
                  </div>
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
                      {inv.income_notes && <div className="text-muted-foreground mt-0.5 italic leading-snug">{inv.income_notes}</div>}
                    </div>
                  ) : (
                    <div className="border-t border-border mt-1.5 pt-1 text-[9px] text-muted-foreground italic">No income drawdown required from this investment.</div>
                  )}
                  <ReasonField entityId={inv.id} entityType="investment" initialValue={inv.reason_for_recommendation} />
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
        className="w-full bg-navy text-white py-3 text-[11px] font-semibold tracking-[.1em] uppercase hover:bg-ocean transition-colors flex items-center justify-center gap-2"
      >
        Next: Review →
      </button>
    </div>
  );
}