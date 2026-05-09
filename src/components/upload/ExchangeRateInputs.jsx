import { Input } from '@/components/ui/input';

/**
 * Shows one rate input per non-ZAR currency found in the uploaded file.
 * rates: { [currency]: string }
 * onChange: (currency, value) => void
 */
export default function ExchangeRateInputs({ currencies, rates, onChange }) {
  const nonZar = currencies.filter(c => c !== 'ZAR');
  if (nonZar.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Exchange Rates to ZAR <span className="text-destructive">*</span></p>
      <p className="text-xs text-muted-foreground">Enter the month-end exchange rate for each non-ZAR currency in this file.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {nonZar.map(ccy => (
          <div key={ccy} className="flex items-center gap-3 bg-muted/30 border rounded-lg px-3 py-2">
            <span className="text-sm font-semibold w-12 shrink-0">{ccy}</span>
            <span className="text-xs text-muted-foreground shrink-0">1 {ccy} =</span>
            <Input
              type="number"
              step="0.0001"
              min="0"
              placeholder="e.g. 18.50"
              value={rates[ccy] ?? ''}
              onChange={e => onChange(ccy, e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground shrink-0">ZAR</span>
          </div>
        ))}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-sm font-semibold w-12 shrink-0 text-green-700">ZAR</span>
          <span className="text-xs text-muted-foreground shrink-0">1 ZAR =</span>
          <span className="text-sm font-medium text-green-700 ml-1">1.0000 ZAR</span>
        </div>
      </div>
    </div>
  );
}
