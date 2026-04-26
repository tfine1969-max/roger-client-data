import React, { useState, useEffect } from 'react';
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

// ── PROVIDER / PRODUCT MAP ────────────────────────────────────────────────────
const PROVIDER_MAP = {
  Local: {
    'Allan Gray': {
      products: [
        'Unit Trust / Discretionary Investment',
        'Endowment',
        'Retirement Annuity',
        'Living Annuity',
        'Preservation Fund',
      ],
    },
    'Glacier by Sanlam': {
      products: [
        'Unit Trust / LISP Platform',
        'Endowment',
        'Retirement Annuity',
        'Living Annuity',
        'Preservation Fund',
        'Tax-Free Investment',
      ],
    },
    'Momentum Wealth': {
      products: [
        'Unit Trust / LISP Platform',
        'Endowment',
        'Retirement Annuity',
        'Living Annuity',
        'Preservation Fund',
        'Tax-Free Investment',
      ],
    },
    'Prime Investments': {
      products: [
        'Discretionary Investment',
        'Endowment',
      ],
    },
  },
  Offshore: {
    'Allan Gray': {
      products: [
        'Offshore Unit Trust',
        'Offshore Investment Platform',
        'Offshore Discretionary Investment',
      ],
    },
    'Credo': {
      products: [
        'Offshore Investment Platform',
        'Offshore Discretionary Portfolio',
        'Offshore Share Portfolio',
        'Offshore Model Portfolio',
      ],
    },
    'Glacier International': {
      products: [
        'Offshore Investment Platform',
        'Offshore Investment Bond',
        'Offshore Endowment',
        'Offshore Discretionary Portfolio',
        'Offshore Model Portfolio',
      ],
    },
    'Julius Baer': {
      products: [
        'Offshore Discretionary Portfolio',
        'Offshore Model Portfolio',
        'Offshore Share Portfolio',
      ],
    },
    'Momentum Wealth International': {
      products: [
        'Offshore Investment Platform',
        'Offshore Discretionary Portfolio',
      ],
    },
  },
};

// ── FUND LISTS — global per jurisdiction ──────────────────────────────────────
const LOCAL_FUNDS = [
  'Allan Gray - Orbis Global Balanced Feeder Fund',
  'Allan Gray - Orbis Global Equity Feeder Fund',
  'Allan Gray Balanced Fund',
  'Allan Gray Equity Fund',
  'Allan Gray Money Market Fund',
  'Allan Gray Stable Fund',
  'Allan Gray Tax-Free Balanced Fund',
  'Allan Gray Tax-Free Balanced Fund (Class A)',
  'Full Withdrawal Holding Fund',
  'Partial Withdrawal Holding Fund',
  'Coronation Balanced Defensive Fund (Class P)',
  'Coronation Balanced Plus Fund (Class P)',
  'Coronation Capital Plus Fund (Class P)',
  'Coronation Global Managed [ZAR] Feeder Fund (Class P)',
  'Coronation Global Opportunities Equity [ZAR] Feeder Fund (Class P)',
  'Coronation Strategic Income Fund (Class P)',
  'Foord Balanced Fund (Class B2)',
  'Foord Equity Fund (Class B2)',
  'Foord International Feeder Fund (Class B2)',
  'M&G Balanced Fund (Class B)',
  'M&G Dividend Maximiser Fund (Class B)',
  'M&G Equity Fund (Class B)',
  'M&G Inflation Plus Fund (Class B)',
  'Nedgroup Investments Stable Fund (Class A)',
  'Nedgroup Investments Stable Fund (Class A2)',
  'Ninety One Cautious Managed Fund (Class H)',
  'Ninety One Diversified Income Fund (Class H)',
  'Ninety One Equity Fund (Class E)',
  'Ninety One Global Franchise Feeder Fund (Class H)',
  'Ninety One Value Fund (Class H)',
  'Old Mutual Global Equity Fund (Class B1)',
  'Prescient Income Provider Fund (Class A2)',
  'STANLIB Property Income Fund (Class C3)',
  'Satrix ALSI Index Fund (Class B1)',
  'Satrix MSCI World Index Fund (Class B2)',
  'Wealthworks Prime Cautious Fund of Funds (Class A)',
  'Wealthworks Prime Managed Fund of Funds (Class A)',
];

