import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import UpdateValueDialog from './UpdateValueDialog';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const typeLabels = {
  stocks: 'Stocks', bonds: 'Bonds', real_estate: 'Real Estate',
  mutual_funds: 'Mutual Funds', etfs: 'ETFs', crypto: 'Crypto',
  cash: 'Cash', other: 'Other'
};

const typeColors = {
  stocks: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  bonds: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  real_estate: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  mutual_funds: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  etfs: 'bg-primary/10 text-primary border-primary/20',
  crypto: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  cash: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function InvestmentTable({ investments, onUpdated }) {
  const handleDelete = async (id) => {
    await base44.entities.Investment.delete(id);
    onUpdated?.();
  };

  if (investments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No investments yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Investment</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold text-right">Initial</TableHead>
            <TableHead className="font-semibold text-right">Current</TableHead>
            <TableHead className="font-semibold text-right">Gain/Loss</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map(inv => {
            const gain = (inv.current_value || 0) - (inv.initial_value || 0);
            const gainPct = inv.initial_value ? (gain / inv.initial_value) * 100 : 0;
            const isPositive = gain >= 0;

            return (
              <TableRow key={inv.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{inv.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs border", typeColors[inv.type])}>
                    {typeLabels[inv.type] || inv.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  ${inv.initial_value?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  ${inv.current_value?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "text-sm font-semibold",
                    isPositive ? "text-accent" : "text-destructive"
                  )}>
                    {isPositive ? '+' : ''}{gainPct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <UpdateValueDialog investment={inv} onUpdated={onUpdated} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}