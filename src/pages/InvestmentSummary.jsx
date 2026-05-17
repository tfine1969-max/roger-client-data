import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSortedMonths, fmtNum, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { normalizeClientText } from '@/lib/client-utils';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/69fec6783aa61326b91c656b/2b79ae42c_logo.png';
const ALL_MONTHS = '__all_months__';

const REPORT_GROUPS = [
  {
    id: 'marc-anthony-hoar',
    name: 'Marc Anthony Hoar',
    type: 'Client',
    description: 'Individual client portfolio report generated from monthly valuation data.',
    entities: [
      {
        id: 'marc-anthony-hoar',
        name: 'Marc Anthony Hoar',
        aliases: ['hoar marc anthony', 'marc anthony hoar', 'hoar marc', 'marc hoar'],
      },
    ],
  },
  {
    id: 'worrall-family-investments',
    name: 'Worrall Family Investments',
    type: 'Client Group',
    description: 'Family investment report across Marula, Sweet Grass, Isla Worrall, and Charlie Worrall.',
    entities: [
      { id: 'marula-trading', name: 'Marula Trading & Investments', aliases: ['marula trading'] },
      { id: 'sweet-grass-trading', name: 'Sweet Grass Trading', aliases: ['sweet grass trading 12 pty ltd', 'sweet grass trading pty ltd'] },
      { id: 'sweet-grass-sub-account', name: 'Sweet Grass Trading SUB Account', aliases: ['sweet grass trading 12 acc 2', 'sweet grass trading pty ltd acc 2', 'sweet grass trading sub account'] },
      { id: 'isla-worrall', name: 'Isla Worrall', aliases: ['worrall isla', 'isla worrall', 'worrall isla elizabeth'] },
      { id: 'charlie-worrall', name: 'Charlie Worrall', aliases: ['worrall charlie', 'charlie worrall', 'worrall charlie christopher'] },
    ],
  },
];

const compact = value => normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
const isUsd = value => String(value || '').toUpperCase() === 'USD';
const currencyPrefix = currency => isUsd(currency) ? '$' : 'R';
const currencyValue = (value, currency) => `${currencyPrefix(currency)} ${fmtNum(value)}`;
const escapeXml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function rowMatchesEntity(row, entity) {
  const haystack = compact(`${row.portfolio_name || ''} ${row.account_code || ''}`);
  return entity.aliases.some(alias => haystack.includes(compact(alias)));
}

function rowsForEntity(rows, entity) {
  return rows.filter(row => rowMatchesEntity(row, entity));
}

function investmentKey(row) {
  return [row.platform || 'Unknown', row.investment_name || 'Unknown', row.currency || 'ZAR'].join('||');
}

function canonicalFundName(name) {
  const normalized = normalizeClientText(name);
  if (!normalized) return 'Unknown';
  if (normalized.includes('wealthworks prime managed') || normalized.includes('wealthworks managed fund of funds')) return 'Wealthworks Prime Managed Fund of Funds';
  if (normalized.includes('wealthworks prime cautious')) return 'Wealthworks Prime Cautious Fund of Funds';
  if (normalized.includes('wealthworks global flexible') || normalized.includes('pim capital pcc wealthworks global flexible')) return 'Wealthworks Global Flexible Fund';
  if (normalized.includes('diversified trading') || normalized.includes('pim capital specialist pcc diversified trading')) return 'Diversified Trading Fund B1';
  return name || 'Unknown';
}

function canonicalInvestmentKey(row, mergeFunds, manualFundMerges) {
  const rawKey = investmentKey(row);
  const name = manualFundMerges[rawKey] || (mergeFunds ? canonicalFundName(row.investment_name) : row.investment_name);
  return [row.platform || 'Unknown', name || 'Unknown', row.currency || 'ZAR'].join('||');
}

