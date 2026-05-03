import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import LibraryPickerModal from '@/components/LibraryPickerModal';
import { LibraryButton } from '@/components/engine/PhraseLibrary';
import { toast } from 'sonner';

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

const LOCAL_FUNDS = ['Allan Gray - Orbis Global Balanced Feeder Fund','Allan Gray - Orbis Global Equity Feeder Fund','Allan Gray Balanced Fund','Allan Gray Equity Fund','Allan Gray Money Market Fund','Allan Gray Stable Fund','Allan Gray Tax-Free Balanced Fund','Allan Gray Tax-Free Balanced Fund (Class A)','Full Withdrawal Holding Fund','Partial Withdrawal Holding Fund','Coronation Balanced Defensive Fund (Class P)','Coronation Balanced Plus Fund (Class P)','Coronation Capital Plus Fund (Class P)','Coronation Global Managed [ZAR] Feeder Fund (Class P)','Coronation Global Opportunities Equity [ZAR] Feeder Fund (Class P)','Coronation Strategic Income Fund (Class P)','Foord Balanced Fund (Class B2)','Foord Equity Fund (Class B2)','Foord International Feeder Fund (Class B2)','M&G Balanced Fund (Class B)','M&G Dividend Maximiser Fund (Class B)','M&G Equity Fund (Class B)','M&G Inflation Plus Fund (Class B)','Nedgroup Investments Stable Fund (Class A)','Nedgroup Investments Stable Fund (Class A2)','Ninety One Cautious Managed Fund (Class H)','Ninety One Diversified Income Fund (Class H)','Ninety One Equity Fund (Class E)','Ninety One Global Franchise Feeder Fund (Class H)','Ninety One Value Fund (Class H)','Old Mutual Global Equity Fund (Class B1)','Prescient Income Provider Fund (Class A2)','STANLIB Property Income Fund (Class C3)','Satrix ALSI Index Fund (Class B1)','Satrix MSCI World Index Fund (Class B2)','Wealthworks Prime Cautious Fund of Funds (Class A)','Wealthworks Prime Managed Fund of Funds (Class A)'];

const OFFSHORE_FUNDS = ['Allan Gray Money Market Fund (ZAR)','Orbis Global Equity Fund (USD) (Class RRFA)','Orbis Optimal SA Fund (EUR) (Class A)','Orbis Optimal SA Fund (USD) (Class A)','Orbis SICAV Emerging Markets Equity Fund (USD) (Class RRFA)','Orbis SICAV Global Balanced Fund (USD) (Class RRFA)','Orbis SICAV Global Cautious Fund (USD) (Class RRFC)','Orbis SICAV Japan Equity Fund (JPY) (Class RRFA)','Allan Gray Africa Bond Fund (USD) (Class C)','Allan Gray Africa ex-SA Equity Fund (USD) (Class C)','Allan Gray Frontier Markets Equity Fund (USD) (Class C)','Allan Gray Australia Balanced Fund (AUD)','Allan Gray Australia Equity Fund (AUD) (Class A)','Allan Gray Australia Stable Fund (AUD)','Artisan Global Value Fund (USD) (Class I)','Baillie Gifford Worldwide Emerging Markets Leading Companies Fund (USD) (Class B)','Baillie Gifford Worldwide Long Term Global Growth Fund (USD) (Class B)','Catalyst Global Real Estate UCITS Fund (USD) (Class B)','Coronation Global Capital Plus Fund (GBP hedged) (Class P)','Coronation Global Capital Plus Fund (USD hedged) (Class P)','Coronation Global Emerging Markets Fund (USD) (Class P)','Coronation Global Equity Select Fund (USD) (Class P)','Coronation Global Managed Fund (USD) (Class P)','Coronation Global Opportunities Equity Fund (USD) (Class P)','Coronation Global Optimum Growth Fund (USD) (Class P)','Coronation Global Strategic USD Income Fund (USD) (Class P)','Dodge & Cox U.S. Stock Fund (USD)','Dodge & Cox Worldwide Global Stock Fund (USD)','Fundsmith Equity Fund (GBP) (Class I)','M&G Global Balanced Fund (USD) (Class B)','M&G Global Inflation Plus Fund (USD) (Class B)','Nedgroup Investments Core Global Fund (USD) (Class C)','Nedgroup Investments Global Cautious Fund (USD) (Class C)','Nedgroup Investments Global Equity Fund (USD) (Class C)','Nedgroup Investments Global Flexible Fund (USD) (Class C)','Nedgroup Investments Global Property Fund (USD) (Class C)','Ninety One Global Franchise Fund (USD) (Class I)','Ninety One Global Managed Income Fund (USD) (Class I)','Ninety One Global Strategic Managed Fund (GBP hedged) (Class I)','Ninety One Global Strategic Managed Fund (USD) (Class I)','iShares Emerging Markets Equity Index Fund (USD) (Class F2)','iShares Europe Equity Index Fund (EUR) (Class D2)','iShares Global Government Bond Index Fund (USD) (Class F2)','iShares North America Equity Index Fund (USD) (Class F2)','iShares World Equity Index Fund (USD) (Class F2)','Wealthworks Global Flexible Fund','Xhaos Special Opportunities Fund'];

