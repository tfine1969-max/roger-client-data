import { Link } from 'react-router-dom';
import { ChevronRight, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientCard({ client, totalValue, investmentCount, gainPercent }) {
  const isPositive = gainPercent >= 0;

  return (
    <Link
      to={`/clients/${client.id}`}
      className="group block bg-card rounded-2xl border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {client.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {client.name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              {client.email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" /> {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" /> {client.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-semibold">${totalValue?.toLocaleString() || '0'}</p>
            <div className="flex items-center gap-2 justify-end mt-0.5">
              <span className="text-xs text-muted-foreground">{investmentCount} investments</span>
              {gainPercent !== undefined && (
                <span className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                  isPositive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                )}>
                  {isPositive ? '+' : ''}{gainPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}