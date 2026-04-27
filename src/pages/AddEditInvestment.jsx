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

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();
  const isLoadingRef = useRef(true); // prevents auto-detect from firing during load

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
    queryFn: () => investmentId
      ? base44.entities.Investments.filter({ id: investmentId }).then(d => d[0])
      : null,
    enabled: !!investmentId,
  });

  // Load saved investment data — runs once when inv is fetched
  useEffect(() => {
    if (!inv) return;
    isLoadingRef.current = true; // block auto-detect during load

    const isRec  = inv.contribution_type === 'Recurring' || inv.contribution_type === 'Both';
    const isLump = inv.contribution_type === 'Lump Sum'  || inv.contribution_type === 'Both';

    let fund_rows = [emptyRow()];
    if (Array.isArray(inv.fund_allocations) && inv.fund_allocations.length > 0) {
      fund_rows = inv.fund_allocations;
    } else if (Array.isArray(inv.underlying_funds) && inv.underlying_funds.length > 0) {
      fund_rows = inv.underlying_funds.map(f => ({ fund: f, allocation: '', customFund: '' }));
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
      initial_fee_percent:       inv.initial_fee_percent       != null ? String(inv.initial_fee_percent)       : '',
      annual_advice_fee_percent: inv.annual_advice_fee_percent != null ? String(inv.annual_advice_fee_percent) : '',
      platform_fee_percent:      inv.platform_fee_percent      != null ? String(inv.platform_fee_percent)      : '',
      management_fee_percent:    inv.management_fee_percent    != null ? String(inv.management_fee_percent)    : '',
      performance_fee_percent:   inv.performance_fee_percent   != null ? String(inv.performance_fee_percent)   : '',
      hurdle_rate_percent:       inv.hurdle_rate_percent       != null ? String(inv.hurdle_rate_percent)       : '',
      structuring_fee_percent:   inv.structuring_fee_percent   != null ? String(inv.structuring_fee_percent)   : '',
      raising_fee_percent:       inv.raising_fee_percent       != null ? String(inv.raising_fee_percent)       : '',
      carry_fee_percent:         inv.carry_fee_percent         != null ? String(inv.carry_fee_percent)         : '',
      carry_hurdle_percent:      inv.carry_hurdle_percent      != null ? String(inv.carry_hurdle_percent)      : '',
      reason_for_recommendation: inv.reason_for_recommendation || '',
    });

    if (inv.amount)           setAmtDisplay(Number(inv.amount).toLocaleString('en-ZA'));
    if (inv.recurring_amount) setRecDisplay(Number(inv.recurring_amount).toLocaleString('en-ZA'));

    // Allow auto-detect to run after load is complete
    setTimeout(() => { isLoadingRef.current = false; }, 100);
  }, [inv]);

  // Auto-detect annexure — only when user changes fields, not during load
  useEffect(() => {
    if (isLoadingRef.current) return;
    if (form.investment_mandate === 'Yes' && form.product_type) {
      const detected = detectAnnexure(form.product_type, form.jurisdiction);
      setForm(p => {
        if (p.applicable_annexure === detected) return p;
        return { ...p, applicable_annexure: detected };
      });
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
      const proposalInvs  = allInvestments.filter(inv => inv.proposal_id === proposalId);
      const mandateInvs   = proposalInvs.filter(inv => inv.investment_mandate === 'Yes');
      await base44.entities.Proposal.update(proposalId, {
        mandate_included:   mandateInvs.length > 0 ? 'Yes' : 'No',
        include_annexure_A: mandateInvs.some(inv => inv.applicable_annexure === 'A'),
        include_annexure_B: mandateInvs.some(inv => inv.applicable_annexure === 'B'),
        include_annexure_C: mandateInvs.some(inv => inv.applicable_annexure === 'C'),
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
    setAllocError(''); return true;
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

    const contrib    = form.lump_sum && form.recurring ? 'Both' : form.lump_sum ? 'Lump Sum' : 'Recurring';
    const activeAnn  = form.applicable_annexure || detectAnnexure(form.product_type, form.jurisdiction);
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
      platform_fee_percent:      parseFloat(form.platform_fee_perce
