import { useState } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Button } from '@/components/ui/button';
import { Pencil, CheckSquare } from 'lucide-react';
import FeeEditModal from './FeeEditModal';
import BulkFeeEditModal from './BulkFeeEditModal';

export default function FeeInvestmentTable({ rows, feeOptions, onFeeUpdated }) {
  const [editRow, setEditRow] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkEdit, setBulkEdit] = useState(false);

  const allIds = rows.map((r, i) => r.id ?? i);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleRow = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectedRows = rows.filter((r, i) => selected.has(r.id ?? i));

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selected.size} row{selected.size > 1 ? 's' : ''} selected</span>
          <Button size="sm" className="ml-auto gap-1.5" onClick={() => setBulkEdit(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Fees for Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-border cursor-pointer"
                />
              </th>
              <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
              <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground">Fund</th>
              <th className="text-center px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Curr</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (Orig)</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Rate</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value (ZAR)</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Rebate</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Advisory</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Mo. Rebate</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Mo. Advisory</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Total</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
            <tr><td colSpan={13} className="text-center py-8 text-muted-foreground">No data.</td></tr>
            )}
            {rows.map((r, i) => {
              const id = r.id ?? i;
              const isSel = selected.has(id);
              return (
                <tr
                  key={id}
                  className={`hover:bg-muted/20 cursor-pointer ${isSel ? 'bg-primary/5' : r.fee_required ? 'bg-yellow-50/50' : ''}`}
                  onClick={() => toggleRow(id)}
                >
                  <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleRow(id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5 max-w-[160px]">
                    <p className="font-medium text-xs truncate">{r.portfolio_name || r.account_code || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{r.account_code}</p>
                  </td>
                  <td className="px-2 py-1.5 font-medium max-w-[200px] truncate">{r.investment_name}</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground font-semibold whitespace-nowrap">{r.currency}</td>
                  <td className="px-2 py-1.5 text-right font-numbers whitespace-nowrap">{fmtNum(r.original_currency_value ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right font-numbers whitespace-nowrap">{r.currency === 'ZAR' ? '-' : (r.exchange_rate_to_zar?.toFixed(3) ?? '-')}</td>
                  <td className="px-2 py-1.5 text-right font-numbers whitespace-nowrap">{fmtNum(r.zar_value ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {r.fee_required ? 'Req' : `${(r.rebate_fee_annual_percent ?? 0).toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {r.fee_required ? 'Req' : `${(r.advisory_fee_annual_percent ?? 0).toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-numbers text-right text-chart-2 whitespace-nowrap">{fmtNum(r.rebate_fee_monthly_amount_zar ?? 0)}</td>
                  <td className="px-2 py-1.5 font-numbers text-right text-chart-1 whitespace-nowrap">{fmtNum(r.advisory_fee_monthly_amount_zar ?? 0)}</td>
                  <td className="px-2 py-1.5 font-numbers text-right font-semibold whitespace-nowrap">{fmtNum(r.total_monthly_fee_zar ?? 0)}</td>
                  <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditRow(r)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t-2 font-semibold">
              <td colSpan={9} className="px-2 py-2 text-xs uppercase tracking-wider">Total</td>
              <td className="px-2 py-2 font-numbers text-right text-chart-2">
                {fmtNum(rows.reduce((s, r) => s + (r.rebate_fee_monthly_amount_zar ?? 0), 0))}
              </td>
              <td className="px-2 py-2 font-numbers text-right text-chart-1">
                {fmtNum(rows.reduce((s, r) => s + (r.advisory_fee_monthly_amount_zar ?? 0), 0))}
              </td>
              <td className="px-2 py-2 font-numbers text-right font-bold">
                {fmtNum(rows.reduce((s, r) => s + (r.total_monthly_fee_zar ?? 0), 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {editRow && (
        <FeeEditModal
          row={editRow}
          feeOptions={feeOptions}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); onFeeUpdated(); }}
        />
      )}

      {bulkEdit && selectedRows.length > 0 && (
        <BulkFeeEditModal
          rows={selectedRows}
          feeOptions={feeOptions}
          onClose={() => setBulkEdit(false)}
          onSaved={() => { setBulkEdit(false); setSelected(new Set()); onFeeUpdated(); }}
        />
      )}
    </>
  );
}