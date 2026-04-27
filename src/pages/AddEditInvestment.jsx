import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PhraseLibrary, { LibraryButton } from '@/components/engine/PhraseLibrary';
 
const PROVIDER_MAP = {
  Local: {
    'Allan Gray': { products: ['Unit Trust / Discretionary Investment','Endowment','Retirement Annuity','Living Annuity','Preservation Fund'] },
    'Glacier by Sanlam': { products: ['Unit Trust / LISP Platform','Endowment','Retirement Annuity','Living Annuity','Preservation Fund','Tax-Free Investment'] },
    'Momentum Wealth': { products: ['Unit Trust / LISP Platform','Endowment','Retirement Annuity','Living Annuity','Preservation Fund','Tax-Free Investment'] },
    'Prime Investments': { products: ['Discretionary Investment','Endowment'] },
  },
  Offshore: {
    'Allan Gray': { products: ['Offshore Unit Trust','Offshore Investment Platform','Offshore Discretionary Investment'] },
    'Credo': { products: ['Offshore Investment Platform','Offshore Discretionary Portfolio','Offshore Share Portfolio','Offshore Model Portfolio'] },
    'Glacier International': { products: ['Offshore Investment Platform','Offshore Investment Bond','Offshore Endowment','Offshore Discretionary Portfolio','Offshore Model Portfolio'] },
    'Julius Baer': { products: ['Offshore Discretionary Portfolio','Offshore Model Portfolio','Offshore Share Portfolio'] },
    'Momentum Wealth International': { products: ['Offshore Investment Platform','Offshore Discretionary Portfolio'] },
  },
};

const LOCAL_FUNDS = [
  'Allan Gray - Orbis Global Balanced Feeder Fund','Allan Gray - Orbis Global Equity Feeder Fund',
  'Allan Gray Balanced Fund','Allan Gray Equity Fund','Allan Gray Money Market Fund','Allan Gray Stable Fund',
  'Allan Gray Tax-Free Balanced Fund','Allan Gray Tax-Free Balanced Fund (Class A)',
  'Full Withdrawal Holding Fund','Partial Withdrawal Holding Fund',
  'Coronation Balanced Defensive Fund (Class P)','Coronation Balanced Plus Fund (Class P)',
  'Coronation Capital Plus Fund (Class P)','Coronation Global Managed [ZAR] Feeder Fund (Class P)',
  'Coronation Global Opportunities Equity [ZAR] Feeder Fund (Class P)','Coronation Strategic Income Fund (Class P)',
  'Foord Balanced Fund (Class B2)','Foord Equity Fund (Class B2)','Foord International Feeder Fund (Class B2)',
  'M&G Balanced Fund (Class B)','M&G Dividend Maximiser Fund (Class B)','M&G Equity Fund (Class B)','M&G Inflation Plus Fund (Class B)',
  'Nedgroup Investments Stable Fund (Class A)','Nedgroup Investments Stable Fund (Class A2)',
  'Ninety One Cautious Managed Fund (Class H)','Ninety One Diversified Income Fund (Class H)',
  'Ninety One Equity Fund (Class E)','Ninety One Global Franchise Feeder Fund (Class H)','Ninety One Value Fund (Class H)',
  'Old Mutual Global Equity Fund (Class B1)','Prescient Income Provider Fund (Class A2)',
  'STANLIB Property Income Fund (Class C3)','Satrix ALSI Index Fund (Class B1)','Satrix MSCI World Index Fund (Class B2)',
  'Wealthworks Prime Cautious Fund of Funds (Class A)','Wealthworks Prime Managed Fund of Funds (Class A)',
];

