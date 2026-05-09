import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, className }) {
  const isPositive = trend && trend >= 0;

  return (
    <div className={cn("bg-card rounded-2xl border p-6 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            isPositive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? '+' : ''}{Number(trend).toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs prev month</span>
        </div>
      )}
    </div>
  );
}