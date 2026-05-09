import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AddMonthlyValueDialog from './AddMonthlyValueDialog';
import DeleteInvestmentButton from './DeleteInvestmentButton';

export default function InvestmentTable({ investments, monthlyValues, selectedMonth, onRefresh }) {
  const valueMap = useMemo(() => {
    const map = {};
    monthlyValues.forEach(v => {
      map[`${v.investment_id}||${v.month}`] = v;
    });
    return map;
  }, [monthlyValues]);

  // Find latest and previous month values for each investment
  const enriched = useMemo(() => {
    return investments.map(inv => {
      const invValues = monthlyValues
        .filter(v => v.investment_id === inv.id)
        .sort((a, b) => b.month.localeCompare(a.month));

      const latest = selectedMonth
        ? monthlyValues.find(v => v.investment_id === inv.id && v.month === selectedMonth)
        : invValues[0];

      const previous = invValues.find(v => v !== latest);
      const change = latest && previous
        ? ((latest.market_value - previous.market_value) / previous.market_value) * 100
        : null;

      return { inv, latest, change };
    });
  }, [investments, monthlyValues, selectedMonth]);

  if (investments.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No investments yet.</p>;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Investment / Fund</TableHead>
            <TableHead className="font-semibold">Platform</TableHead>
            <TableHead className="font-semibold">CCY</TableHead>
            <TableHead className="font-semibold text-right">Market Value</TableHead>
            <TableHead className="font-semibold text-right">Units</TableHead>
            <TableHead className="font-semibold text-right">Unit Price</TableHead>
            <TableHead className="font-semibold text-right">Change</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enriched.map(({ inv, latest, change }) => (
            <TableRow key={inv.id} className="hover:bg-muted/30">
              <TableCell className="font-medium max-w-[200px]">
                <p className="truncate">{inv.investment_name}</p>
                {inv.portfolio_id && <p className="text-xs text-muted-foreground">ID: {inv.portfolio_id}</p>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{inv.platform}</Badge>
              </TableCell>
              <TableCell className="text-sm font-mono">{inv.currency}</TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold">
                {latest ? latest.market_value?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {latest?.number_of_units ? latest.number_of_units.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {latest?.unit_price ? latest.unit_price.toFixed(4) : '—'}
              </TableCell>
              <TableCell className="text-right">
                {change !== null ? (
                  <span className={cn("text-sm font-semibold", change >= 0 ? "text-accent" : "text-destructive")}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                ) : <span className="text-muted-foreground text-xs">—</span>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <AddMonthlyValueDialog
                    investment={inv}
                    existingValue={selectedMonth ? valueMap[`${inv.id}||${selectedMonth}`] : undefined}
                    onSaved={onRefresh}
                  />
                  <DeleteInvestmentButton investmentId={inv.id} onDeleted={onRefresh} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}