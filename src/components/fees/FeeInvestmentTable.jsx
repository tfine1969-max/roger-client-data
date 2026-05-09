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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Investment Name','Currency','Original Value','Exchange Rate','Value (ZAR)','Rebate %','Advisory %','Source','Monthly Rebate','Monthly Advisory','Total Monthly',''].map(h => (
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
                   <td className="px-3 py-2.5 font-medium max-w-[180px] truncate text-sm">{r.investment_name}</td>
                   <td className="px-3 py-2.5 text-muted-foreground text-center font-semibold whitespace-nowrap">{r.currency}</td>
                   <td className="px-3 py-2.5 text-right font-sans text-sm whitespace-nowrap">{r.currency} {fmtNum(r.original_currency_value ?? 0)}</td>
                   <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">{r.currency === 'ZAR' ? '-' : (r.exchange_rate_to_zar?.toFixed(4) ?? '-')}</td>
                   <td className="px-3 py-2.5 text-right font-sans text-sm whitespace-nowrap">R {fmtNum(r.zar_value ?? 0)}</td>
                   <td className="px-3 py-2.5 text-right">
                     <span className={`text-xs px-1.5 py-0.5 rounded ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                       {r.fee_required ? 'Req.' : `${(r.rebate_fee_annual_percent ?? 0).toFixed(2)}%`}
                     </span>
                   </td>
                   <td className="px-3 py-2.5 text-right">
                     <span className={`text-xs px-1.5 py-0.5 rounded ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                       {r.fee_required ? 'Req.' : `${(r.advisory_fee_annual_percent ?? 0).toFixed(2)}%`}
                     </span>
                   </td>
                   <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                     {r.fee_required ? 'Missing' : r.fee_source === 'override' ? 'Override' : 'Map'}
                   </td>
                   <td className="px-3 py-2.5 font-sans text-right text-sm text-chart-2 whitespace-nowrap">R {fmtNum(r.rebate_fee_monthly_amount_zar ?? 0)}</td>
                   <td className="px-3 py-2.5 font-sans text-right text-sm text-chart-1 whitespace-nowrap">R {fmtNum(r.advisory_fee_monthly_amount_zar ?? 0)}</td>
                   <td className="px-3 py-2.5 font-sans text-right text-sm font-semibold whitespace-nowrap">R {fmtNum(r.total_monthly_fee_zar ?? 0)}</td>
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
                 <td className="px-3 py-2.5 text-xs uppercase tracking-wider" colSpan={8}>Total</td>
                  <td className="px-3 py-2.5 font-sans text-right text-sm text-chart-2">
                    R {fmtNum(rows.reduce((s, r) => s + (r.rebate_fee_monthly_amount_zar ?? 0), 0))}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-right text-sm text-chart-1">
                    R {fmtNum(rows.reduce((s, r) => s + (r.advisory_fee_monthly_amount_zar ?? 0), 0))}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-right text-sm font-bold">
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
          feeOptions={feeOptions}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); onFeeUpdated(); }}
        />
      )}
    </>
  );
}