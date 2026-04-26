import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PhraseLibrary, { LibraryButton } from '@/components/engine/PhraseLibrary';

const LOCAL_PROVIDERS = ['Investec', 'Sanlam', 'Allan Gray', 'Coronation', 'Ninety One'];
const OFFSHORE_PROVIDERS = ['Vanguard', 'Blackrock', 'Fidelity', 'Charles Schwab', 'Interactive Brokers'];
const CURRENCIES_OFFSHORE = ['USD', 'GBP', 'EUR'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'];
const UNDERLYING_FUNDS_OPTIONS = ['Index Fund', 'Balanced Fund', 'Equity Fund', 'Bond Fund', 'Multi-Asset Fund'];
const PRODUCT_TYPES = [
  'Retirement Annuity', 'Living Annuity', 'Endowment', 'Tax-Free Savings Account',
  'Unit Trust / CIS', 'Preservation Fund', 'Pension Fund', 'Provident Fund',
  'Offshore Investment Bond', 'Discretionary Portfolio', 'Model Portfolio',
];

const detectAnnexure = (productType, jurisdiction, currency) => {
  const pt  = String(productType  || '').toLowerCase();
  const jur = String(jurisdiction || '').toLowerCase();
  const cur = String(currency     || '').toUpperCase();

  if (pt.includes('model portfolio') || pt.includes('discretionary portfolio')) return 'A';
  if (
    pt.includes('unit trust') || pt.includes('cis') || pt.includes('collective') ||
    jur.includes('off') || (cur !== 'ZAR' && cur !== '' && cur !== 'R')
  ) return 'B';
  if (
    pt.includes('private equity') || pt.includes('real estate') || pt.includes('unlisted') ||
    pt.includes('alternative') || pt.includes('share') || pt.includes('etf') ||
    pt.includes('direct securities')
  ) return 'C';
  return '';
};

const ANNEXURE_LABELS = {
  A: 'Annexure A — Model Portfolios',
  B: 'Annexure B — Collective Investments & Offshore Platforms',
  C: 'Annexure C — Alternative Investments & Direct Securities',
};

export default function AddEditInvestment() {
  const { id: proposalId, investmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    jurisdiction: 'Local',
    currency: 'ZAR',
    provider: '',
    product_type: '',
    underlying_funds: [],
    custom_fund: '',
    lump_sum: false,
    recurring: false,
    lump_sum_amount: '',
    recurring_amount: '',
    frequency: '',
    initial_fee_percent: '',
    annual_advice_fee_percent: '',
    platform_fee_percent: '',
    reason_for_recommendation: '',
    investment_mandate: 'No',
    applicable_annexure: '',
  });

  const [amountDisplay,    setAmountDisplay]    = useState('');
  const [recurringDisplay, setRecurringDisplay] = useState('');
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [libraryOpen,      setLibraryOpen]      = useState(false);

  // Auto-detect annexure whenever product type, jurisdiction, or currency changes
  useEffect(() => {
    if (formData.investment_mandate === 'Yes') {
      const detected = detectAnnexure(formData.product_type, formData.jurisdiction, formData.currency);
      if (detected) {
        setFormData(prev => ({ ...prev, applicable_annexure: detected }));
      }
    }
  }, [formData.product_type, formData.jurisdiction, formData.currency, formData.investment_mandate]);

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
      setFormData({
        jurisdiction:              investment.jurisdiction              || 'Local',
        currency:                  investment.currency                  || 'ZAR',
        provider:                  investment.provider                  || '',
        product_type:              investment.product_type              || '',
        underlying_funds:          Array.isArray(investment.underlying_funds) ? investment.underlying_funds : [],
        custom_fund:               investment.custom_fund               || '',
        lump_sum:                  isLump,
        recurring:                 isRecurring,
        lump_sum_amount:           investment.amount                    || '',
        recurring_amount:          investment.recurring_amount          || '',
        frequency:                 investment.frequency                 || '',
        initial_fee_percent:       investment.initial_fee_percent       || '',
        annual_advice_fee_percent: investment.annual_advice_fee_percent || '',
        platform_fee_percent:      investment.platform_fee_percent      || '',
        reason_for_recommendation: investment.reason_for_recommendation || '',
        investment_mandate:        investment.investment_mandate        || 'No',
        applicable_annexure:       investment.applicable_annexure       || '',
      });
      if (investment.amount)           setAmountDisplay(Number(investment.amount).toLocaleString('en-ZA'));
      if (investment.recurring_amount) setRecurringDisplay(Number(investment.recurring_amount).toLocaleString('en-ZA'));
    }
  }, [investment]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (investmentId) {
        await base44.entities.Investments.update(investmentId, data);
      } else {
        await base44.entities.Investments.create({ ...data, proposal_id: proposalId });
      }
      // Recalculate proposal-level mandate fields after every save
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const contribType = formData.lump_sum && formData.recurring ? 'Both'
      : formData.lump_sum ? '