const OFFSHORE_FUNDS = [
  'Allan Gray Money Market Fund (ZAR)',
  'Orbis Global Equity Fund (USD) (Class RRFA)',
  'Orbis Optimal SA Fund (EUR) (Class A)',
  'Orbis Optimal SA Fund (USD) (Class A)',
  'Orbis SICAV Emerging Markets Equity Fund (USD) (Class RRFA)',
  'Orbis SICAV Global Balanced Fund (USD) (Class RRFA)',
  'Orbis SICAV Global Cautious Fund (USD) (Class RRFC)',
  'Orbis SICAV Japan Equity Fund (JPY) (Class RRFA)',
  'Allan Gray Africa Bond Fund (USD) (Class C)',
  'Allan Gray Africa ex-SA Equity Fund (USD) (Class C)',
  'Allan Gray Frontier Markets Equity Fund (USD) (Class C)',
  'Allan Gray Australia Balanced Fund (AUD)',
  'Allan Gray Australia Equity Fund (AUD) (Class A)',
  'Allan Gray Australia Stable Fund (AUD)',
  'Artisan Global Value Fund (USD) (Class I)',
  'Baillie Gifford Worldwide Emerging Markets Leading Companies Fund (USD) (Class B)',
  'Baillie Gifford Worldwide Long Term Global Growth Fund (USD) (Class B)',
  'Catalyst Global Real Estate UCITS Fund (USD) (Class B)',
  'Coronation Global Capital Plus Fund (GBP hedged) (Class P)',
  'Coronation Global Capital Plus Fund (USD hedged) (Class P)',
  'Coronation Global Emerging Markets Fund (USD) (Class P)',
  'Coronation Global Equity Select Fund (USD) (Class P)',
  'Coronation Global Managed Fund (USD) (Class P)',
  'Coronation Global Opportunities Equity Fund (USD) (Class P)',
  'Coronation Global Optimum Growth Fund (USD) (Class P)',
  'Coronation Global Strategic USD Income Fund (USD) (Class P)',
  'Dodge & Cox U.S. Stock Fund (USD)',
  'Dodge & Cox Worldwide Global Stock Fund (USD)',
  'Fundsmith Equity Fund (GBP) (Class I)',
  'M&G Global Balanced Fund (USD) (Class B)',
  'M&G Global Inflation Plus Fund (USD) (Class B)',
  'Nedgroup Investments Core Global Fund (USD) (Class C)',
  'Nedgroup Investments Global Cautious Fund (USD) (Class C)',
  'Nedgroup Investments Global Equity Fund (USD) (Class C)',
  'Nedgroup Investments Global Flexible Fund (USD) (Class C)',
  'Nedgroup Investments Global Property Fund (USD) (Class C)',
  'Ninety One Global Franchise Fund (USD) (Class I)',
  'Ninety One Global Managed Income Fund (USD) (Class I)',
  'Ninety One Global Strategic Managed Fund (GBP hedged) (Class I)',
  'Ninety One Global Strategic Managed Fund (USD) (Class I)',
  'iShares Emerging Markets Equity Index Fund (USD) (Class F2)',
  'iShares Europe Equity Index Fund (EUR) (Class D2)',
  'iShares Global Government Bond Index Fund (USD) (Class F2)',
  'iShares North America Equity Index Fund (USD) (Class F2)',
  'iShares World Equity Index Fund (USD) (Class F2)',
  'Wealthworks Global Flexible Fund',
  'Xhaos Special Opportunities Fund',
];

const CURRENCIES_OFFSHORE = ['USD', 'GBP', 'EUR', 'AUD'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];

const detectAnnexure = (productType, jurisdiction) => {
  const pt  = String(productType  || '').toLowerCase();
  const jur = String(jurisdiction || '').toLowerCase();
  if (pt.includes('model portfolio') || pt.includes('discretionary')) return 'A';
  if (
    pt.includes('unit trust') || pt.includes('lisp') || pt.includes('platform') ||
    pt.includes('bond') || pt.includes('endowment') || jur.includes('off') ||
    pt.includes('offshore')
  ) return 'B';
  if (pt.includes('share portfolio') || pt.includes('direct')) return 'C';
  return 'B';
};

