import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Search, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSortedMonths, fmtNum, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { clientKey, formatClientName, normalizeClientText } from '@/lib/client-utils';
import MonthBadge from '@/components/shared/MonthBadge';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/69fec6783aa61326b91c656b/2b79ae42c_logo.png';

const REPORT_GROUPS = [
  {
    id: 'worrall-family-investments',
    name: 'Worrall Family Investments',
    type: 'Client Group',
    description: 'Family investment report across Marula, Sweet Grass, Isla Worrall, and Charlie Worrall.',
    entities: [
      {
        id: 'marula-trading',
        name: 'Marula Trading & Investments',
        aliases: ['marula trading'],
      },
      {
        id: 'sweet-grass-trading',
        name: 'Sweet Grass Trading',
        aliases: ['sweet grass trading 12 pty ltd', 'sweet grass trading pty ltd'],
      },
      {
        id: 'sweet-grass-sub-account',
        name: 'Sweet Grass Trading SUB Account',
        aliases: ['sweet grass trading 12 acc 2', 'sweet grass trading pty ltd acc 2', 'sweet grass trading sub account'],
      },
      {
        id: 'isla-worrall',
        name: 'Isla Worrall',
        aliases: ['worrall isla', 'isla worrall', 'worrall isla elizabeth'],
      },
      {
        id: 'charlie-worrall',
        name: 'Charlie Worrall',
        aliases: ['worrall charlie', 'charlie worrall', 'worrall charlie christopher'],
      },
    ],
  },
];

const ALL_MONTHS = '__all_months__';

const compact = value => normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
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

function summariseInvestments(rows, months) {
  const map = new Map();
  rows.forEach(row => {
    const key = investmentKey(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        platform: row.platform || 'Unknown',
        name: row.investment_name || 'Unknown',
        currency: row.currency || 'ZAR',
        byMonthOriginal: {},
        byMonthZar: {},
      });
    }
    const item = map.get(key);
    item.byMonthOriginal[row.upload_month] = (item.byMonthOriginal[row.upload_month] || 0) + origVal(row);
    item.byMonthZar[row.upload_month] = (item.byMonthZar[row.upload_month] || 0) + zarVal(row);
  });

  return [...map.values()]
    .map(item => ({
      ...item,
      latestValue: months.reduce((value, month) => value || item.byMonthZar[month] || 0, 0),
    }))
    .sort((a, b) => b.latestValue - a.latestValue);
}

