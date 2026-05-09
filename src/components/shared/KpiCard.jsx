import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KpiCard({ title, value, subtitle, change, changeLabel, icon: Icon, accent = false }) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const hasChange = change !== null && change !== undefined;

  return (
    <div className={cn(
      "bg-white rounded-lg border p-6 relative overflow-hidden",
      accent && "border-l-4 border-l-primary"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
          <p className="text-2xl font-semibold text-foreground truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {hasChange && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              isPositive ? "text-positive" : isNegative ? "text-negative" : "text-muted-foreground"
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>{isPositive ? '+' : ''}{typeof change === 'number' ? change.toFixed(2) + '%' : change}</span>
              {changeLabel && <span className="text-muted-foreground font-normal">{changeLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}