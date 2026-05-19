import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { applyRulesToRows } from '@/lib/fund-utils';
import { zarVal } from '@/lib/valuation-utils';
import {
  LOCAL_FUNDS, OFFSHORE_FUNDS,
  LOCAL_HISTORY, OFFSHORE_HISTORY,
  STATIC_MONTHS, MARC_HOAR_ACCOUNT_CODES, MARC_HOAR_PORTFOLIO_NAMES,
} from '@/data/marcHoarReport';

const LAST_STATIC_MONTH = '2026-04';

function fmtZar(val) {
  if (val == null || val === 0) return '—';
  return 'R' + Math.round(val).toLocaleString('en-ZA');
}

function fmtUsd(val) {
  if (val == null || val === 0) return '—';
  return '$' + Math.round(val).toLocaleString('en-ZA');
}

function formatMonthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
}

function isHoarRow(row) {
  return (
    MARC_HOAR_ACCOUNT_CODES.includes(row.account_code) ||
    MARC_HOAR_PORTFOLIO_NAMES.some(n => String(row.portfolio_name || '').toLowerCase() === n.toLowerCase())
  );
}

// Look up a live value for one LOCAL_FUNDS entry from portfolio valuations
function lookupLocalValue(fund, rows) {
  const { lookup } = fund;
  if (!lookup) return 0;

  const candidates = rows.filter(r => {
    if (lookup.accountCode && r.account_code !== lookup.accountCode) return false;
    if (lookup.platform && String(r.platform || '').toLowerCase() !== lookup.platform.toLowerCase()) return false;
    if (lookup.namePattern && !lookup.namePattern.test(r.investment_name || '')) return false;
    return true;
  });

  return candidates.reduce((s, r) => s + zarVal(r), 0);
}

