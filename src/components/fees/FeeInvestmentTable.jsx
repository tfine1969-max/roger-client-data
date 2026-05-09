import { useState } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Button } from '@/components/ui/button';
import { Pencil, AlertTriangle } from 'lucide-react';
import FeeEditModal from './FeeEditModal';

export default function FeeInvestmentTable({ rows, onFeeUpdated }) {
  const [editRow, setEditRow] = useState(null);

  return (
    <>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Client','Platform','Investment Name','Currency','Value (R)','Rebate %','Advisory %','Monthly Rebate (R)','Monthly Advisory (R)','Total Monthly (R)',''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr><td colSpan={12} className="text-center py-10 text-muted-foreground text-sm">No data.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id ?? i} className={`hover:bg-muted/20 ${r.fee_required ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-3 py-2.5 font-medium max-w-[140px] truncate">
                    <span className="flex items-center gap-1">
                      {r.fee_required && <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />}
                      {r.portfolio_name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.platform}</td>
                  <td className="px-3 py-2.5 max-w-[160px] truncate text-xs">{r.investment_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.currency}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-xs">R {fmtNum(r.zar_value ?? r.month_end_market_value)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {r.fee_required ? 'Required' : `${(r.rebate_fee_annual_percent ?? 0).toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {r.fee_required ? 'Required' : `${(r.advisory_fee_annual_percent ?? 0).toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-right text-xs text-chart-2">{fmtNum(r.rebate_fee_monthly_amount_zar ?? 0)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-xs text-chart-1">{fmtNum(r.advisory_fee_monthly_amount_zar ?? 0)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-xs font-semibold">{fmtNum(r.total_monthly_fee_zar ?? 0)}</td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditRow(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 font-semibold">
                <td className="px-3 py-2.5 text-xs uppercase tracking-wider" colSpan={7}>Total</td>
                 <td className="px-3 py-2.5 font-mono text-right text-xs text-chart-2">
                   R {fmtNum(rows.reduce((s, r) => s + (r.rebate_fee_monthly_amount_zar ?? 0), 0))}
                 </td>
                 <td className="px-3 py-2.5 font-mono text-right text-xs text-chart-1">
                   R {fmtNum(rows.reduce((s, r) => s + (r.advisory_fee_monthly_amount_zar ?? 0), 0))}
                 </td>
                 <td className="px-3 py-2.5 font-mono text-right text-xs font-bold">
                   R {fmtNum(rows.reduce((s, r) => s + (r.total_monthly_fee_zar ?? 0), 0))}
                 </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {editRow && (
        <FeeEditModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); onFeeUpdated(); }}
        />
      )}
    </>
  );
}