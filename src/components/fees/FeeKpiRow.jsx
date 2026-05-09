import { fmtNum } from '@/lib/valuation-utils';

export default function FeeKpiRow({ totalRebateZar, totalAdvisoryZar, totalFeeZar, feeRequiredCount }) {
  const cards = [
    { label: 'Monthly Rebate Fees', value: `R ${fmtNum(totalRebateZar)}`, sub: `Annual: R ${fmtNum(totalRebateZar * 12)}`, color: 'border-l-chart-2' },
    { label: 'Monthly Advisory Fees', value: `R ${fmtNum(totalAdvisoryZar)}`, sub: `Annual: R ${fmtNum(totalAdvisoryZar * 12)}`, color: 'border-l-chart-1' },
    { label: 'Total Monthly Fees', value: `R ${fmtNum(totalFeeZar)}`, sub: `Annual: R ${fmtNum(totalFeeZar * 12)}`, color: 'border-l-chart-5' },
    { label: 'Investments Missing Fee', value: feeRequiredCount, sub: 'flagged as Fee Required', color: 'border-l-destructive', warn: feeRequiredCount > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-white border rounded-lg p-5 border-l-4 ${c.color}`}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">{c.label}</p>
          <p className={`text-xl font-bold font-mono ${c.warn ? 'text-destructive' : 'text-foreground'}`}>{c.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}