const CURRENCIES_OFFSHORE = ['USD','GBP','EUR','AUD'];
const FREQUENCIES = ['Monthly','Quarterly','Annually'];
const ANNEXURE_LABELS = { A:'Annexure A — Model / Discretionary Portfolios', B:'Annexure B — Collective Investments & Offshore Platforms', C:'Annexure C — Alternative Investments & Direct Securities' };

const detectAnnexure = (pt, jur) => {
  const p = String(pt||'').toLowerCase();
  if (p.includes('model')||p.includes('discretionary')) return 'A';
  if (p.includes('unit trust')||p.includes('lisp')||p.includes('platform')||p.includes('bond')||p.includes('endowment')||p.includes('offshore')) return 'B';
  if (p.includes('share')||p.includes('direct')) return 'C';
  return 'B';
};

const emptyRow = () => ({ fund:'', allocation:'', customFund:'' });
const fmtFee = v => { const n = parseFloat(v); return isNaN(n) ? '0.00' : n.toFixed(2); };

export default function InvestmentForm() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [allocError, setAllocError] = useState('');
  const [investmentReasons, setInvestmentReasons] = useState([]);
  const [incomeDrawdownReasons, setIncomeDrawdownReasons] = useState([]);

  // Load library entries on mount
  useEffect(() => {
    base44.entities.RecommendationReasons.list().then(all => {
      setInvestmentReasons(all.filter(r => r.section_context === 'Investment Product Recommendation' && r.is_active !== false));
      setIncomeDrawdownReasons(all.filter(r => r.section_context === 'Investment Income Drawdown' && r.is_active !== false));
    });
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [amtDisplay, setAmtDisplay] = useState('');
  const [recDisplay, setRecDisplay] = useState('');
  const [investmentReasonsModalOpen, setInvestmentReasonsModalOpen] = useState(false);
  const [incomeDrawdownReasonsModalOpen, setIncomeDrawdownReasonsModalOpen] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(null); // { provider, product_type, pendingData }

  // Load existing investments for this proposal (for duplicate detection)
  const { data: existingInvestments = [] } = useQuery({
    queryKey: ['investments', proposalId],
    queryFn: async () => {
      const all = await base44.entities.Investments.list();
      return all.filter(i => i.proposal_id === proposalId);
    },
    enabled: !!proposalId,
  });

  const [form, setForm] = useState({
    investment_mandate:'No', applicable_annexure:'',
    jurisdiction:'Local', currency:'ZAR', provider:'', product_type:'',
    fund_rows:[emptyRow()], custom_fund:'',
    lump_sum:false, recurring:false, lump_sum_amount:'', recurring_amount:'', frequency:'',
    initial_fee_percent:'0.00', annual_advice_fee_percent:'0.00', platform_fee_percent:'0.00',
    management_fee_percent:'0.00', performance_fee_percent:'0.00', hurdle_rate_percent:'0.00',
    structuring_fee_percent:'0.00', raising_fee_percent:'0.00', carry_fee_percent:'0.00', carry_hurdle_percent:'0.00',
    investment_recommendation_reasons: [],
    income_drawdown_reasons: [],
    income_required:'No', income_type:'', income_percentage:'', income_amount:'', income_frequency:'', income_notes:'',
    });

  const { data: inv } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: async () => {
      if (!investmentId) return null;
      const all = await base44.entities.Investments.list();
      const found = all.find(i => i.id === investmentId) || null;
      console.log('[InvestmentForm] loaded investment:', JSON.stringify(found, null, 2));
      return found;
    },
    enabled: !!investmentId,
  });

  useEffect(() => {
    if (!inv) return;
    setLoaded(false);
    const isRec = inv.contribution_type==='Recurring'||inv.contribution_type==='Both';
    const isLump = inv.contribution_type==='Lump Sum'||inv.contribution_type==='Both';
    let fund_rows = [emptyRow()];
    if (Array.isArray(inv.fund_allocations)&&inv.fund_allocations.length>0) {
      fund_rows = inv.fund_allocations.map(r=>({fund:r.fund||'',allocation:r.allocation||'',customFund:r.customFund||''}));
    } else if (Array.isArray(inv.underlying_funds)&&inv.underlying_funds.length>0) {
      fund_rows = inv.underlying_funds.map(f=>{
        const m = String(f).match(/^(.+?)\s*\((\d+(?:\.\d+)?)%\)$/);
        return m ? {fund:m[1].trim(),allocation:m[2],customFund:''} : {fund:f,allocation:'',customFund:''};
      });
    }
    setForm({
      investment_mandate: inv.investment_mandate||'No',
      applicable_annexure: inv.applicable_annexure||'',
      jurisdiction: inv.jurisdiction||'Local',
      currency: inv.currency||'ZAR',
      provider: inv.provider||'',
      product_type: inv.product_type||'',
      fund_rows,
      custom_fund: inv.custom_fund||'',
      lump_sum: isLump, recurring: isRec,
      lump_sum_amount: inv.amount||'',
      recurring_amount: inv.recurring_amount||'',
      frequency: inv.frequency||'',
      initial_fee_percent: fmtFee(inv.initial_fee_percent),
      annual_advice_fee_percent: fmtFee(inv.annual_advice_fee_percent),
      platform_fee_percent: fmtFee(inv.platform_fee_percent),
      management_fee_percent: fmtFee(inv.management_fee_percent),
      performance_fee_percent: fmtFee(inv.performance_fee_percent),
      hurdle_rate_percent: fmtFee(inv.hurdle_rate_percent),
      structuring_fee_percent: fmtFee(inv.structuring_fee_percent),
      raising_fee_percent: fmtFee(inv.raising_fee_percent),
      carry_fee_percent: fmtFee(inv.carry_fee_percent),
      carry_hurdle_percent: fmtFee(inv.carry_hurdle_percent),
      investment_recommendation_reasons: inv.investment_recommendation_reasons || [],
      income_drawdown_reasons: inv.income_drawdown_reasons || [],
      income_required: inv.income_required || 'No',
      income_type: inv.income_type || '',
      income_percentage: fmtFee(inv.income_percentage),
      income_amount: fmtFee(inv.income_amount),
      income_frequency: inv.income_frequency || '',
      income_notes: inv.income_notes || '',
    });
    if (inv.amount) setAmtDisplay(Number(inv.amount).toLocaleString('en-ZA'));
    if (inv.recurring_amount) setRecDisplay(Number(inv.recurring_amount).toLocaleString('en-ZA'));
    setTimeout(()=>setLoaded(true), 300);
  }, [inv]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) await base44.entities.Investments.update(investmentId, data);
      else await base44.entities.Investments.create({...data, proposal_id:proposalId});
      await new Promise(r=>setTimeout(r,500));
      const allInv = await base44.entities.Investments.list();
      const proposalInvestments = allInv.filter(i=>i.proposal_id===proposalId);
      const mi = proposalInvestments.filter(i=>i.investment_mandate==='Yes');
      // Fetch current proposal to check status
      const allProposals = await base44.entities.Proposal.list();
      const currentProposal = allProposals.find(p=>p.id===proposalId);
      const sentStatuses = ['Sent','Awaiting Client Signature','Signed'];
      const shouldMarkOutdated = currentProposal && sentStatuses.includes(currentProposal.status);
      await base44.entities.Proposal.update(proposalId,{
        mandate_included: mi.length>0?'Yes':'No',
        include_annexure_A: mi.some(i=>i.applicable_annexure==='A'),
        include_annexure_B: mi.some(i=>i.applicable_annexure==='B'),
        include_annexure_C: mi.some(i=>i.applicable_annexure==='C'),
        pdf_status: 'Outdated',
        ...(shouldMarkOutdated ? { status: 'Outdated' } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments', proposalId] });
      navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } });
    },
  });

  const totalAlloc = form.fund_rows.reduce((s,r)=>s+(parseFloat(r.allocation)||0),0);
  const multiRow = form.fund_rows.length>1;
  const isLivingAnnuity = form.product_type === 'Living Annuity';

  const validate = () => {
    if (isLivingAnnuity && form.income_required !== 'Yes') {
      toast.error('Income drawdown is required for a Living Annuity.');
      return false;
    }
    if (!multiRow) return true;
    const filled = form.fund_rows.filter(r=>r.fund);
    if (filled.length<=1) return true;
    const t = filled.reduce((s,r)=>s+(parseFloat(r.allocation)||0),0);
    if (Math.abs(t-100)>0.01){setAllocError(`Must total 100%. Current: ${t.toFixed(1)}%`);return false;}
    setAllocError('');return true;
  };

  const doSave = (payload) => {
    setSubmitting(true);
    saveMutation.mutate(payload);
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    if(!validate()) return;
    const contrib = form.lump_sum&&form.recurring?'Both':form.lump_sum?'Lump Sum':'Recurring';
    const ann = form.applicable_annexure||detectAnnexure(form.product_type,form.jurisdiction);
    const underlying_funds = form.fund_rows.filter(r=>r.fund).map(r=>{
      const n = r.fund==='__custom__'?(r.customFund||'Custom'):r.fund;
      return multiRow&&r.allocation?`${n} (${r.allocation}%)`:n;
    });

    // Build fee payload — only save fields relevant to the active annexure,
    // zero out all others to prevent stale values persisting across annexure changes
    const feePayload = {
      initial_fee_percent:0, annual_advice_fee_percent:0, platform_fee_percent:0,
      management_fee_percent:0, performance_fee_percent:0, hurdle_rate_percent:0,
      structuring_fee_percent:0, raising_fee_percent:0, carry_fee_percent:0, carry_hurdle_percent:0,
    };
    if (form.investment_mandate !== 'Yes' || ann === 'A') {
      feePayload.initial_fee_percent       = parseFloat(form.initial_fee_percent)       || 0;
      feePayload.annual_advice_fee_percent = parseFloat(form.annual_advice_fee_percent) || 0;
      feePayload.platform_fee_percent      = parseFloat(form.platform_fee_percent)      || 0;
    } else if (ann === 'B') {
      feePayload.management_fee_percent    = parseFloat(form.management_fee_percent)    || 0;
      feePayload.performance_fee_percent   = parseFloat(form.performance_fee_percent)   || 0;
      feePayload.hurdle_rate_percent       = parseFloat(form.hurdle_rate_percent)       || 0;
      feePayload.platform_fee_percent      = parseFloat(form.platform_fee_percent)      || 0;
    } else if (ann === 'C') {
      feePayload.management_fee_percent    = parseFloat(form.management_fee_percent)    || 0;
      feePayload.structuring_fee_percent   = parseFloat(form.structuring_fee_percent)   || 0;
      feePayload.raising_fee_percent       = parseFloat(form.raising_fee_percent)       || 0;
      feePayload.carry_fee_percent         = parseFloat(form.carry_fee_percent)         || 0;
      feePayload.carry_hurdle_percent      = parseFloat(form.carry_hurdle_percent)      || 0;
    }

    // Recommendation reasons validation
    if (!form.investment_recommendation_reasons || form.investment_recommendation_reasons.length === 0) {
      alert('Please select at least one reason for the investment recommendation.');
      setSubmitting(false); return;
    }

    // Income drawdown validation
    if (form.income_required === 'Yes') {
      if (!form.income_drawdown_reasons || form.income_drawdown_reasons.length === 0) {
        alert('Please select at least one reason for the income drawdown.');
        setSubmitting(false); return;
      }
      if (!form.income_type) { alert('Please select an income type.'); setSubmitting(false); return; }
      if (!form.income_frequency) { alert('Please select an income frequency.'); setSubmitting(false); return; }
      if (form.income_type === 'Percentage' && !form.income_percentage) { alert('Please enter the income percentage.'); setSubmitting(false); return; }
      if (form.income_type === 'Fixed Amount' && !form.income_amount) { alert('Please enter the income amount.'); setSubmitting(false); return; }
      if (form.income_type === 'Percentage' && parseFloat(form.income_percentage) > 7.5 && !form.income_notes) {
        alert('Additional income notes are required when income drawdown exceeds 7.50%.'); setSubmitting(false); return;
      }
    }

    const incomePayload = {
      income_required: form.income_required || 'No',
      income_type: form.income_required === 'Yes' ? (form.income_type || '') : '',
      income_percentage: form.income_required === 'Yes' && form.income_type === 'Percentage' ? (parseFloat(form.income_percentage) || 0) : 0,
      income_amount: form.income_required === 'Yes' && form.income_type === 'Fixed Amount' ? (parseFloat(form.income_amount) || 0) : 0,
      income_frequency: form.income_required === 'Yes' ? (form.income_frequency || '') : '',
      income_notes: form.income_required === 'Yes' ? (form.income_notes || '') : '',
    };

    console.log('[InvestmentForm] saving:', { annexure: ann, mandate: form.investment_mandate, ...feePayload, ...incomePayload });

    const payload = {
      investment_mandate:form.investment_mandate,
      applicable_annexure:form.investment_mandate==='Yes'?ann:null,
      jurisdiction:form.jurisdiction, currency:form.currency,
      provider:form.provider, product_type:form.product_type,
      fund_allocations:form.fund_rows, underlying_funds,
      custom_fund:form.custom_fund,
      contribution_type:contrib,
      amount:parseFloat(String(form.lump_sum_amount).replace(/[\s,]/g,''))||0,
      recurring_amount:parseFloat(String(form.recurring_amount).replace(/[\s,]/g,''))||0,
      frequency:form.frequency,
      investment_recommendation_reasons: form.investment_recommendation_reasons || [],
      income_drawdown_reasons: form.income_required === 'Yes' ? (form.income_drawdown_reasons || []) : [],
      ...feePayload,
      ...incomePayload,
    };

    // Duplicate detection — only on new investments (not edits)
    if (!investmentId) {
      const duplicate = existingInvestments.find(
        i => i.provider === form.provider && i.product_type === form.product_type
      );
      if (duplicate) {
        setDuplicateConfirm({ provider: form.provider, product_type: form.product_type, pendingData: payload });
        return;
      }
    }

    doSave(payload);
  };

  const setF = (f,v)=>setForm(p=>({...p,[f]:v}));
  const addRow = ()=>setForm(p=>({...p,fund_rows:[...p.fund_rows,emptyRow()]}));
  const removeRow = i=>{setForm(p=>({...p,fund_rows:p.fund_rows.filter((_,idx)=>idx!==i)}));setAllocError('');};
  const updateRow = (i,f,v)=>{setForm(p=>({...p,fund_rows:p.fund_rows.map((r,idx)=>idx===i?{...r,[f]:v}:r)}));setAllocError('');};

  const providers = Object.keys(PROVIDER_MAP[form.jurisdiction]||{});
  const products = form.provider?(PROVIDER_MAP[form.jurisdiction]?.[form.provider]?.products||[]):[];
  const funds = form.jurisdiction==='Offshore'?OFFSHORE_FUNDS:LOCAL_FUNDS;
  const ann = form.applicable_annexure||detectAnnexure(form.product_type,form.jurisdiction);
  const isEdit = !!investmentId;
  const showStatic = isEdit&&!loaded;

  const staticBox = (val) => (
    <div className="h-8 text-xs rounded-sm border border-border bg-muted/50 px-3 flex items-center text-navy font-medium truncate">
      {val||'—'}
    </div>
  );

  const btnClass = (active) => `flex-1 h-8 text-xs font-medium border rounded-sm transition-all ${active?'bg-navy text-white border-navy':'bg-card text-navy border-border hover:border-navy'}`;
  const tog = (active) => `flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-colors flex-1 text-xs font-medium ${active?'border-teal bg-teal/5 text-teal':'border-border text-navy hover:border-teal/50'}`;

  const FEE_PRESETS = ['0.00', '0.25', '0.50', '0.75', '1.00'];
  const isCustomFee = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return false;
    return !FEE_PRESETS.includes(n.toFixed(2));
  };

  const FeeInput = ({label, field}) => {
    const [showCustom, setShowCustom] = useState(() => isCustomFee(form[field]));
    const selectVal = showCustom ? 'Custom' : (parseFloat(form[field]||0).toFixed(2));
    return (
      <div>
        <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
        <select
          value={selectVal}
          onChange={e => {
            if (e.target.value === 'Custom') { setShowCustom(true); setF(field, ''); }
            else { setShowCustom(false); setF(field, e.target.value); }
          }}
          className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2 mb-1"
        >
          {FEE_PRESETS.map(o => <option key={o} value={o}>{o}%</option>)}
          <option value="Custom">Custom</option>
        </select>
        {showCustom && (
          <div className="relative">
            <Input
              type="number" step="0.01" min="0"
              value={form[field]}
              onChange={e => setF(field, e.target.value)}
              onBlur={e => { const n = parseFloat(e.target.value); setF(field, isNaN(n) ? '0.00' : n.toFixed(2)); }}
              placeholder="Enter %" className="h-8 text-xs rounded-sm pr-6"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
          </div>
        )}
      </div>
    );
  };

  const Sel = ({label,value,onChange,options,placeholder,disabled}) => (
    <div>
      <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
      {showStatic ? staticBox(value) : (
        <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
          className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2 disabled:bg-muted disabled:text-muted-foreground">
          <option value="">{placeholder||'Select...'}</option>
          {value && !options.includes(value) && <option value={value}>{value}</option>}
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <button onClick={()=>navigate(`/proposal/${proposalId}/engine`,{state:{step:'recommendations'}})}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4"/> Back to Step 2
        </button>
      </div>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-base font-bold text-navy mb-0.5">{isEdit?'Edit Investment':'Add Investment'}</h1>
        <p className="text-xs text-muted-foreground mb-3">{isEdit?'Update investment details':'Create a new investment recommendation'}</p>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* MANDATE */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Discretionary Mandate</h3>
            <div className="flex items-start gap-6">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Subject to discretionary mandate?</Label>
                <div className="flex gap-1.5">
                  {['Yes','No'].map(opt=>(
                    <button key={opt} type="button" onClick={()=>setForm(p=>({...p,investment_mandate:opt,applicable_annexure:opt==='No'?'':p.applicable_annexure}))}
                      className={btnClass(form.investment_mandate===opt)}>{opt}</button>
                  ))}
                </div>
              </div>
              {form.investment_mandate==='Yes' && (
                <div className="flex-1">
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Applicable Annexure
                    {ann&&<span className="ml-2 text-[9px] text-green-600 font-normal normal-case">Auto-detected: {ANNEXURE_LABELS[ann]}</span>}
                  </Label>
                  <select value={form.applicable_annexure||ann} onChange={e=>setF('applicable_annexure',e.target.value)}
                    className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                    <option value="A">Annexure A — Model / Discretionary Portfolios</option>
                    <option value="B">Annexure B — Collective Investments & Offshore Platforms</option>
                    <option value="C">Annexure C — Alternative Investments & Direct Securities</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* INVESTMENT DETAILS */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider">Investment Details</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Jurisdiction</Label>
                <div className="flex gap-1">
                  {['Local','Offshore'].map(opt=>(
                    <button key={opt} type="button"
                      onClick={()=>setForm(p=>({...p,jurisdiction:opt,currency:opt==='Local'?'ZAR':'USD',provider:'',product_type:'',fund_rows:[emptyRow()]}))}
                      className={btnClass(form.jurisdiction===opt)}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Currency</Label>
                {form.jurisdiction==='Local'
                  ? <Input value="ZAR" disabled className="h-8 text-xs rounded-sm bg-muted"/>
                  : <select value={form.currency} onChange={e=>setF('currency',e.target.value)}
                      className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                      {CURRENCIES_OFFSHORE.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                }
              </div>
              <Sel label="Provider" value={form.provider}
                onChange={v=>setForm(p=>({...p,provider:v,product_type:'',fund_rows:[emptyRow()],reason_for_recommendation:''}))}
                options={providers} placeholder="Select provider"/>
              <Sel label="Product Type" value={form.product_type}
                onChange={v=>setForm(p=>({
                  ...p,
                  product_type: v,
                  fund_rows: [emptyRow()],
                  ...(v === 'Living Annuity' ? { recurring: false, income_required: 'Yes' } : {}),
                }))}
                options={products} placeholder={form.provider?'Select type':'Select provider first'} disabled={!form.provider}/>
            </div>

            {/* FUND ROWS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider">Underlying Funds & Allocation</Label>
                {multiRow&&!showStatic&&(
                  <span className={`text-[10px] font-semibold ${Math.abs(totalAlloc-100)<0.01?'text-green-600':'text-amber-500'}`}>
                    Total: {totalAlloc.toFixed(1)}% {Math.abs(totalAlloc-100)<0.01?'✓':`— ${(100-totalAlloc).toFixed(1)}% remaining`}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {form.fund_rows.map((row,i)=>(
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      {showStatic ? staticBox(row.fund) : (
                        <select value={row.fund} onChange={e=>updateRow(i,'fund',e.target.value)}
                          className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                          <option value="">Select fund...</option>
                          {row.fund&&row.fund!=='__custom__'&&!funds.includes(row.fund)&&<option value={row.fund}>{row.fund}</option>}
                          {funds.filter(f=>f===row.fund||!form.fund_rows.some((r,idx)=>idx!==i&&r.fund===f)).map(f=><option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">+ Custom / Other fund</option>
                        </select>
                      )}
                      {row.fund==='__custom__'&&!showStatic&&(
                        <Input className="h-8 text-xs rounded-sm mt-1" placeholder="Enter fund name"
                          value={row.customFund||''} onChange={e=>updateRow(i,'customFund',e.target.value)}/>
                      )}
                    </div>
                    {multiRow&&(
                      showStatic
                        ? <div className="w-20 h-8 text-xs rounded-sm border border-border bg-muted/50 px-2 flex items-center text-navy shrink-0">{row.allocation?`${row.allocation}%`:'—'}</div>
                        : <div className="w-20 relative shrink-0">
                            <Input type="number" min="0" max="100" step="0.1" value={row.allocation}
                              onChange={e=>updateRow(i,'allocation',e.target.value)} placeholder="0.0" className="h-8 text-xs rounded-sm pr-5"/>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                          </div>
                    )}
                    {!showStatic&&form.fund_rows.length>1&&(
                      <button type="button" onClick={()=>removeRow(i)} className="p-1.5 text-destructive hover:bg-red-50 rounded shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {allocError&&(
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-red-50 border border-red-200 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0"/>
                  <span className="text-[11px] text-red-600">{allocError}</span>
                </div>
              )}
              {!showStatic&&(
                <button type="button" onClick={addRow} className="mt-2 flex items-center gap-1.5 text-[11px] text-ocean hover:text-navy font-medium">
                  <Plus className="w-3.5 h-3.5"/> Add another fund
                </button>
              )}
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Additional Notes (Optional)</Label>
              <Textarea value={form.custom_fund} onChange={e=>setF('custom_fund',e.target.value)} placeholder="Any additional notes..." className="rounded-sm min-h-[48px] text-xs"/>
            </div>

            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Contribution Type</Label>
              <div className="flex gap-2">
                <label className={tog(form.lump_sum)}>
                  <input type="checkbox" checked={form.lump_sum} onChange={e=>setF('lump_sum',e.target.checked)} className="sr-only"/>
                  <span>{form.lump_sum?'✓':'○'}</span> Lump Sum
                </label>
                {!isLivingAnnuity && (
                  <label className={tog(form.recurring)}>
                    <input type="checkbox" checked={form.recurring} onChange={e=>setF('recurring',e.target.checked)} className="sr-only"/>
                    <span>{form.recurring?'✓':'○'}</span> Recurring
                  </label>
                )}
              </div>
              {isLivingAnnuity && (
                <p className="text-[10px] text-amber-700 mt-1">Recurring contributions are not applicable for Living Annuities.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {form.lump_sum&&(
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Lump Sum ({form.currency})</Label>
                  <Input value={amtDisplay}
                    onChange={e=>{setAmtDisplay(e.target.value);setF('lump_sum_amount',e.target.value.replace(/,/g,''));}}
                    onBlur={()=>{const n=parseFloat(form.lump_sum_amount);if(!isNaN(n))setAmtDisplay(n.toLocaleString('en-ZA'));}}
                    onFocus={()=>setAmtDisplay(form.lump_sum_amount||'')}
                    placeholder="0" className="h-8 text-xs rounded-sm"/>
                </div>
              )}
              {form.recurring&&(
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Recurring ({form.currency})</Label>
                  <Input value={recDisplay}
                    onChange={e=>{setRecDisplay(e.target.value);setF('recurring_amount',e.target.value.replace(/,/g,''));}}
                    onBlur={()=>{const n=parseFloat(form.recurring_amount);if(!isNaN(n))setRecDisplay(n.toLocaleString('en-ZA'));}}
                    onFocus={()=>setRecDisplay(form.recurring_amount||'')}
                    placeholder="0" className="h-8 text-xs rounded-sm"/>
                </div>
              )}
              {form.recurring&&(
                <div>
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Frequency</Label>
                  <select value={form.frequency} onChange={e=>setF('frequency',e.target.value)}
                    className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                    <option value="">Select...</option>
                    {FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* FEES */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Fee Structure</h3>
            {form.investment_mandate==='No'&&(
              <div className="grid grid-cols-3 gap-3">
                <FeeInput label="Initial Fee" field="initial_fee_percent"/>
                <FeeInput label="Annual Advice Fee" field="annual_advice_fee_percent"/>
                <FeeInput label="Platform Fee" field="platform_fee_percent"/>
              </div>
            )}
            {form.investment_mandate==='Yes'&&ann==='A'&&(
              <div className="grid grid-cols-3 gap-3">
                <FeeInput label="Portfolio Management Fee (% per annum)" field="management_fee_percent"/>
                <FeeInput label="Annual Advice Fee (% per annum)" field="annual_advice_fee_percent"/>
                <FeeInput label="Platform / Administration Fee (% per annum)" field="platform_fee_percent"/>
              </div>
            )}
            {form.investment_mandate==='Yes'&&ann==='B'&&(
              <div className="grid grid-cols-2 gap-3">
                <FeeInput label="Management Fee (% per annum)" field="management_fee_percent"/>
                <FeeInput label="Performance Fee (% if applicable)" field="performance_fee_percent"/>
                <FeeInput label="Hurdle Rate (%)" field="hurdle_rate_percent"/>
                <FeeInput label="Platform / Administration Fee (% per annum)" field="platform_fee_percent"/>
              </div>
            )}
            {form.investment_mandate==='Yes'&&ann==='C'&&(
              <div className="grid grid-cols-2 gap-3">
                <FeeInput label="Management Fee (% per annum)" field="management_fee_percent"/>
                <FeeInput label="Performance Fee (% of returns above hurdle)" field="performance_fee_percent"/>
                <FeeInput label="Hurdle Rate (%)" field="hurdle_rate_percent"/>
                <FeeInput label="Structuring Fee (%)" field="structuring_fee_percent"/>
                <FeeInput label="Raising Fee (%)" field="raising_fee_percent"/>
                <FeeInput label="Carry (%)" field="carry_fee_percent"/>
                <FeeInput label="Carry Hurdle Rate (%)" field="carry_hurdle_percent"/>
              </div>
            )}
          </div>

          {/* INCOME DRAWDOWN */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider">Income Drawdown</h3>
            {isLivingAnnuity && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-sm">
                <span className="text-amber-700 text-[10px] font-semibold">⚠ Living Annuity — Income drawdown is compulsory. Please complete all income details below.</span>
              </div>
            )}
            <div>
              <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Does the investor require an income to be drawn from this investment?</Label>
              {isLivingAnnuity ? (
                <div className="px-3 h-8 text-xs font-medium border border-navy bg-navy text-white rounded-sm inline-flex items-center">Yes — required</div>
              ) : (
                <div className="flex gap-1.5">
                  {['No','Yes'].map(opt=>(
                    <button key={opt} type="button" onClick={()=>setF('income_required',opt)}
                      className={`px-8 h-8 text-xs font-medium border rounded-sm transition-all ${form.income_required===opt?'bg-navy text-white border-navy':'bg-card text-navy border-border hover:border-navy'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.income_required==='Yes'&&(
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Income Basis</Label>
                    <select value={form.income_type} onChange={e=>setF('income_type',e.target.value)}
                      className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                      <option value="">Select...</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Fixed Amount">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Income Frequency</Label>
                    <select value={form.income_frequency} onChange={e=>setF('income_frequency',e.target.value)}
                      className="w-full h-8 text-xs rounded-sm border border-border bg-card text-navy px-2">
                      <option value="">Select...</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                </div>
                {form.income_type==='Percentage'&&(
                  <div>
                    <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Income Percentage</Label>
                    <div className="relative w-40">
                      <Input type="number" step="0.01" min="0" value={form.income_percentage}
                        onChange={e=>setF('income_percentage',e.target.value)}
                        placeholder="0.00" className="h-8 text-xs rounded-sm pr-6"/>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                    </div>
                    {parseFloat(form.income_percentage)>7.5&&(
                      <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 rounded-sm">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5"/>
                        <span className="text-[10px] text-red-600">Income drawdown above 7.50% — income notes are required.</span>
                      </div>
                    )}
                    {parseFloat(form.income_percentage)>5&&parseFloat(form.income_percentage)<=7.5&&(
                      <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-sm">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"/>
                        <span className="text-[10px] text-amber-700">Income drawdown above 5.00% may increase the risk of capital erosion and should be specifically justified in the Record of Advice.</span>
                      </div>
                    )}
                  </div>
                )}
                {form.income_type==='Fixed Amount'&&(
                  <div>
                    <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Income Amount ({form.currency})</Label>
                    <div className="w-48">
                      <Input type="number" step="0.01" min="0" value={form.income_amount}
                        onChange={e=>setF('income_amount',e.target.value)}
                        placeholder="0.00" className="h-8 text-xs rounded-sm"/>
                    </div>
                  </div>
                )}
                {/* income_notes is handled in Section B below */}
              </>
            )}
          </div>

          {/* SECTION A — Product Recommendation Reasons */}
          <div className="bg-card border border-border rounded-lg p-3">
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase',
              color: '#1e3a5f', marginBottom: 8
            }}>
              Reason for Investment Recommendation <span style={{ color: '#ef4444' }}>*</span>
            </label>

            {/* Selected chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, minHeight: 28 }}>
              {(form.investment_recommendation_reasons || []).length === 0 ? (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>No reasons selected</span>
              ) : (
                investmentReasons
                  .filter(r => (form.investment_recommendation_reasons || []).includes(r.id))
                  .map(r => (
                    <span key={r.id} style={{
                      background: '#eff6ff', color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      borderRadius: '20px', padding: '3px 10px',
                      fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {r.text}
                      <button
                        type="button"
                        onClick={() => setF('investment_recommendation_reasons',
                          form.investment_recommendation_reasons.filter(x => x !== r.id)
                        )}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: '#93c5fd', fontSize: 14, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </span>
                  ))
              )}
            </div>

            {/* Library button */}
            <LibraryButton onOpen={() => setInvestmentReasonsModalOpen(true)} />

            {/* Modal */}
            <LibraryPickerModal
              isOpen={investmentReasonsModalOpen}
              onClose={() => setInvestmentReasonsModalOpen(false)}
              title="Select Investment Recommendation Reasons"
              options={investmentReasons}
              selected={form.investment_recommendation_reasons || []}
              onConfirm={(newSelected) => setF('investment_recommendation_reasons', newSelected)}
            />
          </div>

          {/* SECTION B — Income Drawdown Rationale (only if income_required = Yes) */}
          {form.income_required === 'Yes' && (
            <div className="bg-card border border-border rounded-lg p-3">
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase',
                color: '#1e3a5f', marginBottom: 8
              }}>
                Reason for Income Drawdown <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {/* Selected chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, minHeight: 28 }}>
                {(form.income_drawdown_reasons || []).length === 0 ? (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>No reasons selected</span>
                ) : (
                  incomeDrawdownReasons
                    .filter(r => (form.income_drawdown_reasons || []).includes(r.id))
                    .map(r => (
                      <span key={r.id} style={{
                        background: '#fffbeb', color: '#92400e',
                        border: '1px solid #fde68a',
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        {r.text}
                        <button
                          type="button"
                          onClick={() => setF('income_drawdown_reasons',
                            form.income_drawdown_reasons.filter(x => x !== r.id)
                          )}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            color: '#fcd34d', fontSize: 14, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </span>
                    ))
                )}
              </div>

              {/* Library button */}
              <LibraryButton onOpen={() => setIncomeDrawdownReasonsModalOpen(true)} />

              {/* Modal */}
              <LibraryPickerModal
                isOpen={incomeDrawdownReasonsModalOpen}
                onClose={() => setIncomeDrawdownReasonsModalOpen(false)}
                title="Select Income Drawdown Reasons"
                options={incomeDrawdownReasons}
                selected={form.income_drawdown_reasons || []}
                onConfirm={(newSelected) => setF('income_drawdown_reasons', newSelected)}
              />
              <div className="mt-4">
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                  Additional Income Notes
                  {parseFloat(form.income_percentage) > 7.5 && <span className="text-destructive ml-1">* Required</span>}
                </Label>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Explain why income is required, whether the level appears sustainable, and whether there is any capital erosion risk.
                </p>
                <Textarea
                  value={form.income_notes || ''}
                  onChange={e => setF('income_notes', e.target.value)}
                  placeholder="Provide justification for income drawdown requirements..."
                  className="rounded-sm min-h-[56px] text-xs"
                />
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3">
            <Button type="button" onClick={()=>navigate(`/proposal/${proposalId}/engine`,{state:{step:'recommendations'}})} variant="outline" className="flex-1 h-9 rounded-sm text-xs">Cancel</Button>
            <Button type="submit" disabled={submitting||!form.provider||!form.product_type||(!form.lump_sum&&!form.recurring)}
              className="flex-1 h-9 bg-ocean hover:bg-sky text-white rounded-sm text-xs font-medium disabled:opacity-50">
              {submitting?'Saving...':isEdit?'Update Investment':'Add Investment'}
            </Button>
          </div>
        </form>
      </div>

      {/* Duplicate Investment Confirmation Modal */}
      {duplicateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-navy mb-1">Duplicate Investment Detected</h3>
                <p className="text-xs text-muted-foreground">
                  An investment already exists for <strong>{duplicateConfirm.provider}</strong> — <strong>{duplicateConfirm.product_type}</strong>.
                  Are you sure you want to add another one?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-8 text-xs rounded-sm"
                onClick={() => setDuplicateConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 h-8 text-xs bg-ocean hover:bg-sky text-white rounded-sm"
                onClick={() => {
                  const data = duplicateConfirm.pendingData;
                  setDuplicateConfirm(null);
                  doSave(data);
                }}
              >
                Add Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}