const OFFSHORE_FUNDS = [
  'Allan Gray Money Market Fund (ZAR)','Orbis Global Equity Fund (USD) (Class RRFA)',
  'Orbis Optimal SA Fund (EUR) (Class A)','Orbis Optimal SA Fund (USD) (Class A)',
  'Orbis SICAV Emerging Markets Equity Fund (USD) (Class RRFA)','Orbis SICAV Global Balanced Fund (USD) (Class RRFA)',
  'Orbis SICAV Global Cautious Fund (USD) (Class RRFC)','Orbis SICAV Japan Equity Fund (JPY) (Class RRFA)',
  'Allan Gray Africa Bond Fund (USD) (Class C)','Allan Gray Africa ex-SA Equity Fund (USD) (Class C)',
  'Allan Gray Frontier Markets Equity Fund (USD) (Class C)','Allan Gray Australia Balanced Fund (AUD)',
  'Allan Gray Australia Equity Fund (AUD) (Class A)','Allan Gray Australia Stable Fund (AUD)',
  'Artisan Global Value Fund (USD) (Class I)',
  'Baillie Gifford Worldwide Emerging Markets Leading Companies Fund (USD) (Class B)',
  'Baillie Gifford Worldwide Long Term Global Growth Fund (USD) (Class B)',
  'Catalyst Global Real Estate UCITS Fund (USD) (Class B)',
  'Coronation Global Capital Plus Fund (GBP hedged) (Class P)','Coronation Global Capital Plus Fund (USD hedged) (Class P)',
  'Coronation Global Emerging Markets Fund (USD) (Class P)','Coronation Global Equity Select Fund (USD) (Class P)',
  'Coronation Global Managed Fund (USD) (Class P)','Coronation Global Opportunities Equity Fund (USD) (Class P)',
  'Coronation Global Optimum Growth Fund (USD) (Class P)','Coronation Global Strategic USD Income Fund (USD) (Class P)',
  'Dodge & Cox U.S. Stock Fund (USD)','Dodge & Cox Worldwide Global Stock Fund (USD)',
  'Fundsmith Equity Fund (GBP) (Class I)','M&G Global Balanced Fund (USD) (Class B)','M&G Global Inflation Plus Fund (USD) (Class B)',
  'Nedgroup Investments Core Global Fund (USD) (Class C)','Nedgroup Investments Global Cautious Fund (USD) (Class C)',
  'Nedgroup Investments Global Equity Fund (USD) (Class C)','Nedgroup Investments Global Flexible Fund (USD) (Class C)',
  'Nedgroup Investments Global Property Fund (USD) (Class C)',
  'Ninety One Global Franchise Fund (USD) (Class I)','Ninety One Global Managed Income Fund (USD) (Class I)',
  'Ninety One Global Strategic Managed Fund (GBP hedged) (Class I)','Ninety One Global Strategic Managed Fund (USD) (Class I)',
  'iShares Emerging Markets Equity Index Fund (USD) (Class F2)','iShares Europe Equity Index Fund (EUR) (Class D2)',
  'iShares Global Government Bond Index Fund (USD) (Class F2)','iShares North America Equity Index Fund (USD) (Class F2)',
  'iShares World Equity Index Fund (USD) (Class F2)',
  'Wealthworks Global Flexible Fund','Xhaos Special Opportunities Fund',
];

const CURRENCIES_OFFSHORE = ['USD','GBP','EUR','AUD'];
const FREQUENCIES = ['Monthly','Quarterly','Annually'];

const detectAnnexure = (productType, jurisdiction) => {
  const pt = String(productType || '').toLowerCase();
  if (pt.includes('model portfolio') || pt.includes('discretionary')) return 'A';
  if (pt.includes('unit trust') || pt.includes('lisp') || pt.includes('platform') ||
      pt.includes('bond') || pt.includes('endowment') || pt.includes('offshore')) return 'B';
  if (pt.includes('share portfolio') || pt.includes('direct')) return 'C';
  return 'B';
};

const ANNEXURE_LABELS = {
  A: 'Annexure A — Model / Discretionary Portfolios',
  B: 'Annexure B — Collective Investments & Offshore Platforms',
  C: 'Annexure C — Alternative Investments & Direct Securities',
};

const emptyRow = () => ({ fund: '', allocation: '', customFund: '' });