function entitySummary(entity, rows, months) {
  const entityRows = rowsForEntity(rows, entity);
  const investments = summariseInvestments(entityRows, months);
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

function buildReportGroups(rows) {
  const used = new Set();
  const seededGroups = REPORT_GROUPS.map(group => {
    const entities = group.entities.map(entity => {
      const matchedRows = rowsForEntity(rows, entity);
      matchedRows.forEach(row => used.add(row.id));
      return entity;
    });
    return { ...group, entities };
  });

  const byClient = new Map();
  rows.forEach(row => {
    if (used.has(row.id)) return;
    const key = clientKey(row);
    if (!byClient.has(key)) {
      byClient.set(key, {
        id: key,
        name: formatClientName(row.portfolio_name) || row.portfolio_name || 'Unknown Client',
        type: 'Client',
        description: 'Individual client report generated from monthly valuation data.',
        entities: [{ id: key, name: formatClientName(row.portfolio_name) || row.portfolio_name || 'Unknown Client', aliases: [row.portfolio_name || key] }],
      });
    }
  });

  return [...seededGroups, ...byClient.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function groupSummary(group, rows, months) {
  const entities = group.entities.map(entity => entitySummary(entity, rows, months));
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
      ['OFFSHORE PORTFOLIO', offshoreRows],
      ['LOCAL PORTFOLIO', localRows],
    ].forEach(([label, items]) => {
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
          ...exportMonths.map(month => xmlCell(item.byMonthZar[month] || 0, 'Number', 'Money')),
        ])));
      }
      rows.push(xmlRow([
        xmlCell('TOTAL', 'String', 'Section'),
        xmlCell(''),
        xmlCell(''),
        ...exportMonths.map(month => xmlCell(
          items.reduce((sum, item) => sum + (item.byMonthZar[month] || 0), 0),
          'Number',
          'Total'
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
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(REPORT_GROUPS[0].id);
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const reportGroups = useMemo(() => buildReportGroups(valuations), [valuations]);
  const selectedGroup = reportGroups.find(group => group.id === selectedGroupId) || reportGroups[0];
  const summary = useMemo(
    () => selectedGroup ? groupSummary(selectedGroup, valuations, months) : null,
    [selectedGroup, valuations, months]
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reportGroups.filter(group => !q || group.name.toLowerCase().includes(q) || group.description.toLowerCase().includes(q));
  }, [reportGroups, search]);

  const displayMonths = selectedMonth === ALL_MONTHS ? months : months.filter(month => month === selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate monthly client and family group portfolio reports from imported valuation data.</p>
        </div>
        {summary && (
          <Button type="button" className="gap-2" onClick={() => exportReport(selectedGroup, summary, months)}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex items-center gap-3 border-b pb-4">
            <img src={LOGO_URL} alt="Wealthworks" className="h-10 w-auto" />
            <div>
              <p className="text-sm font-semibold">Client Reports</p>
              <p className="text-xs text-muted-foreground">{reportGroups.length} report profiles</p>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reports..." className="h-9 pl-9" />
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {visibleGroups.map(group => {
              const itemSummary = groupSummary(group, valuations, months);
              const selected = group.id === selectedGroup?.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-all',
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{group.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{group.type}</p>
                    </div>
                    <Users className={cn('h-4 w-4', selected ? 'text-primary' : 'text-slate-400')} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
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

        <section className="space-y-5">
          {isLoading && <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground">Loading report data...</div>}
          {!isLoading && summary && (
            <>
              <div className="rounded-xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <img src={LOGO_URL} alt="Wealthworks" className="h-12 w-auto" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Monthly Portfolio Report</p>
                        <h2 className="mt-1 text-2xl font-semibold">{summary.name}</h2>
                      </div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{summary.description}</p>
                  </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-9 w-44 bg-white">
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_MONTHS}>All months</SelectItem>
                      {months.map(month => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Latest AUM</p>
                    <p className="mt-1 font-numbers text-xl font-semibold">R {fmtNum(summary.latestValue)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Entities</p>
                    <p className="mt-1 font-numbers text-xl font-semibold">{summary.entities.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Holdings</p>
                    <p className="mt-1 font-numbers text-xl font-semibold">{summary.holdings}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Platforms</p>
                    <p className="mt-1 truncate text-sm font-semibold">{summary.platforms.join(', ') || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border bg-white">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Total Portfolio</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="min-w-64 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
                        {displayMonths.map(month => <th key={month} className="min-w-36 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{formatMonth(month)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.entities.map(entity => (
                        <tr key={entity.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold">{entity.name}</td>
                          {displayMonths.map(month => <td key={month} className="px-4 py-3 text-right font-numbers">R {fmtNum(entity.byMonth[month] || 0)}</td>)}
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="px-4 py-3">TOTAL</td>
                        {displayMonths.map(month => <td key={month} className="px-4 py-3 text-right font-numbers">R {fmtNum(summary.byMonth[month] || 0)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {summary.entities.map(entity => (
                <div key={entity.id} className="overflow-hidden rounded-xl border bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{entity.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entity.investments.length} holdings · {entity.platforms.join(', ') || '-'}</p>
                    </div>
                    {months[0] && <MonthBadge month={months[0]} />}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="min-w-72 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fund / Investment Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</th>
                          {displayMonths.map(month => <th key={month} className="min-w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{formatMonth(month)}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {entity.investments.map(item => (
                          <tr key={item.key} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.platform}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.currency}</td>
                            {displayMonths.map(month => <td key={month} className="px-4 py-3 text-right font-numbers">R {fmtNum(item.byMonthZar[month] || 0)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
