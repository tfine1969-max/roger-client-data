import { useState, useMemo } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Button } from '@/components/ui/button';
import { Pencil, AlertTriangle } from 'lucide-react';
import FeeEditModal from './FeeEditModal';

export default function FeeInvestmentTable({ rows, feeOptions, onFeeUpdated, currencyFilter }) {
  const [editRow, setEditRow] = useState(null);

  return (
    <>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Fund','Curr','Value (Orig)','Rate','Value (ZAR)','Rebate','Advisory','Monthly Rebate','Monthly Advisory','Total',''].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
               {rows.length === 0 && (
                 <tr><td colSpan={11} className="text-center py-8 text-muted-foreground text-xs">No data.</td></tr>
               )}
               {rows.map((r, i) => (
                 <tr key={r.id ?? i} className={`hover:bg-muted/20 ${r.fee_required ? 'bg-yellow-50/50' : ''}`}>
                   <td className="px-2 py-1.5 font-medium max-w-[120px] truncate text-xs">{r.investment_name}</td>
                   <td className="px-2 py-1.5 text-muted-foreground font-semibold text-center whitespace-nowrap text-xs">{r.currency}</td>
                   <td className="px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap">{fmtNum(r.original_currency_value ?? 0)}</td>
                   <td className="px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap">{r.currency === 'ZAR' ? '-' : (r.exchange_rate_to_zar?.toFixed(3) ?? '-')}</td>
                   <td className="px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap">{fmtNum(r.zar_value ?? 0)}</td>
                   <td className="px-2 py-1.5 text-right">
                     <span className={`text-xs px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                       {r.fee_required ? 'Req' : `${(r.rebate_fee_annual_percent ?? 0).toFixed(2)}%`}
                     </span>
                   </td>
                   <td className="px-2 py-1.5 text-right">
                     <span className={`text-xs px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                       {r.fee_required ? 'Req' : `${(r.advisory_fee_annual_percent ?? 0).toFixed(2)}%`}
                     </span>
                   </td>
                   <td className="px-2 py-1.5 font-mono text-right text-xs text-chart-2 whitespace-nowrap">{fmtNum(r.rebate_fee_monthly_amount_zar ?? 0)}</td>
                   <td className="px-2 py-1.5 font-mono text-right text-xs text-chart-1 whitespace-nowrap">{fmtNum(r.advisory_fee_monthly_amount_zar ?? 0)}</td>
                   <td className="px-2 py-1.5 font-mono text-right text-xs font-semibold whitespace-nowrap">{fmtNum(r.total_monthly_fee_zar ?? 0)}</td>
                   <td className="px-2 py-1.5">
                     <Button size="icon" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditRow(r)}>
                       <Pencil className="w-3 h-3" />
                     </Button>
                   </td>
                 </tr>
               ))}
            </tbody>
            <tfoot>
               <tr className="bg-muted/30 border-t-2 font-semibold">
                 <td className="px-2 py-2 text-xs uppercase tracking-wider" colSpan={7}>Total</td>
                  <td className="px-2 py-2 font-mono text-right text-xs text-chart-2">
                    {fmtNum(rows.reduce((s, r) => s + (r.rebate_fee_monthly_amount_zar ?? 0), 0))}
                  </td>
                  <td className="px-2 py-2 font-mono text-right text-xs text-chart-1">
                    {fmtNum(rows.reduce((s, r) => s + (r.advisory_fee_monthly_amount_zar ?? 0), 0))}
                  </td>
                  <td className="px-2 py-2 font-mono text-right text-xs font-bold">
                    {fmtNum(rows.reduce((s, r) => s + (r.total_monthly_fee_zar ?? 0), 0))}
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
          feeOptions={feeOptions}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); onFeeUpdated(); }}
        />
      )}
    </>
  );
}