export default function MarcHoarReport() {
  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const { data: fundMergeRules = [] } = useQuery({
    queryKey: ['fundMergeRules'],
    queryFn: () => base44.entities.FundMergeRule.list('source_name', 5000),
    staleTime: 5 * 60 * 1000,
  });

  // All months available, sorted oldest → newest
  const allMonths = useMemo(() => {
    const staticMs = Object.keys(LOCAL_HISTORY);
    const liveRows = applyRulesToRows(valuations, fundMergeRules).filter(isHoarRow);
    const liveMs = [...new Set(liveRows.map(r => r.upload_month))].filter(
      m => m && !STATIC_MONTHS.has(m) && m > LAST_STATIC_MONTH
    );
    return [...staticMs, ...liveMs].sort();
  }, [valuations, fundMergeRules]);

  const mappedValuations = useMemo(
    () => applyRulesToRows(valuations, fundMergeRules).filter(isHoarRow),
    [valuations, fundMergeRules]
  );

  // Local data matrix: fund.key → month → value
  const localMatrix = useMemo(() => {
    const matrix = {};
    LOCAL_FUNDS.forEach(fund => {
      matrix[fund.key] = {};
      allMonths.forEach(month => {
        if (STATIC_MONTHS.has(month)) {
          matrix[fund.key][month] = LOCAL_HISTORY[month]?.[fund.key] ?? null;
        } else {
          const monthRows = mappedValuations.filter(r => r.upload_month === month);
          const val = lookupLocalValue(fund, monthRows);
          matrix[fund.key][month] = val || null;
        }
      });
    });
    return matrix;
  }, [allMonths, mappedValuations]);

  // Offshore data matrix (USD for static, ZAR for live)
  const offshoreMatrix = useMemo(() => {
    const matrix = {};
    OFFSHORE_FUNDS.forEach(fund => {
      matrix[fund.key] = {};
      allMonths.forEach(month => {
        if (STATIC_MONTHS.has(month)) {
          matrix[fund.key][month] = OFFSHORE_HISTORY[month]?.[fund.key] ?? null;
        } else {
          // Live: sum Julius Baer rows matching fund name (ZAR)
          const monthRows = mappedValuations.filter(r => r.upload_month === month);
          const jbRows = monthRows.filter(r =>
            String(r.platform || '').toLowerCase().includes('julius') ||
            String(r.platform || '').toLowerCase().includes('jb')
          );
          // Rough name match
          const label = fund.label.toLowerCase();
          const match = jbRows.find(r => {
            const inv = String(r.investment_name || '').toLowerCase();
            // Match by first distinctive word
            const words = label.split(' ').filter(w => w.length > 3);
            return words.some(w => inv.includes(w));
          });
          matrix[fund.key][month] = match ? zarVal(match) : null;
        }
      });
    });
    return matrix;
  }, [allMonths, mappedValuations]);

  // Column totals
  const localTotals = useMemo(() => {
    const totals = {};
    allMonths.forEach(month => {
      totals[month] = LOCAL_FUNDS.reduce((s, f) => s + (localMatrix[f.key]?.[month] ?? 0), 0);
    });
    return totals;
  }, [allMonths, localMatrix]);

  const offshoreTotals = useMemo(() => {
    const totals = {};
    allMonths.forEach(month => {
      const isStatic = STATIC_MONTHS.has(month);
      totals[month] = OFFSHORE_FUNDS.reduce((s, f) => s + (offshoreMatrix[f.key]?.[month] ?? 0), 0);
      totals[`${month}_currency`] = isStatic ? 'USD' : 'ZAR';
    });
    return totals;
  }, [allMonths, offshoreMatrix]);

  const thClass = 'px-3 py-2.5 text-right text-xs font-semibold text-white whitespace-nowrap';
  const thFirstClass = 'px-3 py-2.5 text-left text-xs font-semibold text-white';
  const tdClass = 'px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap';
  const tdFirstClass = 'px-3 py-2 text-left text-xs font-medium';
  const totalRowClass = 'bg-[#26547C]/10 font-semibold';

  const headerBg = 'bg-[#26547C]';

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Marc Hoar — Monthly Investment Summary</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All values as at month-end. Local portfolio in ZAR · Offshore portfolio in USD (historical) or ZAR (live).
            </p>
          </div>
        </div>
      </div>

      {/* LOCAL PORTFOLIO */}
      <section>
        <div className={`${headerBg} rounded-t-lg px-4 py-2`}>
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">Local Portfolio</h2>
        </div>
        <div className="overflow-x-auto rounded-b-lg border border-t-0">
          <table className="w-full border-collapse text-sm bg-white">
            <thead>
              <tr className={headerBg}>
                <th className={`${thFirstClass} min-w-[220px]`}>Fund / Investment Name</th>
                {allMonths.map(m => (
                  <th key={m} className={thClass}>{formatMonthLabel(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LOCAL_FUNDS.map((fund, i) => (
                <tr key={fund.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className={tdFirstClass}>{fund.label}</td>
                  {allMonths.map(m => {
                    const val = localMatrix[fund.key]?.[m];
                    return (
                      <td key={m} className={`${tdClass} ${val ? '' : 'text-muted-foreground'}`}>
                        {fmtZar(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className={totalRowClass}>
                <td className={`${tdFirstClass} font-bold`}>Total</td>
                {allMonths.map(m => (
                  <td key={m} className={`${tdClass} font-bold`}>
                    {fmtZar(localTotals[m])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* OFFSHORE PORTFOLIO */}
      <section>
        <div className={`${headerBg} rounded-t-lg px-4 py-2`}>
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">Offshore Portfolio</h2>
        </div>
        <div className="overflow-x-auto rounded-b-lg border border-t-0">
          <table className="w-full border-collapse text-sm bg-white">
            <thead>
              <tr className={headerBg}>
                <th className={`${thFirstClass} min-w-[220px]`}>Fund / Investment Name</th>
                {allMonths.map(m => (
                  <th key={m} className={thClass}>
                    {formatMonthLabel(m)}
                    <span className="block text-[10px] font-normal opacity-75">
                      {offshoreTotals[`${m}_currency`] === 'USD' ? '(USD)' : '(ZAR)'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {OFFSHORE_FUNDS.map((fund, i) => (
                <tr key={fund.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className={tdFirstClass}>{fund.label}</td>
                  {allMonths.map(m => {
                    const val = offshoreMatrix[fund.key]?.[m];
                    const isStatic = STATIC_MONTHS.has(m);
                    return (
                      <td key={m} className={`${tdClass} ${val ? '' : 'text-muted-foreground'}`}>
                        {val != null ? (isStatic ? fmtUsd(val) : fmtZar(val)) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className={totalRowClass}>
                <td className={`${tdFirstClass} font-bold`}>Total</td>
                {allMonths.map(m => {
                  const isStatic = STATIC_MONTHS.has(m);
                  return (
                    <td key={m} className={`${tdClass} font-bold`}>
                      {isStatic ? fmtUsd(offshoreTotals[m]) : fmtZar(offshoreTotals[m])}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Historical months (Dec 2025 – Apr 2026) show USD from the WealthWorks Investment Summary report.
          Subsequent months show ZAR equivalent from uploaded data.
        </p>
      </section>
    </div>
  );
}