function summariseInvestments(rows, months, mergeFunds, manualFundMerges) {
  const map = new Map();
  rows.forEach(row => {
    const rawKey = investmentKey(row);
    const key = (manualFundMerges[rawKey] || mergeFunds) ? canonicalInvestmentKey(row, mergeFunds, manualFundMerges) : rawKey;
    if (!map.has(key)) {
      map.set(key, {
        key,
        platform: row.platform || 'Unknown',
        name: manualFundMerges[rawKey] || (mergeFunds ? canonicalFundName(row.investment_name) : row.investment_name || 'Unknown'),
        currency: row.currency || 'ZAR',
        byMonthOriginal: {},
        byMonthZar: {},
        sourceNames: new Set(),
        rawKeys: new Set(),
      });
    }
    const item = map.get(key);
    item.byMonthOriginal[row.upload_month] = (item.byMonthOriginal[row.upload_month] || 0) + origVal(row);
    item.byMonthZar[row.upload_month] = (item.byMonthZar[row.upload_month] || 0) + zarVal(row);
    if (row.investment_name) item.sourceNames.add(row.investment_name);
    item.rawKeys.add(rawKey);
  });

  return [...map.values()]
    .map(item => ({
      ...item,
      sourceNames: [...item.sourceNames],
      rawKeys: [...item.rawKeys],
      latestValue: months.reduce((value, month) => value || item.byMonthZar[month] || 0, 0),
    }))
    .sort((a, b) => b.latestValue - a.latestValue);
}

function entitySummary(entity, rows, months, mergeFunds, manualFundMerges) {
  const entityRows = rowsForEntity(rows, entity);
  const investments = summariseInvestments(entityRows, months, mergeFunds, manualFundMerges);
  const byMonth = Object.fromEntries(months.map(month => [
    month,
    entityRows.filter(row => row.upload_month === month).reduce((sum, row) => sum + zarVal(row), 0),
  ]));
  const latestMonth = months.find(month => byMonth[month] > 0) || months[0] || '';
  return {
    ...entity,
    rows: entityRows,
    investments,
    byMonth,
    latestValue: latestMonth ? byMonth[latestMonth] || 0 : 0,
    platforms: [...new Set(entityRows.map(row => row.platform).filter(Boolean))].sort(),
  };
}

function groupSummary(group, rows, months, mergeFunds, manualFundMerges) {
  const entities = group.entities.map(entity => entitySummary(entity, rows, months, mergeFunds, manualFundMerges));
  const byMonth = Object.fromEntries(months.map(month => [
    month,
    entities.reduce((sum, entity) => sum + (entity.byMonth[month] || 0), 0),
  ]));
  const latestMonth = months.find(month => byMonth[month] > 0) || months[0] || '';
  return {
    ...group,
    entities,
    byMonth,
    latestValue: latestMonth ? byMonth[latestMonth] || 0 : 0,
    holdings: entities.reduce((sum, entity) => sum + entity.investments.length, 0),
    platforms: [...new Set(entities.flatMap(entity => entity.platforms))].sort(),
  };
}