const ANNEXURE_LABELS = {
  A: 'Annexure A — Model / Discretionary Portfolios',
  B: 'Annexure B — Collective Investments & Offshore Platforms',
  C: 'Annexure C — Alternative Investments & Direct Securities',
};

const emptyFundRow = () => ({ fund: '', allocation: '', customFund: '' });

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    investment_mandate:        'No',
    applicable_annexure:       '',
    jurisdiction:              'Local',
    currency:                  'ZAR',
    provider:                  '',
    product_type:              '',
    fund_allocations:          [emptyFundRow()],
    custom_fund:               '',
    lump_sum:                  false,
    recurring:                 false,
    lump_sum_amount:           '',
    recurring_amount:          '',
    frequency:                 '',
    initial_fee_percent:       '',
    annual_advice_fee_percent: '',
    platform_fee_percent:      '',
    management_fee_percent:    '',
    performance_fee_percent:   '',
    hurdle_rate_percent:       '',
    structuring_fee_percent:   '',
    raising_fee_percent:       '',
    carry_fee_percent:         '',
    carry_hurdle_percent:      '',
    reason_for_recommendation: '',
  });

  const [amountDisplay,    setAmountDisplay]    = useState('');
  const [recurringDisplay, setRecurringDisplay] = useState('');
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [libraryOpen,      setLibraryOpen]      = useState(false);
  const [allocationError,  setAllocationError]  = useState('');

  const { data: investment } = useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => investmentId
      ? base44.entities.Investments.filter({ id: investmentId }).then(d => d[0])
      : null,
    enabled: !!investmentId,
  });

  useEffect(() => {
    if (investment) {
      const isRecurring = investment.contribution_type === 'Recurring' || investment.contribution_type === 'Both';
      const isLump      = investment.contribution_type === 'Lump Sum'  || investment.contribution_type === 'Both';
      let fundAllocations = [emptyFundRow()];
      if (Array.isArray(investment.fund_allocations) && investment.fund_allocations.length > 0) {
        fundAllocations = investment.fund_allocations;
      } else if (Array.isArray(investment.underlying_funds) && investment.underlying_funds.length > 0) {
        fundAllocations = investment.underlying_funds.map(f => ({ fund: f, allocation: '', customFund: '' }));
      }
      setFormData({
        investment_mandate:        investment.investment_mandate        || 'No',
        applicable_annexure:       investment.applicable_annexure       || '',
        jurisdiction:              investment.jurisdiction              || 'Local',
        currency:                  investment.currency                  || 'ZAR',
        provider:                  investment.provider                  || '',
        product_type:              investment.product_type              || '',
        fund_allocations:          fundAllocations,
        custom_fund:               investment.custom_fund               || '',
        lump_sum:                  isLump,
        recurring:                 isRecurring,
        lump_sum_amount:           investment.amount                    || '',
        recurring_amount:          investment.recurring_amount          || '',
        frequency:                 investment.frequency                 || '',
        initial_fee_percent:       investment.initial_fee_percent       || '',
        annual_advice_fee_percent: investment.annual_advice_fee_percent || '',
        platform_fee_percent:      investment.platform_fee_percent      || '',
        management_fee_percent:    investment.management_fee_percent    || '',
        performance_fee_percent:   investment.performance_fee_percent   || '',
        hurdle_rate_percent:       investment.hurdle_rate_percent       || '',
        structuring_fee_percent:   investment.structuring_fee_percent   || '',
        raising_fee_percent:       investment.raising_fee_percent       || '',
        carry_fee_percent:         investment.carry_fee_percent         || '',
        carry_hurdle_percent:      investment.carry_hurdle_percent      || '',
        reason_for_recommendation: investment.reason_for_recommendation || '',
      });
      if (investment.amount)           setAmountDisplay(Number(investment.amount).toLocaleString('en-ZA'));
      if (investment.recurring_amount) setRecurringDisplay(Number(investment.recurring_amount).toLocaleString('en-ZA'));
    }
  }, [investment]);

  useEffect(() => {
    if (formData.investment_mandate === 'Yes' && formData.product_type) {
      const detected = detectAnnexure(formData.product_type, formData.jurisdiction);
      setFormData(prev => ({ ...prev, applicable_annexure: detected }));
    }
  }, [formData.product_type, formData.jurisdiction, formData.investment_mandate]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) {
        await base44.entities.Investments.update(investmentId, data);
      } else {
        await base44.entities.Investments.create({ ...data, proposal_id: proposalId });
      }
      const allInvestments = await base44.entities.Investments.filter({ proposal_id: proposalId });
      const mandateInvs    = allInvestments.filter(inv => inv.investment_mandate === 'Yes');
      await base44.entities.Proposal.update(proposalId, {
        mandate_included:   mandateInvs.length > 0 ? 'Yes' : 'No',
        include_annexure_A: mandateInvs.some(inv => inv.applicable_annexure === 'A'),
        include_annexure_B: mandateInvs.some(inv => inv.applicable_annexure === 'B'),
        include_annexure_C: mandateInvs.some(inv => inv.applicable_annexure === 'C'),
      });
    },
    onSuccess: () => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } }),
  });

  // ── Fund allocation helpers ───────────────────────────────────────────────
  const filledFunds      = formData.fund_allocations.filter(r => r.fund && r.fund !== '__custom__' ? r.fund : r.customFund);
  const totalAllocation  = formData.fund_allocations.reduce((sum, row) => sum + (parseFloat(row.allocation) || 0), 0);
  const showAllocPct     = formData.fund_allocations.length > 1;

  const validateAllocations = () => {
    if (formData.fund_allocations.length <= 1) return true;
    const filled = formData.fund_allocations.filter(r => r.fund);
    if (filled.length <= 1) return true;
    const total = filled.reduce((s, r) => s + (parseFloat(r.allocation) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      setAllocationError(`Fund allocations must total 100%. Current total: ${total.toFixed(1)}%`);
      return false;
    }
    setAllocationError('');
    return true;
  };

  const addFundRow    = () => setFormData(prev => ({ ...prev, fund_allocations: [...prev.fund_allocations, emptyFundRow()] }));
  const removeFundRow = (i) => { setFormData(prev => ({ ...prev, fund_allocations: prev.fund_allocations.filter((_, idx) => idx !== i) })); setAllocationError(''); };
  const updateFundRow = (i, field, value) => {
    setFormData(prev => ({ ...prev, fund_allocations: prev.fund_allocations.map((row, idx) => idx === i ? { ...row, [field]: value } : row) }));
    setAllocationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllocations()) return;
    setIsSubmitting(true);

    const contribType = formData.lump_sum && formData.recurring ? 'Both' : formData.lump_sum ? 'Lump Sum' : 'Recurring';
    const activeAnnexure = formData.applicable_annexure || detectAnnexure(formData.product_type, formData.jurisdiction);

    const underlying_funds = formData.fund_allocations
      .filter(r => r.fund)
      .map(r => {
        const name = r.fund === '__custom__' ? (r.customFund || 'Custom Fund') : r.fund;
        return showAllocPct && r.allocation ? `${name} (${r.allocation}%)` : name;
      });

    const dataToSave = {
      investment_mandate:        formData.investment_mandate,
      applicable_annexure:       formData.investment_mandate === 'Yes' ? activeAnnexure : null,
      jurisdiction:              formData.jurisdiction,
      currency:                  formData.currency,
      provider:                  formData.provider,
      product_type:              formData.product_type,
      fund_allocations:          formData.fund_allocations,
      underlying_funds,
      custom_fund:               formData.custom_fund,
      contribution_type:         contribType,
      amount:                    parseFloat(String(formData.lump_sum_amount).replace(/[\s,]/g, ''))  || 0,
      recurring_amount:          parseFloat(String(formData.recurring_amount).replace(/[\s,]/g, '')) || 0,
      frequency:                 formData.frequency,
      initial_fee_percent:       parseFloat(formData.initial_fee_percent)       || 0,
      annual_advice_fee_percent: parseFloat(formData.annual_advice_fee_percent) || 0,
      platform_fee_percent:      parseFloat(formData.platform_fee_percent)      || 0,
      management_fee_percent:    parseFloat(formData.management_fee_percent)    || 0,
      performance_fee_percent:   parseFloat(formData.performance_fee_percent)   || 0,
      hurdle_rate_percent:       parseFloat(formData.hurdle_rate_percent)       || 0,
      structuring_fee_percent:   parseFloat(formData.structuring_fee_percent)   || 0,
      raising_fee_percent:       parseFloat(formData.raising_fee_percent)       || 0,
      carry_fee_percent:         parseFloat(formData.carry_fee_percent)         || 0,
      carry_hurdle_percent:      parseFloat(formData.carry_hurdle_percent)      || 0,
      reason_for_recommendation: formData.reason_for_recommendation,
    };

    saveMutation.mutate(dataToSave);
    setIsSubmitting(false);
  };

  const handleJurisdictionChange = (value) => {
    setFormData(prev => ({ ...prev, jurisdiction: value, currency: value === 'Local' ? 'ZAR' : 'USD', provider: '', product_type: '', fund_allocations: [emptyFundRow()] }));
  };

  const handleProviderChange = (value) => {
    setFormData(prev => ({ ...prev, provider: value, product_type: '', fund_allocations: [emptyFundRow()], reason_for_recommendation: '' }));
  };

  const handleProductTypeChange = (value) => {
    setFormData(prev => ({ ...prev, product_type: value, fund_allocations: [emptyFundRow()] }));
  };

  const providers      = Object.keys(PROVIDER_MAP[formData.jurisdiction] || {});
  const products       = formData.provider ? (PROVIDER_MAP[formData.jurisdiction]?.[formData.provider]?.products || []) : [];
  const availableFunds = formData.jurisdiction === 'Offshore' ? OFFSHORE_FUNDS : LOCAL_FUNDS;
  const activeAnnexure = formData.applicable_annexure || detectAnnexure(formData.product_type, formData.jurisdiction);

  const feeInput = (label, field) => (
    <div>
      <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">{label}</Label>
      <div className="relative">
        <Input type="number" step="0.01" value={formData[field]}
          onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder="0.00" className="h-8 text-xs rounded-sm pr-6" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
      </div>
    </div>
  );

  const toggleClass = (active) =>
    `flex items-center gap-2 px-3 py-2 border rounded-sm cursor-pointer transition-colors flex-1 text-xs font-medium ${
      active ? 'border-teal bg-teal/5 text-teal' : 'border-border text-navy hover:border-teal/50'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-2.5">
        <button onClick={() => navigate(`/proposal/${proposalId}/engine`, { state: { step: 'recommendations' } })}
          className="flex items-center gap-2 text-navy hover:text-ocean transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Step 2
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-base font-bold text-navy mb-0.5">{investmentId ? 'Edit Investment' : 'Add Investment'}</h1>
        <p className="text-xs text-muted-foreground mb-3">{investmentId ? 'Update investment details' : 'Create a new investment recommendation'}</p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── MANDATE TOGGLE ── */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider mb-3">Discretionary Mandate</h3>
            <div className="flex items-start gap-6">
              <div>
                <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">Subject to discretionary mandate?</Label>
                <div className="flex gap-1.5">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, investment_mandate: opt, applicable_annexure: opt === 'No' ? '' : prev.applicable_annexure }))}
                      className={`px-8 h-8 text-xs font-medium border rounded-sm transition-all ${
                        formData.investment_mandate === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {formData.investment_mandate === 'Yes' && (
                <div className="flex-1">
                  <Label className="text-[10px] font-semibold text-navy uppercase tracking-wider block mb-1">
                    Applicable Annexure
                    {activeAnnexure && (
                      <span className="ml-2 text-[9px] text-green-600 font-normal normal-case">
                        Auto-detected: {ANNEXURE_LABELS[activeAnnexure]}
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.applicable_annexure || activeAnnexure}
                    onValueChange={v => setFormData(prev => ({ ...prev, applicable_annexure: v }))}
                  >
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
            <h3 className="text-[10px] font-bold text-navy uppercase tracking-wider">Investment Detai
