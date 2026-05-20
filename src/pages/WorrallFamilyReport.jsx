import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { applyRulesToRows } from '@/lib/fund-utils';
import { zarVal } from '@/lib/valuation-utils';
import {
  FX_RATES,
  MARULA_FUNDS, MARULA_HISTORY,
  SWEET_GRASS_FUNDS, SWEET_GRASS_HISTORY,
  SWEET_GRASS_SUB_FUNDS, SWEET_GRASS_SUB_HISTORY,
  ISLA_FUNDS, ISLA_HISTORY,
  CHARLIE_FUNDS, CHARLIE_HISTORY,
  TOTAL_HISTORY, STATIC_MONTHS, ENTITY_LOOKUP,
} from '@/data/worrallReport';

const LAST_STATIC = '2026-04';
const HEADER_BG = 'bg-[#26547C]';

function fmt(v, currency = 'ZAR') {
  if (v == null) return '—';
  const prefix = currency === 'USD' ? '$' : 'R';
  return prefix + Math.round(v).toLocaleString('en-ZA');
}
function fmtUsd(v) { return fmt(v, 'USD'); }
function fmtZar(v) { return fmt(v, 'ZAR'); }

function formatMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
}

// Find live rows for an entity by matching portfolio_name patterns
function entityRows(valuations, entityKey) {
  const { portfolioPatterns, excludePatterns } = ENTITY_LOOKUP[entityKey];
  return valuations.filter(r => {
    const name = String(r.portfolio_name || '');
    const matches = portfolioPatterns.some(p => p.test(name));
    if (!matches) return false;
    if (excludePatterns?.some(p => p.test(name))) return false;
    return true;
  });
}

// Sum rows matching a fund name pattern for a given month/entity
function sumByPattern(rows, pattern) {
  return rows.filter(r => pattern.test(r.investment_name || '')).reduce((s, r) => s + zarVal(r), 0) || null;
}

// Build matrix: fundKey → month → value (using static history + live data)
function buildMatrix(funds, history, liveByMonth, livePattern) {
  const months = [
    ...Object.keys(history),
    ...Object.keys(liveByMonth).filter(m => !STATIC_MONTHS.has(m) && m > LAST_STATIC),
  ].sort();

  const matrix = {};
  funds.forEach(fund => {
    matrix[fund.key] = {};
    months.forEach(month => {
      if (STATIC_MONTHS.has(month)) {
        matrix[fund.key][month] = history[month]?.[fund.key] ?? null;
      } else {
        const rows = liveByMonth[month] || [];
        const pattern = livePattern?.(fund);
        matrix[fund.key][month] = pattern ? sumByPattern(rows, pattern) : null;
      }
    });
  });
  return { matrix, months };
}

function colTotal(matrix, funds, month) {
  return funds.reduce((s, f) => s + (matrix[f.key]?.[month] ?? 0), 0);
}

