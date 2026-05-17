import { useMemo } from 'react';
import { formatClientName, clientKey, hasUnknownValue } from '@/lib/client-utils';
import { formatMonth } from '@/lib/valuation-utils';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

/**
 * Shows a cross-month matrix: rows = unique clients (alphabetical), columns = months (ascending).
 * Cells show "Y" if the client appears in that month.
 * Clicking a client name starts editing; clicking a row selects it.
 */
export default function MonthlyComparisonView({ valuations, months, selectedKeys, toggleSelect, startEditingName, editingKey, editingSurname, editingFirstNames, setEditingSurname, setEditingFirstNames, handleSaveName, setEditingKey, buildStructuredClientName }) {
  // Months ascending (chronological)
  const sortedMonths = useMemo(() => [...months].reverse(), [months]);

  // Build map of all unique clients across all months
  const allClients = useMemo(() => {
    const map = {};
    valuations.forEach(row => {
      const key = clientKey(row);
      if (!map[key]) {
        map[key] = { client_key: key, name: '', account_codes: new Set(), monthsPresent: new Set(), hasUnknown: false };
      }
      const c = map[key];
      if (!c.name || hasUnknownValue(c.name)) c.name = row.portfolio_name || c.name;
      if (row.account_code) c.account_codes.add(row.account_code);
      c.monthsPresent.add(row.upload_month);
      if (!c.hasUnknown && (hasUnknownValue(row.portfolio_name) || hasUnknownValue(row.account_code))) {
        c.hasUnknown = true;
      }
    });

    return Object.values(map)
      .map(c => ({ ...c, account_codes: [...c.account_codes].sort() }))
      .sort((a, b) => (formatClientName(a.name) || '').localeCompare(formatClientName(b.name) || ''));
  }, [valuations]);

  // Count per month
  const countPerMonth = useMemo(() => {
    const counts = {};
    sortedMonths.forEach(m => {
      counts[m] = allClients.filter(c => c.monthsPresent.has(m)).length;
    });
    return counts;
  }, [allClients, sortedMonths]);

  if (sortedMonths.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No data available.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                Client
              </th>
              {sortedMonths.map(m => (
                <th key={m} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[80px]">
                  {formatMonth(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {allClients.map((client, idx) => {
              const selected = selectedKeys.has(client.client_key);
              const isEditing = editingKey === client.client_key;
              return (
                <tr
                  key={client.client_key}
                  className={cn('group transition-colors hover:bg-muted/30', selected && 'bg-primary/5', idx % 2 === 1 && !selected && 'bg-slate-50/50')}
                >
                  {/* Client name cell */}
                  <td className={cn('sticky left-0 z-10 border-r border-border px-4 py-2', selected ? 'bg-primary/5' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white')}>
                    <div className="flex items-center gap-1.5">
                      {client.hasUnknown && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <button
                        type="button"
                        onClick={() => toggleSelect(client.client_key)}
                        className={cn(
                          'mr-1 h-4 w-4 shrink-0 rounded border transition-colors',
                          selected ? 'border-primary bg-primary' : 'border-border bg-white hover:border-primary/50'
                        )}
                        aria-label="Select"
                      >
                        {selected && <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-white">✓</span>}
                      </button>
                      {isEditing ? (
                        <div className="flex flex-wrap items-end gap-1">
                          <input
                            type="text"
                            value={editingSurname}
                            onChange={e => setEditingSurname(e.target.value)}
                            placeholder="Surname / Entity"
                            className="w-32 rounded border px-1.5 py-0.5 text-xs"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingFirstNames}
                            onChange={e => setEditingFirstNames(e.target.value)}
                            placeholder="First names"
                            className="w-28 rounded border px-1.5 py-0.5 text-xs"
                          />
                          <button type="button" onClick={() => handleSaveName(client.client_key)} className="rounded px-1.5 py-0.5 text-xs bg-primary text-white hover:bg-primary/90">Save</button>
                          <button type="button" onClick={() => setEditingKey(null)} className="rounded px-1.5 py-0.5 text-xs border hover:bg-muted">Cancel</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingName(client)}
                          className="text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {formatClientName(client.name) || client.name || '—'}
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Month presence cells */}
                  {sortedMonths.map(m => (
                    <td key={m} className="px-3 py-2 text-center">
                      {client.monthsPresent.has(m) ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">Y</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="sticky left-0 z-10 bg-muted/60 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">
                Total clients
              </td>
              {sortedMonths.map(m => (
                <td key={m} className="px-3 py-2 text-center text-sm font-bold text-foreground">
                  {countPerMonth[m]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}