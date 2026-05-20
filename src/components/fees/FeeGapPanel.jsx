import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, TrendingDown } from 'lucide-react';
import { fmtNum, formatMonth } from '@/lib/valuation-utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function effectiveRate(rows) {
  const totalAum = rows.reduce((s, r) => s + (r.fee_base_zar ?? 0), 0);
  const totalFee = rows.reduce((s, r) => s + (r.total_monthly_fee_zar ?? 0), 0);
  if (!totalAum) return null;
  return (totalFee / totalAum) * 12 * 100; // annualised %
}

function sourceLabel(source) {
  switch (source) {
    case 'seeded':   return { text: 'Seeded',   cls: 'bg-green-100 text-green-800' };
    case 'override': return { text: 'Override',  cls: 'bg-blue-100 text-blue-800' };
    case 'mapping':  return { text: 'Mapped',    cls: 'bg-sky-100 text-sky-800' };
    case 'stored':   return { text: 'Stored',    cls: 'bg-slate-100 text-slate-700' };
    default:         return { text: 'Missing',   cls: 'bg-red-100 text-red-700' };
  }
}

export default function FeeGapPanel({ monthRows, allMonthRows, currentMonth, months }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState(null);

  const gapRows = useMemo(() => monthRows.filter(r => r.fee_required), [monthRows]);

  // Per-provider gap breakdown
  const byProvider = useMemo(() => {
    const map = {};
    gapRows.forEach(r => {
      const p = r.platform || 'Unknown';
      if (!map[p]) map[p] = { provider: p, rows: [], aum: 0 };
      map[p].rows.push(r);
      map[p].aum += r.fee_base_zar ?? 0;
    });
    return Object.values(map).sort((a, b) => b.aum - a.aum);
  }, [gapRows]);

  // Month-over-month effective rate comparison
  const rateByMonth = useMemo(() => {
    return months.slice(0, 4).map(month => {
      const rows = allMonthRows.filter(r => r.upload_month === month);
      return { month, rate: effectiveRate(rows), aum: rows.reduce((s, r) => s + (r.fee_base_zar ?? 0), 0) };
    });
  }, [allMonthRows, months]);

  const currentRate = effectiveRate(monthRows);
  const prevRate = rateByMonth.find(r => r.month !== currentMonth)?.rate ?? null;
  const rateDrop = currentRate !== null && prevRate !== null && currentRate < prevRate - 0.01;

  if (gapRows.length === 0 && !rateDrop) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-900">
              {gapRows.length > 0
                ? `${gapRows.length} holding${gapRows.length !== 1 ? 's' : ''} with no fee rate — ${formatMonth(currentMonth)}`
                : `Effective fee rate dropped for ${formatMonth(currentMonth)}`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {gapRows.length > 0 && (
                <>These holdings contribute AUM but zero fees, lowering the effective rate.&nbsp;</>
              )}
              {rateDrop && currentRate !== null && prevRate !== null && (
                <span className="inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Effective rate: <strong>{currentRate.toFixed(3)}%</strong> vs prev <strong>{prevRate.toFixed(3)}%</strong>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rateByMonth.length > 1 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-amber-700">
              {rateByMonth.map(r => (
                <span key={r.month} className={`px-2 py-0.5 rounded ${r.month === currentMonth ? 'bg-amber-200 font-semibold' : 'bg-amber-100'}`}>
                  {formatMonth(r.month)}: {r.rate !== null ? `${r.rate.toFixed(3)}%` : '—'}
                </span>
              ))}
            </div>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-amber-600" /> : <ChevronRight className="h-4 w-4 text-amber-600" />}
        </div>
      </button>

      {open && gapRows.length > 0 && (
        <div className="border-t border-amber-200 bg-white">
          {/* Provider breakdown */}
          {byProvider.map(({ provider, rows, aum }) => {
            const isExpanded = expandedProvider === provider;
            return (
              <div key={provider} className="border-b last:border-b-0">
                <button
                  onClick={() => setExpandedProvider(isExpanded ? null : provider)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-sm font-medium">{provider}</span>
                    <span className="text-xs text-muted-foreground">
                      {rows.length} holding{rows.length !== 1 ? 's' : ''} · AUM R {fmtNum(aum)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-red-600">0% fee applied</span>
                </button>

                {isExpanded && (
                  <div className="bg-muted/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-y bg-muted/30">
                          <th className="px-4 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                          <th className="px-4 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">Fund / Instrument</th>
                          <th className="px-4 py-1.5 text-right font-semibold text-muted-foreground uppercase tracking-wider">AUM (ZAR)</th>
                          <th className="px-4 py-1.5 text-center font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                          <th className="px-4 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">Why unmatched</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((r, i) => {
                          const { text, cls } = sourceLabel(r.fee_source);
                          const reason = r.fee_source === 'missing'
                            ? 'No matching entry in fee seed data — fund name may differ from master list'
                            : r.fee_source === 'mapping'
                            ? 'Matched via fuzzy name — advisory rate not confirmed'
                            : 'Advisory rate not explicitly set';
                          return (
                            <tr key={`${r.account_code}-${r.investment_name}-${i}`} className="hover:bg-muted/20">
                              <td className="px-4 py-2">
                                <p className="font-medium text-foreground leading-tight">{r.portfolio_name || r.account_code || '—'}</p>
                                <p className="text-muted-foreground font-mono">{r.account_code}</p>
                              </td>
                              <td className="px-4 py-2 font-medium text-foreground max-w-[220px]">
                                <p className="truncate" title={r.investment_name}>{r.investment_name}</p>
                              </td>
                              <td className="px-4 py-2 text-right font-mono">R {fmtNum(r.fee_base_zar ?? 0)}</td>
                              <td className="px-4 py-2 text-center">
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{text}</span>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground max-w-[260px]">
                                <p className="truncate" title={reason}>{reason}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/5">
                      <p className="text-xs text-muted-foreground flex-1">
                        To fix: link the fund name on the <strong>Funds</strong> page, or set the rate manually below.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => navigate('/funds')}
                      >
                        <ExternalLink className="h-3 w-3" /> Funds page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => navigate('/bulk-fees')}
                      >
                        <ExternalLink className="h-3 w-3" /> Bulk Fees
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