const fmtFee = (val) => {
  if (val === null || val === undefined || val === '') return '';
  return String(val);
};

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();
  const isLoadingRef = useRef(true);
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState({
    investment_mandate: 'No', applicable_annexure: '',
    jurisdiction: 'Local', currency: 'ZAR',
    provider: '', product_type: '', fund_rows: [emptyRow()], custom_fund: '',
    lump_sum: false, recurring: false, lump_sum_amount: '', recurring_amount: '', frequency: '',
    initial_fee_percent: '', annual_advice_fee_percent: '', platform_fee_percent: '',
    management_fee_percent: '', performance_fee_percent: '', hurdle_rate_percent: '',
    structuring_fee_percent: '', raising_fee_percent: '', carry_fee_percent: '', carry_hurdle_percent: '',
    reason_for_recommendation: '',
  });

  const [amtDisplay, setAmtDisplay] = useState('');
  const [recDisplay, setRecDisplay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [allocError, setAllocError] = useState('');

  const { data: inv } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: async () => {
      if (!investmentId) return null;
      const all = await base44.entities.Investments.list();
      return all.find(i => i.id === investmentId) || null;
    },
    enabled: !!investmentId,
  });

  useEffect(() => {
    if (!inv) return;
    console.log('[AddEditInvestment] inv loaded:', JSON.stringify(inv, null, 2));
    isLoadingRef.current = true;
    setLoaded(false);

    const isRec  = inv.contribution_type === 'Recurring' || inv.contribution_type === 'Both';
    const isLump = inv.contribution_type === 'Lump Sum'  || inv.contribution_type === 'Both';

    let fund_rows = [emptyRow()];
    if (Array.isArray(inv.fund_allocations) && inv.fund_allocations.length > 0) {
      fund_rows = inv.fund_allocations.map(r => ({
        fund: r.fund || '',
        allocation: r.allocation || '',
        customFund: r.customFund || '',
      }));
    } else if (Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0) {
      fund_rows = inv.underlying_funds.map(f => {
        // Parse "Fund Name (50%)" format back into fund + allocation
        const match = String(f).match(/^(.+?)\s*\((\d+(?:\.\d+)?)%\)$/);
        if (match) return { fund: match[1].trim(), allocation: match[2], customFund: '' };
        return { fund: f, allocation: '', customFund: '' };
      });
    }

    setForm({
      investment_mandate:        inv.investment_mandate        || 'No',
      applicable_annexure:       inv.applicable_annexure       || '',
      jurisdiction:              inv.jurisdiction              || 'Local',
      currency:                  inv.currency                  || 'ZAR',
      provider:                  inv.provider                  || '',
      product_type:              inv.product_type              || '',
      fund_rows,
      custom_fund:               inv.custom_fund               || '',
      lump_sum:                  isLump,
      recurring:                 isRec,
      lump_sum_amount:           inv.amount                    || '',
      recurring_amount:          inv.recurring_amount          || '',
      frequency:                 inv.frequency                 || '',
      initial_fee_percent:       fmtFee(inv.initial_fee_percent),
      annual_advice_fee_percent: fmtFee(inv.annual_advice_fee_percent),
      platform_fee_percent:      fmtFee(inv.platform_fee_percent),
      management_fee_percent:    fmtFee(inv.management_fee_percent),
      performance_fee_percent:   fmtFee(inv.performance_fee_percent),
      hurdle_rate_percent:       fmtFee(inv.hurdle_rate_percent),
      structuring_fee_percent:   fmtFee(inv.structuring_fee_percent),
      raising_fee_percent:       fmtFee(inv.raising_fee_percent),
      carry_fee_percent:         fmtFee(inv.carry_fee_percent),
      carry_hurdle_percent:      fmtFee(inv.carry_hurdle_percent),
      reason_for_recommendation: inv.reason_for_recommendation || '',
    });

    if (inv.amount)           setAmtDisplay(Number(inv.amount).toLocaleString('en-ZA'));
    if (inv.recurring_amount) setRecDisplay(Number(inv.recurring_amount).toLocaleString('en-ZA'));

    setTimeout(() => {
      isLoadingRef.current = false;
      setLoaded(true);
    }, 200);
  }, [inv]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    if (form.investment_mandate === 'Yes' && form.product_type) {
      if (form.applicable_annexure) return; // don't override a saved value
      const detected = detectAnnexure(form.product_type, form.jurisdiction);
      setForm(p => ({ ...p, applicable_annexure: detected }));
    }
  }, [form.product_type, form.jurisdiction, form.investment_mandate]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) {
        await base44.entities.Investments.update(investmentId, data);
      } else {
        await base44.entities.Investments.create({ ...data, proposal_id: proposalId });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      const allInvestments = await base44.entities.Investments.list();
      const proposalInvs   = allInvestments.filter(i => i.proposal_id === proposalId);
      const mandateInvs    = proposalInvs.filter(i => i.investment_mandate === 'Yes');
      await base44.entities.Proposal.update(proposalId, {
        mandate_included:   mandateInvs.length > 0 ? 'Yes' : 'No',
        include_annexure_A: mandateInvs.some(i => i.applicable_annexure === 'A'),
        include_annexure_B: mandateInvs.some(i => i.applicable_annexure === 'B'),
        include_annexure_C: mandateInvs.some(i => i.applicable_annexure === 'C'),
      });
    },
    onSuccess: () => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } }),
  });

  const totalAlloc = form.fund_rows.reduce((s, r) => s + (parseFloat(r.allocation) || 0), 0);
  const multiRow   = form.fund_rows.length > 1;

  const validate = () => {
    if (!multiRow) return true;
    const filled = form.fund_rows.filter(r => r.fund);
    if (filled.length <= 1) return true;
    const total = filled.reduce((s, r) => s + (parseFloat(r.allocation) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      setAllocError(`Allocations must total 100%. Current: ${total.toFixed(1)}%`);
      return false;
    }
    setAllocError('');
    return true;
  };

  const addRow    = () => setForm(p => ({ ...p, fund_rows: [...p.fund_rows, emptyRow()] }));
  const removeRow = (i) => { setForm(p => ({ ...p, fund_rows: p.fund_rows.filter((_, idx) => idx !== i) })); setAllocError(''); };
  const updateRow = (i, field, val) => {
    setForm(p => ({ ...p, fund_rows: p.fund_rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));
    setAllocError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const contrib   = form.lump_sum && form.recurring ? 'Both' : form.lump_sum ? 'Lump Sum' : 'Recurring';
    const activeAnn = form.applicable_annexure || detectAnnexure(form.product_type, form.jurisdiction);
    const underlying_funds = form.fund_rows.filter(r => r.fund).map(r => {
      const name = r.fund === '__custom__' ? (r.customFund || 'Custom Fund') : r.fund;
      return multiRow && r.allocation ? `${name} (${r.allocation}%)` : name;
    });
    saveMutation.mutate({
      investment_mandate:        form.investment_mandate,
      applicable_annexure:       form.investment_mandate === 'Yes' ? activeAnn : null,
      jurisdiction:              form.jurisdiction,
      currency:                  form.currency,
      provider:                  form.provider,
      product_type:              form.product_type,
      fund_allocations:          form.fund_rows,
      underlying_funds,
      custom_fund:               form.custom_fund,
      contribution_type:         contrib,
      amount:                    parseFloat(String(form.lump_sum_amount).replace(/[\s,]/g,''))  || 0,
      recurring_amount:          parseFloat(String(form.recurring_amount).replace(/[\s,]/g,'')) || 0,
      frequency:                 form.frequency,
      initial_fee_percent:       parseFloat(form.initial_fee_percent)       || 0,
      annual_advice_fee_percent: parseFloat(form.annual_advice_fee_percent) || 0,
      platform_fee_percent:      parseFloat(form.platform_fee_percent)      || 0,
      management_fee_percent:    parseFloat(form.management_fee_percent)    || 0,
      performance_fee_percent:   parseFloat(form.performance_fee_percent)   || 0,
      hurdle_rate_percent:       parseFloat(form.hurdle_rate_percent)       || 0,
      structuring_fee_percent:   parseFloat(form.structuring_fee_percent)   || 0,
      raising_fee_percent:       parseFloat(form.raising_fee_percent)       || 0,
      carry_fee_percent:         parseFloat(form.carry_fee_percent)         || 0,
      carry_hurdle_percent:      parseFloat(form.carry_hurdle_percent)      || 0,
      reason_for_recommendation: form.reason_for_recommendation,
    });
    setSubmitting(false);
  };

  const handleJurisdiction = (val) => {
    isLoadingRef.current = false;
    setForm(p => ({ ...p, jurisdiction: val, currency: val === 'Local' ? 'ZAR' : 'USD', provider: '', product_type: '', fund_rows: [emptyRow()] }));
  };
  const handleProvider = (val) => {
    if (val === form.provider) return;
    isLoadingRef.current = false;
    setForm(p => ({ ...p, provider: val, product_type: '', fund_rows: [emptyRow()], reason_for_recommendation: '' }));
  };
  const handleProduct = (val) => {
    if (val === form.product_type) return;
    isLoadingRef.current = false;
    setForm(p => ({ ...p, product_type: val, fund_rows: [emptyRow()] }));
  };
  const setF = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const providers = Object.keys(PROVIDER_MAP[form.jurisdiction] || {});
  const products  = form.provider ? (PROVIDER_MAP[form.jurisdiction]?.[form.provider]?.products || []) : [];
  const funds     = form.jurisdiction === 'Offshore' ? OFFSHORE_FUNDS : LOCAL_FUNDS;
  const activeAnn = form.applicable_annexure || detectAnnexure(form.product_type, form.jurisdiction);

  const staticField = (value) => (
    <div className="h-8 text-xs rounded-sm border border-border bg-muted/50 px-3 flex items-center text-navy font-medium">
      {value || '—'}
    </div>
  );

  const feeInput = (label, field) => (
    <div>
      <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
      <div className="relative">
        <Input type="number" step="0.01"
          value={form[field]}
          onChange={e => setF(field, e.target.value)}
          placeholder="0.00" className="h-8 text-xs rounded-sm pr-6" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
      </div>
    </div>
  );

  const tog = (active) =>
    `flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-colors flex-1 text-xs font-medium ${
      active ? 'border-teal bg-teal/5 text-teal' : 'border-border text-navy hover:border-teal/50'
    }`;

  const isEdit = !!investmentId;
  const showStatic = isEdit && !loaded;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <button onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Step 2
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-base font-bold text-navy mb-0.5">{isEdit ? 'Edit Investment' : 'Add Investment'}</h1>
        <p className="text-xs text-muted-foreground mb-3">{isEdit ? 'Update investment details' : 'Create a new investment recommendation'}</p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── MANDATE ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Discretionary Mandate</h3>
            <div className="flex items-start gap-6">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Subject to discretionary mandate?</Label>
                <div className="flex gap-1.5">
                  {['Yes','No'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => { isLoadingRef.current = false; setForm(p => ({ ...p, investment_mandate: opt, applicable_annexure: opt === 'No' ? '' : p.applicable_annexure })); }}
                      className={`px-8 h-8 text-xs font-medium border rounded-sm transition-all ${form.investment_mandate === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.investment_mandate === 'Yes' && (
                <div className="flex-1">
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Applicable Annexure
                    {activeAnn && <span className="ml-2 text-[9px] text-green-600 font-normal normal-case">Auto-detected: {ANNEXURE_LABELS[activeAnn]}</span>}
                  </Label>
                  <Select value={form.applicable_annexure || activeAnn}
                    onValueChange={v => { isLoadingRef.current = false; setF('applicable_annexure', v); }}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select annexure" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Annexure A — Model / Discretionary Portfolios</SelectItem>
                      <SelectItem value="B">Annexure B — Collective Investments & Offshore Platforms</SelectItem>
                      <SelectItem value="C">Annexure C — Alternative Investments & Direct Securities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* ── INVESTMENT DETAILS ── */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider">Investment Details</h3>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Jurisdiction</Label>
                <div className="flex gap-1">
                  {['Local','Offshore'].map(opt => (
                    <button key={opt} type="button" onClick={() => handleJurisdiction(opt)}
                      className={`flex-1 h-8 text-xs font-medium border rounded-sm transition-all ${form.jurisdiction === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Currency</Label>
                {form.jurisdiction === 'Local' ? (
                  <Input value="ZAR" disabled className="h-8 text-xs rounded-sm bg-muted" />
                ) : (
                  <Select value={form.currency} onValueChange={v => setF('currency', v)}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES_OFFSHORE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Provider</Label>
                {showStatic ? staticField(form.provider) : (
                  <Select value={form.provider} onValueChange={handleProvider}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {form.provider && !providers.includes(form.provider) && (
                        <SelectItem value={form.provider}>{form.provider}</SelectItem>
                      )}
                      {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Product Type</Label>
                {showStatic ? staticField(form.product_type) : (
                  <Select value={form.product_type} onValueChange={handleProduct} disabled={!form.provider}>
                    <SelectTrigger className="h-8 text-xs rounded-sm">
                      <SelectValue placeholder={form.provider ? 'Select type' : 'Select provider first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {form.product_type && !products.includes(form.product_type) && (
                        <SelectItem value={form.product_type}>{form.product_type}</SelectItem>
                      )}
                      {products.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* ── FUND ROWS ── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider">Underlying Funds & Allocation</Label>
                {multiRow && !showStatic && (
                  <span className={`text-[10px] font-semibold ${Math.abs(totalAlloc - 100) < 0.01 ? 'text-green-600' : 'text-amber-500'}`}>
                    Total: {totalAlloc.toFixed(1)}% {Math.abs(totalAlloc - 100) < 0.01 ? '✓' : `— ${(100 - totalAlloc).toFixed(1)}% remaining`}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {form.fund_rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      {showStatic ? staticField(row.fund) : (
                        <Select value={row.fund} onValueChange={v => updateRow(i, 'fund', v)}>
                          <SelectTrigger className="h-8 text-xs rounded-sm">
                            <SelectValue placeholder="Select fund" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {row.fund && row.fund !== '__custom__' && !funds.includes(row.fund) && (
                              <SelectItem value={row.fund}>{row.fund}</SelectItem>
                            )}
                            {funds
                              .filter(f => f === row.fund || !form.fund_rows.some((r, idx) => idx !== i && r.fund === f))
                              .map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            <SelectItem value="__custom__">+ Custom / Other fund</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {row.fund === '__custom__' && !showStatic && (
                        <Input className="h-8 text-xs rounded-sm" placeholder="Enter fund name"
                          value={row.customFund || ''} onChange={e => updateRow(i, 'customFund', e.target.value)} />
                      )}
                    </div>
                    {multiRow && (
                      showStatic ? (
                        <div className="w-24 h-8 text-xs rounded-sm border border-border bg-muted/50 px-3 flex items-center text-navy font-medium shrink-0">
                          {row.allocation ? `${row.allocation}%` : '—'}
                        </div>
                      ) : (
                        <div className="w-24 relative shrink-0">
                          <Input type="number" min="0" max="100" step="0.1" value={row.allocation}
                            onChange={e => updateRow(i, 'allocation', e.target.value)}
                            placeholder="0.0" className="h-8 text-xs rounded-sm pr-6" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      )
                    )}
                    {!showStatic && form.fund_rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)}
                        className="p-1.5 text-destructive hover:bg-red-50 rounded transition-colors shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {allocError && (
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-red-50 border border-red-200 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-[11px] text-red-600">{allocError}</span>
                </div>
              )}
              {!showStatic && (
                <button type="button" onClick={addRow}
                  className="mt-2 flex items-center gap-1.5 text-[11px] text-ocean hover:text-navy font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add another fund
                </button>
              )}
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Additional Notes (Optional)</Label>
              <Textarea value={form.custom_fund} onChange={e => setF('custom_fund', e.target.value)}
                placeholder="Any additional notes on fund selection..." className="rounded-sm min-h-[48px] text-xs" />
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Contribution Type</Label>
              <div className="flex gap-2">
                <label className={tog(form.lump_sum)}>
                  <input type="checkbox" checked={form.lump_sum} onChange={e => setF('lump_sum', e.target.checked)} className="sr-only" />
                  <span>{form.lump_sum ? '✓' : '○'}</span> Lump Sum
                </label>
                <label className={tog(form.recurring)}>
                  <input type="checkbox" checked={form.recurring} onChange={e => setF('recurring', e.target.checked)} className="sr-only" />
                  <span>{form.recurring ? '✓' : '○'}</span> Recurring
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {form.lump_sum && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Lump Sum ({form.currency})</Label>
                  <Input value={amtDisplay}
                    onChange={e => { setAmtDisplay(e.target.value); setF('lump_sum_amount', e.target.value.replace(/,/g,'')); }}
                    onBlur={() => { const n = parseFloat(form.lump_sum_amount); if (!isNaN(n)) setAmtDisplay(n.toLocaleString('en-ZA')); }}
                    onFocus={() => setAmtDisplay(form.lump_sum_amount || '')}
                    placeholder="0" className="h-8 text-xs rounded-sm" />
                </div>
              )}
              {form.recurring && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Recurring ({form.currency})</Label>
                  <Input value={recDisplay}
                    onChange={e => { setRecDisplay(e.target.value); setF('recurring_amount', e.target.value.replace(/,/g,'')); }}
                    onBlur={() => { const n = parseFloat(form.recurring_amount); if (!isNaN(n)) setRecDisplay(n.toLocaleString('en-ZA')); }}
                    onFocus={() => setRecDisplay(form.recurring_amount || '')}
                    placeholder="0" className="h-8 text-xs rounded-sm" />
                </div>
              )}
              {form.recurring && (
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setF('frequency', v)}>
                    <SelectTrigger className="h-8 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* ── FEES ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Fee Structure</h3>

            {(form.investment_mandate === 'No' || activeAnn === 'A') && (
              <div className="grid grid-cols-3 gap-3">
                {feeInput('Initial Fee','initial_fee_percent')}
                {feeInput('Annual Advice Fee','annual_advice_fee_percent')}
                {feeInput('Platform Fee','platform_fee_percent')}
              </div>
            )}

            {form.investment_mandate === 'Yes' && activeAnn === 'B' && (
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground">Per Annexure B — Collective Investments & Offshore Platforms</p>
                <div className="grid grid-cols-3 gap-3">
                  {feeInput('Management Fee % p.a. of NAV','management_fee_percent')}
                  {feeInput('Performance Fee % of NAV increase','performance_fee_percent')}
                  {feeInput('Performance Hurdle Rate','hurdle_rate_percent')}
                </div>
                <div className="bg-muted/40 rounded-sm p-3 space-y-1.5 text-[10px] text-muted-foreground">
                  <p><strong className="text-navy">2.1.</strong> Management Fee of <strong className="text-navy">{form.management_fee_percent||'___'}%</strong> per annum of NAV.</p>
                  <p><strong className="text-navy">2.2.</strong> Determined monthly in arrears, payable within 2 business days of invoice.</p>
                  <p><strong className="text-navy">2.3.</strong> Performance Fee of <strong className="text-navy">{form.performance_fee_percent||'___'}%</strong> of NAV increase above hurdle rate of <strong className="text-navy">{form.hurdle_rate_percent||'___'}%</strong>.</p>
                </div>
              </div>
            )}

            {form.investment_mandate === 'Yes' && activeAnn === 'C' && (
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground">Per Annexure C — Alternative Investments & Direct Securities</p>
                <div className="grid grid-cols-2 gap-3">
                  {feeInput('Annual Management Fee % of NAV','management_fee_percent')}
                  {feeInput('Initial Structuring Fee %','structuring_fee_percent')}
                  {feeInput('Annual Raising Fee %','raising_fee_percent')}
                  {feeInput('Performance / Carry Fee %','carry_fee_percent')}
                  {feeInput('Carry Hurdle Rate %','carry_hurdle_percent')}
                </div>
                <div className="bg-muted/40 rounded-sm p-3 space-y-1.5 text-[10px] text-muted-foreground">
                  <p><strong className="text-navy">2.1.</strong> Annual management fee of <strong className="text-navy">{form.management_fee_percent||'___'}%</strong> of NAV, payable monthly in arrears.</p>
                  <p><strong className="text-navy">2.2.</strong> Initial structuring fee of <strong className="text-navy">{form.structuring_fee_percent||'___'}%</strong> of investment value.</p>
                  <p><strong className="text-navy">2.3.</strong> Annual raising fee of <strong className="text-navy">{form.raising_fee_percent||'___'}%</strong> of investment.</p>
                  <p><strong className="text-navy">2.4.</strong> Performance / carry fee of <strong className="text-navy">{form.carry_fee_percent||'___'}%</strong> above hurdle rate of <strong className="text-navy">{form.carry_hurdle_percent||'___'}%</strong>.</p>
                  <p><strong className="text-navy">2.5.</strong> Fees reflected net of VAT, deducted from investment consideration.</p>
                  <p><strong className="text-navy">2.6.</strong> The FSP does not participate in any conditional incentive arrangements.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── REASON ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider">Reason for Recommendation</Label>
              <LibraryButton onOpen={() => setLibraryOpen(true)} />
            </div>
            <Textarea value={form.reason_for_recommendation}
              onChange={e => setF('reason_for_recommendation', e.target.value)}
              placeholder="Why is this product recommended for this client..."
              className="rounded-sm min-h-[72px] text-xs" />
            {libraryOpen && (
              <PhraseLibrary
                onSelect={(phrase) => {
                  const cur = form.reason_for_recommendation;
                  const sep = cur && !cur.trim().endsWith('.') ? '. ' : cur ? ' ' : '';
                  setF('reason_for_recommendation', cur + sep + phrase);
                }}
                onClose={() => setLibraryOpen(false)}
              />
            )}
          </div>

          {/* ── ACTIONS ── */}
          <div className="flex gap-3">
            <Button type="button"
              onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })}
              variant="outline" className="flex-1 h-9 rounded-sm text-xs">
              Cancel
            </Button>
            <Button type="submit"
              disabled={submitting || !form.provider || !form.product_type || (!form.lump_sum && !form.recurring)}
              className="flex-1 h-9 bg-ocean hover:bg-sky text-white rounded-sm text-xs font-medium disabled:opacity-50">
              {submitting ? 'Saving...' : isEdit ? 'Update Investment' : 'Add Investment'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}