function xmlCell(value, type = 'String', style = '') {
  const styleAttr = style ? ` ss:StyleID="${style}"` : '';
  if (value === null || value === undefined || value === '') return `<Cell${styleAttr}/>`;
  if (type === 'Number') return `<Cell${styleAttr}><Data ss:Type="Number">${Number(value) || 0}</Data></Cell>`;
  return `<Cell${styleAttr}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function xmlRow(cells, height) {
  const heightAttr = height ? ` ss:Height="${height}"` : '';
  return `<Row${heightAttr}>${cells.join('')}</Row>`;
}

function worksheetXml(name, rows) {
  return `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>${rows.join('')}</Table></Worksheet>`;
}

function exportReport(group, summary, months) {
  const exportMonths = [...months].reverse();
  const styles = `
    <Styles>
      <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="18" ss:Color="#26547C"/></Style>
      <Style ss:ID="Subtle"><Font ss:Color="#64748B"/></Style>
      <Style ss:ID="Header"><Interior ss:Color="#26547C" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#FFFFFF"/></Style>
      <Style ss:ID="Section"><Interior ss:Color="#E8EEF5" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#26547C"/></Style>
      <Style ss:ID="Money"><NumberFormat ss:Format="R #,##0.00"/></Style>
      <Style ss:ID="UsdMoney"><NumberFormat ss:Format="$ #,##0.00"/></Style>
      <Style ss:ID="Total"><Interior ss:Color="#F3F6F9" ss:Pattern="Solid"/><Font ss:Bold="1"/><NumberFormat ss:Format="R #,##0.00"/></Style>
    </Styles>`;

  const totalRows = [
    xmlRow([xmlCell('wealthworks', 'String', 'Title')], 28),
    xmlRow([xmlCell(group.name, 'String', 'Title')]),
    xmlRow([xmlCell(`Generated ${new Date().toLocaleDateString('en-ZA')} from imported monthly valuation data.`, 'String', 'Subtle')]),
    xmlRow([]),
    xmlRow([xmlCell('Entity', 'String', 'Header'), ...exportMonths.map(month => xmlCell(formatMonth(month), 'String', 'Header'))]),
    ...summary.entities.map(entity => xmlRow([
      xmlCell(entity.name),
      ...exportMonths.map(month => xmlCell(entity.byMonth[month] || 0, 'Number', 'Money')),
    ])),
    xmlRow([
      xmlCell('TOTAL', 'String', 'Section'),
      ...exportMonths.map(month => xmlCell(summary.byMonth[month] || 0, 'Number', 'Total')),
    ]),
  ];

  const worksheets = [worksheetXml('Total Portfolio', totalRows)];

  summary.entities.forEach(entity => {
    const localRows = entity.investments.filter(item => String(item.currency).toUpperCase() === 'ZAR');
    const offshoreRows = entity.investments.filter(item => String(item.currency).toUpperCase() !== 'ZAR');
    const rows = [
      xmlRow([xmlCell('wealthworks', 'String', 'Title')], 28),
      xmlRow([xmlCell(entity.name, 'String', 'Title')]),
      xmlRow([xmlCell(group.name, 'String', 'Subtle')]),
      xmlRow([]),
    ];

    [
      ['LOCAL PORTFOLIO (ZAR)', localRows, 'ZAR'],
      ['OFFSHORE PORTFOLIO (USD)', offshoreRows, 'USD'],
    ].forEach(([label, items, displayCurrency]) => {
      rows.push(xmlRow([xmlCell(label, 'String', 'Section')]));
      rows.push(xmlRow([
        xmlCell('Fund / Investment Name', 'String', 'Header'),
        xmlCell('Platform', 'String', 'Header'),
        xmlCell('Currency', 'String', 'Header'),
        ...exportMonths.map(month => xmlCell(formatMonth(month), 'String', 'Header')),
      ]));
      if (items.length === 0) {
        rows.push(xmlRow([xmlCell('No holdings')]));
      } else {
        items.forEach(item => rows.push(xmlRow([
          xmlCell(item.name),
          xmlCell(item.platform),
          xmlCell(item.currency),
          ...exportMonths.map(month => xmlCell(
            displayCurrency === 'USD' ? item.byMonthOriginal[month] || 0 : item.byMonthZar[month] || 0,
            'Number',
            displayCurrency === 'USD' ? 'UsdMoney' : 'Money'
          )),
        ])));
      }
      rows.push(xmlRow([
        xmlCell('TOTAL', 'String', 'Section'),
        xmlCell(''),
        xmlCell(''),
        ...exportMonths.map(month => xmlCell(
          items.reduce((sum, item) => sum + (displayCurrency === 'USD' ? item.byMonthOriginal[month] || 0 : item.byMonthZar[month] || 0), 0),
          'Number',
          displayCurrency === 'USD' ? 'UsdMoney' : 'Total'
        )),
      ]));
      rows.push(xmlRow([]));
    });

    worksheets.push(worksheetXml(entity.name, rows));
  });

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${styles}
${worksheets.join('')}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${group.name.replace(/[^a-z0-9]+/gi, '_')}_Monthly_Report.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InvestmentSummary() {
  const [selectedGroupId, setSelectedGroupId] = useState('marc-anthony-hoar');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);
  const [mergeFunds, setMergeFunds] = useState(false);
  const [manualFundMerges, setManualFundMerges] = useState({});
  const [selectedFundKeys, setSelectedFundKeys] = useState(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeFundName, setMergeFundName] = useState('');

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const selectedGroup = REPORT_GROUPS.find(group => group.id === selectedGroupId) || REPORT_GROUPS[0];
  const summary = useMemo(
    () => groupSummary(selectedGroup, valuations, months, mergeFunds, manualFundMerges),
    [selectedGroup, valuations, months, mergeFunds, manualFundMerges]
  );
  const displayMonths = selectedMonth === ALL_MONTHS ? [...months].reverse() : months.filter(month => month === selectedMonth);
  const selectedFundCount = selectedFundKeys.size;
  const selectedFundItems = useMemo(() => {
    const items = [];
    const seen = new Set();
    summary.entities.forEach(entity => {
      entity.investments.forEach(item => {
        if (!item.rawKeys.some(key => selectedFundKeys.has(key)) || seen.has(item.key)) return;
        seen.add(item.key);
        items.push(item);
      });
    });
    return items;
  }, [summary, selectedFundKeys]);
  const selectedFundNames = useMemo(() => {
    const names = [];
    const seen = new Set();
    selectedFundItems.forEach(item => {
      const sourceNames = item.sourceNames?.length ? item.sourceNames : [item.name];
      sourceNames.forEach(name => {
        const cleanName = name?.trim();
        if (!cleanName || seen.has(cleanName)) return;
        seen.add(cleanName);
        names.push(cleanName);
      });
    });
    return names;
  }, [selectedFundItems]);

  const toggleFundSelection = (item) => {
    setSelectedFundKeys(prev => {
      const next = new Set(prev);
      item.rawKeys.forEach(key => {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const itemSelected = (item) => item.rawKeys.length > 0 && item.rawKeys.every(key => selectedFundKeys.has(key));

  const openFundMerge = () => {
    if (selectedFundKeys.size < 2) return;
    setMergeFundName(selectedFundNames[0] || selectedFundItems[0]?.name || '');
    setMergeDialogOpen(true);
  };

  const applyFundMerge = () => {
    const name = mergeFundName.trim();
    if (!name || selectedFundKeys.size < 2) return;
    setManualFundMerges(prev => {
      const next = { ...prev };
      selectedFundKeys.forEach(key => { next[key] = name; });
      return next;
    });
    setSelectedFundKeys(new Set());
    setMergeDialogOpen(false);
    setMergeFundName('');
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate monthly portfolio reports for approved client profiles.</p>
        </div>
        {summary && (
          <Button type="button" className="h-9 gap-2" onClick={() => exportReport(selectedGroup, summary, months)}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border bg-white p-3">
          <div className="mb-3 flex items-center gap-3 border-b pb-3">
            <img src={LOGO_URL} alt="Wealthworks" className="h-8 w-auto" />
            <div>
              <p className="text-sm font-semibold">Client Reports</p>
              <p className="text-xs text-muted-foreground">Select a report profile</p>
            </div>
          </div>
          <div className="space-y-2">
            {REPORT_GROUPS.map(group => {
              const itemSummary = groupSummary(group, valuations, months, mergeFunds, manualFundMerges);
              const selected = group.id === selectedGroup.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    'w-full rounded-lg border p-2.5 text-left transition-all',
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{group.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{group.type}</p>
                    </div>
                    <Users className={cn('h-4 w-4', selected ? 'text-primary' : 'text-slate-400')} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entities</p>
                      <p className="font-semibold">{group.entities.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Latest AUM</p>
                      <p className="font-numbers font-semibold">R {fmtNum(itemSummary.latestValue)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-3">
          {isLoading && <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground">Loading report data...</div>}
          {!isLoading && summary && (
            <>
              <div className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <img src={LOGO_URL} alt="Wealthworks" className="h-9 w-auto" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Monthly Portfolio Report</p>
                        <h2 className="mt-0.5 text-xl font-semibold">{summary.name}</h2>
                      </div>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{summary.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => setMergeFunds(value => !value)}
                    >
                      {mergeFunds ? 'Auto merge on' : 'Auto merge off'}
                    </Button>
                    <Button
                      type="button"
                      className="h-8 px-3 text-xs"
                      onClick={openFundMerge}
                      disabled={selectedFundCount < 2}
                    >
                      Merge selected funds{selectedFundCount ? ` (${selectedFundCount})` : ''}
                    </Button>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-8 w-40 bg-white text-xs">
                        <SelectValue placeholder="All months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_MONTHS}>All months</SelectItem>
                        {months.map(month => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest AUM</p>
                    <p className="mt-1 font-numbers text-lg font-semibold">R {fmtNum(summary.latestValue)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entities</p>
                    <p className="mt-1 font-numbers text-lg font-semibold">{summary.entities.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Holdings</p>
                    <p className="mt-1 font-numbers text-lg font-semibold">{summary.holdings}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Platforms</p>
                    <p className="mt-1 truncate text-xs font-semibold">{summary.platforms.join(', ') || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Total Portfolio</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="sticky left-0 z-10 min-w-56 bg-muted px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
                        {displayMonths.map(month => <th key={month} className="min-w-32 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{formatMonth(month)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.entities.map(entity => (
                        <tr key={entity.id} className="hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold">{entity.name}</td>
                          {displayMonths.map(month => <td key={month} className="px-3 py-2 text-right font-numbers">R {fmtNum(entity.byMonth[month] || 0)}</td>)}
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2">TOTAL</td>
                        {displayMonths.map(month => <td key={month} className="px-3 py-2 text-right font-numbers">R {fmtNum(summary.byMonth[month] || 0)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {summary.entities.map(entity => (
                <div key={entity.id} className="overflow-hidden rounded-lg border bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{entity.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entity.investments.length} holdings · {entity.platforms.join(', ') || '-'}</p>
                    </div>
                    {months[0] && <MonthBadge month={months[0]} />}
                  </div>
                  {[
                    { title: 'LOCAL PORTFOLIO (ZAR)', rows: entity.investments.filter(item => !isUsd(item.currency)), currency: 'ZAR' },
                    { title: 'OFFSHORE PORTFOLIO (USD)', rows: entity.investments.filter(item => isUsd(item.currency)), currency: 'USD' },
                  ].map(section => (
                    <div key={section.title} className="border-t first:border-t-0">
                      <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {section.title}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="sticky left-0 z-20 w-10 bg-muted px-3 py-2"></th>
                              <th className="sticky left-10 z-10 min-w-64 bg-muted px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fund / Investment Name</th>
                              <th className="min-w-24 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</th>
                              <th className="min-w-20 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Currency</th>
                              {displayMonths.map(month => <th key={month} className="min-w-32 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{formatMonth(month)}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {section.rows.length === 0 && (
                              <tr>
                                <td colSpan={displayMonths.length + 4} className="px-3 py-3 text-center text-xs text-muted-foreground">No holdings</td>
                              </tr>
                            )}
                            {section.rows.map(item => (
                              <tr key={item.key} className="hover:bg-muted/20">
                                <td className="sticky left-0 z-20 bg-white px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={itemSelected(item)}
                                    onChange={() => toggleFundSelection(item)}
                                    className="h-4 w-4 cursor-pointer accent-primary"
                                    aria-label={`Select ${item.name} for merge`}
                                  />
                                </td>
                                <td className="sticky left-10 z-10 bg-white px-3 py-2 font-medium">
                                  {item.name}
                                  {mergeFunds && item.sourceNames.length > 1 && (
                                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                      {item.sourceNames.length} names merged
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{item.platform}</td>
                                <td className="px-3 py-2 text-muted-foreground">{item.currency}</td>
                                {displayMonths.map(month => {
                                  const value = section.currency === 'USD' ? item.byMonthOriginal[month] || 0 : item.byMonthZar[month] || 0;
                                  return <td key={month} className="px-3 py-2 text-right font-numbers">{currencyValue(value, section.currency)}</td>;
                                })}
                              </tr>
                            ))}
                            {section.rows.length > 0 && (
                              <tr className="bg-slate-50 font-semibold">
                                <td className="sticky left-0 z-20 bg-slate-50 px-3 py-2"></td>
                                <td className="sticky left-10 z-10 bg-slate-50 px-3 py-2">TOTAL</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-muted-foreground">{section.currency}</td>
                                {displayMonths.map(month => {
                                  const total = section.rows.reduce((sum, item) => sum + (section.currency === 'USD' ? item.byMonthOriginal[month] || 0 : item.byMonthZar[month] || 0), 0);
                                  return <td key={month} className="px-3 py-2 text-right font-numbers">{currencyValue(total, section.currency)}</td>;
                                })}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      {selectedFundCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedFundCount} selected fund source row{selectedFundCount === 1 ? '' : 's'}</p>
              <p className="text-xs text-muted-foreground">Select at least two fund rows, then choose the correct reporting name.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4"
                onClick={() => setSelectedFundKeys(new Set())}
              >
                Clear selection
              </Button>
              <Button
                type="button"
                className="h-9 px-5"
                onClick={openFundMerge}
                disabled={selectedFundCount < 2}
              >
                Merge selected funds
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge Selected Funds</DialogTitle>
            <DialogDescription>
              Choose the correct existing fund name or edit the reporting name below. This only changes how this report groups the funds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected fund names</p>
              <div className="max-h-56 overflow-y-auto rounded-lg border bg-slate-50 p-2">
                {selectedFundNames.map(name => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-white"
                  >
                    <input
                      type="radio"
                      name="correctFundName"
                      checked={mergeFundName === name}
                      onChange={() => setMergeFundName(name)}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                    />
                    <span className="leading-5">{name}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="text-sm font-medium">Correct fund name</label>
            <Input
              value={mergeFundName}
              onChange={event => setMergeFundName(event.target.value)}
              placeholder="e.g. Wealthworks Global Flexible Fund"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{selectedFundCount} selected source fund row{selectedFundCount === 1 ? '' : 's'} will be grouped under this name.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={applyFundMerge} disabled={!mergeFundName.trim() || selectedFundCount < 2}>
              Confirm merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
