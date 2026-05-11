import { useState, useMemo } from 'react';
import { fmtNum } from '@/lib/valuation-utils';
import { Button } from '@/components/ui/button';
import { Pencil, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import FeeEditModal from './FeeEditModal';
import BulkFeeEditModal from './BulkFeeEditModal';

export default function FeeInvestmentTable({ rows, feeOptions, onFeeUpdated }) {
  const [editRow, setEditRow] = useState(null);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [selectedClients, setSelectedClients] = useState(new Set());

  // Group rows by client (account_code)
  const clientGroups = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const key = r.account_code || r.portfolio_name || 'Unknown';
      if (!map[key]) map[key] = {
        key,
        name: r.portfolio_name || r.account_code || 'Unknown',
        account_code: r.account_code,
        items: [],
        totalZar: 0,
        totalRebate: 0,
        totalAdvisory: 0,
        totalFee: 0,
        missingFees: 0,
      };
      map[key].items.push(r);
      map[key].totalZar += r.zar_value ?? 0;
      map[key].totalRebate += r.rebate_fee_monthly_amount_zar ?? 0;
      map[key].totalAdvisory += r.advisory_fee_monthly_amount_zar ?? 0;
      map[key].totalFee += r.total_monthly_fee_zar ?? 0;
      if (r.fee_required) map[key].missingFees++;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const allClientKeys = clientGroups.map(g => g.key);
  const allSelected = allClientKeys.length > 0 && allClientKeys.every(k => selectedClients.has(k));

  const toggleAllClients = () => {
    if (allSelected) setSelectedClients(new Set());
    else setSelectedClients(new Set(allClientKeys));
  };

  const toggleClient = (key) => {
    const next = new Set(selectedClients);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedClients(next);
  };

  const toggleExpand = (key) => {
    const next = new Set(expandedClients);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedClients(next);
  };

  const selectedRows = useMemo(
    () => clientGroups.filter(g => selectedClients.has(g.key)).flatMap(g => g.items),
    [clientGroups, selectedClients]
  );

  const grandTotals = useMemo(() => ({
    zar: rows.reduce((s, r) => s + (r.zar_value ?? 0), 0),
    rebate: rows.reduce((s, r) => s + (r.rebate_fee_monthly_amount_zar ?? 0), 0),
    advisory: rows.reduce((s, r) => s + (r.advisory_fee_monthly_amount_zar ?? 0), 0),
    fee: rows.reduce((s, r) => s + (r.total_monthly_fee_zar ?? 0), 0),
  }), [rows]);

  return (
    <>
      {/* Bulk action bar */}
      {selectedClients.size > 0 && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {selectedClients.size} client{selectedClients.size > 1 ? 's' : ''} selected
            <span className="text-muted-foreground font-normal ml-1">({selectedRows.length} instruments)</span>
          </span>
          <Button size="sm" className="ml-auto gap-1.5" onClick={() => setBulkEdit(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Fees for Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedClients(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAllClients} className="rounded border-border cursor-pointer" />
              </th>
              <th className="w-6 px-1" />
              <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Holdings</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">AUM (ZAR)</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Mo. Rebate</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Mo. Advisory</th>
              <th className="text-right px-2 py-2 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Total Fee</th>
              <th className="px-2 py-2 w-6" />
            </tr>
          </thead>
          <tbody>
            {clientGroups.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No data.</td></tr>
            )}
            {clientGroups.map(group => {
              const isSel = selectedClients.has(group.key);
              const isExpanded = expandedClients.has(group.key);
              return (
                <>
                  {/* Client summary row */}
                  <tr
                    key={group.key}
                    className={`border-t cursor-pointer hover:bg-muted/20 ${isSel ? 'bg-primary/5' : group.missingFees > 0 ? 'bg-yellow-50/40' : ''}`}
                    onClick={() => toggleExpand(group.key)}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleClient(group.key)}
                        className="rounded border-border cursor-pointer"
                      />
                    </td>
                    <td className="px-1 py-2 text-muted-foreground">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-semibold text-xs">{group.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{group.account_code}</p>
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {group.items.length}
                      {group.missingFees > 0 && (
                        <span className="ml-1 px-1 rounded bg-yellow-100 text-yellow-800 font-semibold">{group.missingFees} req</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-numbers font-medium whitespace-nowrap">{fmtNum(group.totalZar)}</td>
                    <td className="px-2 py-2 text-right font-numbers text-chart-2 whitespace-nowrap">{fmtNum(group.totalRebate)}</td>
                    <td className="px-2 py-2 text-right font-numbers text-chart-1 whitespace-nowrap">{fmtNum(group.totalAdvisory)}</td>
                    <td className="px-2 py-2 text-right font-numbers font-semibold whitespace-nowrap">{fmtNum(group.totalFee)}</td>
                    <td className="px-2 py-2" />
                  </tr>

                  {/* Expanded instrument rows */}
                  {isExpanded && group.items.map((r, ii) => (
                    <tr
                      key={`${group.key}-${ii}`}
                      className={`border-t bg-muted/10 hover:bg-muted/20 ${r.fee_required ? 'bg-yellow-50/60' : ''}`}
                    >
                      <td className="px-3 py-1.5" />
                      <td className="px-1 py-1.5" />
                      <td className="px-2 py-1.5 pl-6" colSpan={1}>
                        <p className="font-medium truncate max-w-[260px]">{r.investment_name}</p>
                        <p className="text-muted-foreground">{r.currency} · Rate {r.currency === 'ZAR' ? '-' : (r.exchange_rate_to_zar?.toFixed(3) ?? '-')}</p>
                      </td>
                      <td className="px-2 py-1.5 text-right font-numbers whitespace-nowrap text-muted-foreground">
                        {fmtNum(r.original_currency_value ?? 0)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-numbers whitespace-nowrap">{fmtNum(r.zar_value ?? 0)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <span className={`px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'text-chart-2'}`}>
                          {r.fee_required ? 'Req' : fmtNum(r.rebate_fee_monthly_amount_zar ?? 0)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <span className={`px-1 py-0.5 rounded whitespace-nowrap inline-block ${r.fee_required ? 'bg-yellow-100 text-yellow-800 font-semibold' : 'text-chart-1'}`}>
                          {r.fee_required ? 'Req' : fmtNum(r.advisory_fee_monthly_amount_zar ?? 0)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-numbers font-semibold whitespace-nowrap">{fmtNum(r.total_monthly_fee_zar ?? 0)}</td>
                      <td className="px-2 py-1.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditRow(r)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t-2 font-semibold">
              <td colSpan={4} className="px-2 py-2 text-xs uppercase tracking-wider">Total</td>
              <td className="px-2 py-2 font-numbers text-right">{fmtNum(grandTotals.zar)}</td>
              <td className="px-2 py-2 font-numbers text-right text-chart-2">{fmtNum(grandTotals.rebate)}</td>
              <td className="px-2 py-2 font-numbers text-right text-chart-1">{fmtNum(grandTotals.advisory)}</td>
              <td className="px-2 py-2 font-numbers text-right font-bold">{fmtNum(grandTotals.fee)}</td>
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
          onSaved={() => { setBulkEdit(false); setSelectedClients(new Set()); onFeeUpdated(); }}
        />
      )}
    </>
  );
}