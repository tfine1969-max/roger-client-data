import { Link } from 'react-router-dom';
import { ChevronRight, Hash, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientCard({ client, totalValue, investmentCount, gainPercent, latestMonth }) {
  const isPositive = gainPercent >= 0;
  const hasValue = totalValue > 0;

  return (
    <Link
      to={`/clients/${client.id}`}
      className="group block bg-card rounded-2xl border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {client.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {client.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {client.account_code && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="w-3 h-3" /> {client.account_code}
                </span>
              )}
              {client.identity_no && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" /> {client.identity_no}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            {hasValue ? (
              <>
                <p className="font-semibold font-mono">
                  {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center gap-2 justify-end mt-0.5">
                  <span className="text-xs text-muted-foreground">{investmentCount} investments</span>
                  {gainPercent !== 0 && latestMonth && (
                    <span className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                      isPositive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                    )}>
                      {isPositive ? '+' : ''}{gainPercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{investmentCount} investments</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}