import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function formatCurrency(value, currency) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value, decimals = 4) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export default function ChangeCell({ value, pct, isNew = false }) {
  if (isNew) {
    return <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">New</span>;
  }
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

  const isPositive = value >= 0;
  return (
    <div className="flex items-center gap-1">
      <span className={cn("text-sm font-medium", isPositive ? "text-positive" : "text-negative")}>
        {isPositive ? '+' : ''}{formatCurrency(value)}
      </span>
      {pct !== null && pct !== undefined && !isNaN(pct) && (
        <span className={cn(
          "text-xs font-medium px-1.5 py-0.5 rounded",
          isPositive ? "bg-positive text-positive" : "bg-negative text-negative"
        )}>
          {isPositive ? '+' : ''}{pct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}