// ─── Section table ────────────────────────────────────────────────────────────
function EntityTable({ funds, matrix, months, currency = 'ZAR', showTotal = true }) {
  const fmtFn = currency === 'USD' ? fmtUsd : fmtZar;
  const thCls = 'px-3 py-2.5 text-right text-xs font-semibold text-white whitespace-nowrap';
  const thFirstCls = 'px-3 py-2.5 text-left text-xs font-semibold text-white min-w-[240px]';
  const tdCls = 'px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap';
  const tdFirstCls = 'px-3 py-2 text-left text-xs font-medium';

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm bg-white">
        <thead>
          <tr className={HEADER_BG}>
            <th className={thFirstCls}>Fund / Investment Name</th>
            {months.map(m => (
              <th key={m} className={thCls}>{formatMonth(m)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {funds.map((fund, i) => (
            <tr key={fund.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
              <td className={tdFirstCls}>{fund.label}</td>
              {months.map(m => {
                const v = matrix[fund.key]?.[m];
                return (
                  <td key={m} className={`${tdCls} ${v == null ? 'text-muted-foreground' : ''}`}>
                    {fmtFn(v)}
                  </td>
                );
              })}
            </tr>
          ))}
          {showTotal && (
            <tr className="bg-[#26547C]/10 font-semibold">
              <td className={`${tdFirstCls} font-bold`}>Total</td>
              {months.map(m => (
                <td key={m} className={`${tdCls} font-bold`}>{fmtFn(colTotal(matrix, funds, m))}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Total Portfolio tab ──────────────────────────────────────────────────────
function TotalPortfolioTab({ months }) {
  const thCls = 'px-3 py-2.5 text-right text-xs font-semibold text-white whitespace-nowrap';
  const thFirstCls = 'px-3 py-2.5 text-left text-xs font-semibold text-white min-w-[260px]';
  const tdCls = 'px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap';
  const tdFirstCls = 'px-3 py-2 text-left text-xs';
  const boldRow = 'bg-[#26547C]/10';

  const sections = [
    {
      label: 'OFFSHORE PORTFOLIO',
      rows: [
        { label: 'Marula Trading & Investments (USD)', key: 'offshore_usd', fmt: fmtUsd },
        { label: 'Offshore Portfolio in ZAR', key: 'offshore_zar', fmt: fmtZar, bold: true },
      ],
    },
    {
      label: 'LOCAL PORTFOLIO',
      rows: [
        { label: 'Sweet Grass Trading', key: null, computeFn: m => {
          if (STATIC_MONTHS.has(m)) return SWEET_GRASS_HISTORY[m] ? Object.values(SWEET_GRASS_HISTORY[m]).reduce((s, v) => s + (v ?? 0), 0) : null;
          return null;
        }},
        { label: 'Sweet Grass Trading Sub Account', key: null, computeFn: m => {
          if (STATIC_MONTHS.has(m)) return SWEET_GRASS_SUB_HISTORY[m] ? Object.values(SWEET_GRASS_SUB_HISTORY[m]).reduce((s, v) => s + (v ?? 0), 0) : null;
          return null;
        }},
        { label: 'Local Portfolio Total (ZAR)', key: 'local_zar', fmt: fmtZar, bold: true },
        { label: 'Local Portfolio in USD', key: 'local_usd', fmt: fmtUsd },
      ],
    },
    {
      label: 'TOTAL PORTFOLIO',
      rows: [
        { label: 'Total expressed in ZAR', key: 'total_zar', fmt: fmtZar, bold: true, highlight: true },
        { label: 'Total expressed in USD', key: 'total_usd', fmt: fmtUsd, bold: true },
      ],
    },
    {
      label: "LOCAL PORTFOLIO — CHILDREN",
      rows: [
        { label: 'Isla Worrall', key: 'children_isla', fmt: fmtZar },
        { label: 'Charlie Worrall', key: 'children_charlie', fmt: fmtZar },
        { label: 'Total', key: 'children_total', fmt: fmtZar, bold: true },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm bg-white">
        <thead>
          <tr className={HEADER_BG}>
            <th className={thFirstCls}>Portfolio / Entity</th>
            {months.map(m => <th key={m} className={thCls}>{formatMonth(m)}</th>)}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <>
              <tr key={section.label} className="bg-slate-100">
                <td colSpan={months.length + 1} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  {section.label}
                </td>
              </tr>
              {section.rows.map((row, i) => {
                const isHighlight = row.highlight;
                const isBold = row.bold;
                return (
                  <tr key={row.label} className={`${isHighlight ? 'bg-[#26547C]/10' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className={`${tdFirstCls} ${isBold ? 'font-semibold' : ''}`}>{row.label}</td>
                    {months.map(m => {
                      let v;
                      if (row.computeFn) {
                        v = row.computeFn(m);
                      } else if (row.key) {
                        v = STATIC_MONTHS.has(m) ? (TOTAL_HISTORY[m]?.[row.key] ?? null) : null;
                      }
                      const fmtFn = row.fmt || fmtZar;
                      return (
                        <td key={m} className={`${tdCls} ${isBold ? 'font-semibold' : ''} ${v == null ? 'text-muted-foreground' : ''}`}>
                          {fmtFn(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorrallFamilyReport() {
  const [tab, setTab] = useState('total');

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const { data: fundMergeRules = [] } = useQuery({
    queryKey: ['fundMergeRules'],
    queryFn: () => base44.entities.FundMergeRule.list('source_name', 5000),
    staleTime: 5 * 60 * 1000,
  });

  const mapped = useMemo(
    () => applyRulesToRows(valuations, fundMergeRules),
    [valuations, fundMergeRules]
  );

  // Build per-entity live row buckets: entityKey → month → rows[]
  const liveByEntity = useMemo(() => {
    const result = {};
    ['marula', 'sweet_grass', 'sweet_grass_sub', 'isla', 'charlie'].forEach(key => {
      const rows = entityRows(mapped, key);
      const byMonth = {};
      rows.forEach(r => {
        if (r.upload_month && !STATIC_MONTHS.has(r.upload_month) && r.upload_month > LAST_STATIC) {
          if (!byMonth[r.upload_month]) byMonth[r.upload_month] = [];
          byMonth[r.upload_month].push(r);
        }
      });
      result[key] = byMonth;
    });
    return result;
  }, [mapped]);

  // Derive all months (static + live)
  const allMonths = useMemo(() => {
    const live = new Set();
    Object.values(liveByEntity).forEach(byMonth => Object.keys(byMonth).forEach(m => live.add(m)));
    return [...Object.keys(TOTAL_HISTORY), ...live].sort();
  }, [liveByEntity]);

  // Build each entity matrix (static data only — live patterns TBD per-fund)
  const marulaData = useMemo(() => buildMatrix(MARULA_FUNDS, MARULA_HISTORY, liveByEntity.marula || {}, f => new RegExp(f.label.split(' ')[0], 'i')), [liveByEntity]);
  const sgData = useMemo(() => buildMatrix(SWEET_GRASS_FUNDS, SWEET_GRASS_HISTORY, liveByEntity.sweet_grass || {}, f => new RegExp(f.label.split(' ').slice(0, 2).join('.*'), 'i')), [liveByEntity]);
  const sgSubData = useMemo(() => buildMatrix(SWEET_GRASS_SUB_FUNDS, SWEET_GRASS_SUB_HISTORY, liveByEntity.sweet_grass_sub || {}, f => new RegExp(f.label.split(' ').slice(0, 2).join('.*'), 'i')), [liveByEntity]);
  const islaData = useMemo(() => buildMatrix(ISLA_FUNDS, ISLA_HISTORY, liveByEntity.isla || {}, () => /managed/i), [liveByEntity]);
  const charlieData = useMemo(() => buildMatrix(CHARLIE_FUNDS, CHARLIE_HISTORY, liveByEntity.charlie || {}, () => /managed/i), [liveByEntity]);

  const tabs = [
    { id: 'total',          label: 'Total Portfolio' },
    { id: 'marula',         label: 'Marula Trading & Investments' },
    { id: 'sweet_grass',    label: 'Sweet Grass Trading' },
    { id: 'sweet_grass_sub',label: 'Sweet Grass Sub Account' },
    { id: 'isla',           label: 'Isla Worrall' },
    { id: 'charlie',        label: 'Charlie Worrall' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Worrall Family Investments — Monthly Summary</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All values as at month-end. Offshore portfolio in USD · Local portfolio in ZAR.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 border-b pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#26547C] text-white border-[#26547C]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'total' && (
        <section>
          <TotalPortfolioTab months={allMonths} />
          <p className="text-xs text-muted-foreground mt-2 px-1">
            FX Rates (ZAR/USD): {allMonths.filter(m => STATIC_MONTHS.has(m)).map(m => `${formatMonth(m)}: ${FX_RATES[m]}`).join(' · ')}
          </p>
        </section>
      )}

      {tab === 'marula' && (
        <section>
          <div className={`${HEADER_BG} rounded-t-lg px-4 py-2`}>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Marula Trading & Investments — Offshore Portfolio (USD)</h2>
          </div>
          <EntityTable funds={MARULA_FUNDS} matrix={marulaData.matrix} months={marulaData.months} currency="USD" />
        </section>
      )}

      {tab === 'sweet_grass' && (
        <section>
          <div className={`${HEADER_BG} rounded-t-lg px-4 py-2`}>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Sweet Grass Trading — Local Portfolio (ZAR)</h2>
          </div>
          <EntityTable funds={SWEET_GRASS_FUNDS} matrix={sgData.matrix} months={sgData.months} currency="ZAR" />
        </section>
      )}

      {tab === 'sweet_grass_sub' && (
        <section>
          <div className={`${HEADER_BG} rounded-t-lg px-4 py-2`}>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Sweet Grass Trading Sub Account — Local Portfolio (ZAR)</h2>
          </div>
          <EntityTable funds={SWEET_GRASS_SUB_FUNDS} matrix={sgSubData.matrix} months={sgSubData.months} currency="ZAR" />
        </section>
      )}

      {tab === 'isla' && (
        <section>
          <div className={`${HEADER_BG} rounded-t-lg px-4 py-2`}>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Isla Worrall — Local Portfolio (ZAR)</h2>
          </div>
          <EntityTable funds={ISLA_FUNDS} matrix={islaData.matrix} months={islaData.months} currency="ZAR" />
        </section>
      )}

      {tab === 'charlie' && (
        <section>
          <div className={`${HEADER_BG} rounded-t-lg px-4 py-2`}>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Charlie Worrall — Local Portfolio (ZAR)</h2>
          </div>
          <EntityTable funds={CHARLIE_FUNDS} matrix={charlieData.matrix} months={charlieData.months} currency="ZAR" />
        </section>
      )}
    </div>
  );
}
