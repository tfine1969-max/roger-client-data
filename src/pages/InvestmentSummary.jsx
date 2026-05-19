import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { getFundMappings } from '@/lib/fund-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSortedMonths, fmtNum, formatMonth, origVal, zarVal } from '@/lib/valuation-utils';
import { normalizeClientText } from '@/lib/client-utils';
import { useToast } from '@/components/ui/use-toast';

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
      { id: 'isla-worrall', name: 'Isla Worrall', aliases: ['worrall isla', 'isla worrall', 'worrall isla elizabeth', 'isla elizabeth worrall', 'miss isla elizabeth worrall', 'pri202204040006'] },
      { id: 'charlie-worrall', name: 'Charlie Worrall', aliases: ['worrall charlie', 'charlie worrall', 'worrall charlie christopher', 'charlie christopher worrall', 'master charlie christopher worrall', 'pri202204040005'] },
    ],
  },
];

const compact = value => normalizeClientText(value).replace(/[^a-z0-9]+/g, '');
const isZar = value => String(value || '').toUpperCase() === 'ZAR';
const currencyPrefix = currency => {
  const normalized = String(currency || '').toUpperCase();
  if (normalized === 'USD') return '$';
  if (normalized === 'ZAR' || normalized === 'MIXED') return 'R';
  return normalized || 'R';
};
const currencyValue = (value, currency) => `${currencyPrefix(currency)} ${fmtNum(value)}`;
const SORT_BY_SIZE = 'size';
const SORT_BY_NAME = 'name';
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
  // Use the row's actual currency so that a mapped row ("MAY TEST…" → "Wealthworks…")
  // shares the same grouping key as rows that already carry the canonical name.
  // Mixed-currency display is handled separately in summariseInvestments line 115.
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
    if (String(item.currency || '').toUpperCase() !== String(row.currency || 'ZAR').toUpperCase()) item.currency = 'Mixed';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState('marc-anthony-hoar');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS);
  const [activeReportTab, setActiveReportTab] = useState(defaultReportTab(REPORT_GROUPS[0]));
  const [fundSort, setFundSort] = useState(SORT_BY_SIZE);
  const [mergeFunds, setMergeFunds] = useState(false);
  // In-page manual merges made via the merge dialog (rawKey → canonical name).
  // Layered on top of the computed manualFundMerges so the UI updates immediately
  // before DB save / query invalidation completes.
  const [pendingMerges, setPendingMerges] = useState({});
  const [selectedFundKeys, setSelectedFundKeys] = useState(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeFundName, setMergeFundName] = useState('');
  const [isSavingRules, setIsSavingRules] = useState(false);

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const { data: fundMergeRules = [] } = useQuery({
    queryKey: ['fundMergeRules'],
    queryFn: () => base44.entities.FundMergeRule.list('source_name', 1000),
  });

  // Build fund-name merge map from DB rules + Funds-page localStorage mappings.
  // Computed as a memo (not state+effect) so it always reflects the current
  // localStorage without needing a cache bust or explicit state update.
  const manualFundMerges = useMemo(() => {
    if (!valuations.length) return {};
    const ruleMap = {};
    // DB-saved FundMergeRule records
    fundMergeRules.forEach(rule => {
      ruleMap[`${rule.source_name}||${rule.platform || ''}`] = rule.canonical_name;
    });
    // Funds page localStorage mappings: { "Platform||Investment Name": "Canonical Name" }
    const localMappings = getFundMappings();
    Object.entries(localMappings).forEach(([key, canonical]) => {
      const sepIdx = key.indexOf('||');
      if (sepIdx < 0) return;
      const platform = key.slice(0, sepIdx);
      const investmentName = key.slice(sepIdx + 2);
      ruleMap[`${investmentName}||${platform}`] = canonical;
      ruleMap[`${investmentName}||`] = ruleMap[`${investmentName}||`] || canonical;
    });
    if (!Object.keys(ruleMap).length) return {};
    const merges = {};
    const seen = new Set();
    valuations.forEach(row => {
      const rawKey = investmentKey(row);
      if (seen.has(rawKey)) return;
      seen.add(rawKey);
      const platformKey = `${row.investment_name || ''}||${row.platform || ''}`;
      const anyPlatformKey = `${row.investment_name || ''}||`;
      const canonical = ruleMap[platformKey] || ruleMap[anyPlatformKey];
      if (canonical && canonical !== row.investment_name) {
        merges[rawKey] = canonical;
      }
    });
    return merges;
  }, [fundMergeRules, valuations]);

  // Layer in-page pending merges on top of the computed base
  const effectiveMerges = useMemo(
    () => ({ ...manualFundMerges, ...pendingMerges }),
    [manualFundMerges, pendingMerges]
  );

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const selectedGroup = REPORT_GROUPS.find(group => group.id === selectedGroupId) || REPORT_GROUPS[0];
  const summary = useMemo(
    () => groupSummary(selectedGroup, valuations, months, mergeFunds, effectiveMerges),
    [selectedGroup, valuations, months, mergeFunds, effectiveMerges]
  );
  const displayMonths = selectedMonth === ALL_MONTHS ? [...months].reverse() : months.filter(month => month === selectedMonth);
  const latestMonth = months[0] || '';
  const reportTabs = useMemo(() => {
    if (selectedGroup.id === 'marc-anthony-hoar') {
      return [
        { id: 'local', label: 'Local' },
        { id: 'offshore', label: 'Offshore' },
        { id: 'combined', label: 'Combined' },
      ];
    }
    return summary.entities.map(entity => ({ id: entity.id, label: entity.name }));
  }, [selectedGroup.id, summary.entities]);
  const activeReport = useMemo(() => {
    const marcEntity = summary.entities[0];
    if (selectedGroup.id === 'marc-anthony-hoar') {
      if (activeReportTab === 'offshore') {
        return {
          title: 'Offshore Portfolio',
          entity: marcEntity,
          currencyMode: 'native',
          rows: sortInvestments(marcEntity?.investments.filter(item => !isZar(item.currency)) || [], fundSort, latestMonth, 'native'),
        };
      }
      if (activeReportTab === 'combined') {
        return {
          title: 'Combined Portfolio',
          entity: marcEntity,
          currencyMode: 'mixed',
          rows: sortInvestments(marcEntity?.investments || [], fundSort, latestMonth, 'zar'),
        };
      }
      return {
        title: 'Local Portfolio',
        entity: marcEntity,
        currencyMode: 'zar',
        rows: sortInvestments(marcEntity?.investments.filter(item => isZar(item.currency)) || [], fundSort, latestMonth, 'zar'),
      };
    }
    const entity = summary.entities.find(item => item.id === activeReportTab) || summary.entities[0];
    return {
      title: entity?.name || 'Entity Portfolio',
      entity,
      currencyMode: 'mixed',
      rows: sortInvestments(entity?.investments || [], fundSort, latestMonth, 'zar'),
    };
  }, [activeReportTab, fundSort, latestMonth, selectedGroup.id, summary.entities]);
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

  const handleGroupChange = (groupId) => {
    const group = REPORT_GROUPS.find(item => item.id === groupId) || REPORT_GROUPS[0];
    setSelectedGroupId(group.id);
    setActiveReportTab(defaultReportTab(group));
    setSelectedFundKeys(new Set());
  };

  const openFundMerge = () => {
    if (selectedFundKeys.size < 2) return;
    setMergeFundName(selectedFundNames[0] || selectedFundItems[0]?.name || '');
    setMergeDialogOpen(true);
  };

  const applyFundMerge = async () => {
    const name = mergeFundName.trim();
    if (!name || selectedFundKeys.size < 2) return;

    // Update pending merges immediately so UI reflects change before DB save
    setPendingMerges(prev => {
      const next = { ...prev };
      selectedFundKeys.forEach(key => { next[key] = name; });
      return next;
    });
    setSelectedFundKeys(new Set());
    setMergeDialogOpen(false);
    setMergeFundName('');

    // Persist as FundMergeRules in the background
    // rawKey = platform||investment_name||currency — extract source names from selected keys
    const rulesToSave = [];
    selectedFundKeys.forEach(rawKey => {
      const [platform, investment_name] = rawKey.split('||');
      if (investment_name && investment_name !== name) {
        rulesToSave.push({ source_name: investment_name, canonical_name: name, platform: platform || '' });
      }
    });
    if (rulesToSave.length > 0) {
      try {
        await base44.functions.invoke('seedFundMergeRules', { rules: rulesToSave });
        queryClient.invalidateQueries({ queryKey: ['fundMergeRules'] });
        toast({ title: 'Fund merge saved', description: `${rulesToSave.length} rule${rulesToSave.length === 1 ? '' : 's'} saved for future uploads.` });
      } catch {
        toast({ title: 'Merge applied (not saved)', description: 'Could not persist rules — manual merge applied for this session only.', variant: 'destructive' });
      }
    }
  };

  const handleSaveAllRules = async () => {
    const rulesToSave = [];
    const seen = new Set();
    Object.entries(effectiveMerges).forEach(([rawKey, canonical]) => {
      const [platform, investment_name] = rawKey.split('||');
      if (!investment_name || investment_name === canonical) return;
      const dedupeKey = `${investment_name}||${platform}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      rulesToSave.push({ source_name: investment_name, canonical_name: canonical, platform: platform || '' });
    });
    if (rulesToSave.length === 0) {
      toast({ title: 'Nothing to save', description: 'No manual merges to persist.' });
      return;
    }
    setIsSavingRules(true);
    try {
      const res = await base44.functions.invoke('seedFundMergeRules', { rules: rulesToSave });
      queryClient.invalidateQueries({ queryKey: ['fundMergeRules'] });
      toast({ title: 'Rules saved', description: res.data?.message || `${rulesToSave.length} rules saved.` });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message || 'Could not save rules.', variant: 'destructive' });
    } finally {
      setIsSavingRules(false);
    }
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

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[320px_1fr] lg:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Client report</label>
            <Select value={selectedGroupId} onValueChange={handleGroupChange}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_GROUPS.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
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
      </div>

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
                      variant="outline"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={handleSaveAllRules}
                      disabled={isSavingRules || Object.keys(effectiveMerges).length === 0}
                      title="Save all current merges as persistent rules for future uploads"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSavingRules ? 'Saving...' : 'Save rules'}
                    </Button>
                    <Button
                      type="button"
                      className="h-8 px-3 text-xs"
                      onClick={openFundMerge}
                      disabled={selectedFundCount < 2}
                    >
                      Merge selected funds{selectedFundCount ? ` (${selectedFundCount})` : ''}
                    </Button>
                    <Select value={fundSort} onValueChange={setFundSort}>
                      <SelectTrigger className="h-8 w-40 bg-white text-xs">
                        <SelectValue placeholder="Sort funds" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SORT_BY_SIZE}>Sort by latest size</SelectItem>
                        <SelectItem value={SORT_BY_NAME}>Sort by fund name</SelectItem>
                      </SelectContent>
                    </Select>
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

              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{activeReport.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activeReport.rows.length} holdings - {activeReport.entity?.platforms.join(', ') || '-'}
                    </p>
                  </div>
                  <Tabs value={activeReportTab} onValueChange={value => { setActiveReportTab(value); setSelectedFundKeys(new Set()); }}>
                    <TabsList className="h-8 overflow-x-auto">
                      {reportTabs.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id} className="h-6 px-3 text-xs">
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="sticky left-0 z-20 w-10 bg-muted px-3 py-2"></th>
                        <th className="sticky left-10 z-10 min-w-72 bg-muted px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fund / Investment Name</th>
                        <th className="min-w-24 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</th>
                        <th className="min-w-20 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Currency</th>
                        {displayMonths.map(month => <th key={month} className="min-w-32 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{formatMonth(month)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeReport.rows.length === 0 && (
                        <tr>
                          <td colSpan={displayMonths.length + 4} className="px-3 py-6 text-center text-xs text-muted-foreground">No holdings</td>
                        </tr>
                      )}
                      {activeReport.rows.map(item => (
                        <tr key={item.key} className="hover:bg-muted/20">
                          <td className="sticky left-0 z-20 bg-white px-3 py-2">
                            <input
                              type="checkbox"
                              checked={itemSelected(item)}
                              onChange={() => toggleFundSelection(item)}
                              className="h-4 w-4 cursor-pointer accent-primary"
                              aria-label={"Select " + item.name + " for merge"}
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
                            const useNative = activeReport.currencyMode === 'native' && String(item.currency).toUpperCase() !== 'MIXED';
                            const value = useNative ? item.byMonthOriginal[month] || 0 : item.byMonthZar[month] || 0;
                            const displayCurrency = useNative ? item.currency : 'ZAR';
                            return <td key={month} className="px-3 py-2 text-right font-numbers">{currencyValue(value, displayCurrency)}</td>;
                          })}
                        </tr>
                      ))}
                      {activeReport.rows.length > 0 && (
                        <tr className="bg-slate-50 font-semibold">
                          <td className="sticky left-0 z-20 bg-slate-50 px-3 py-2"></td>
                          <td className="sticky left-10 z-10 bg-slate-50 px-3 py-2">TOTAL</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-muted-foreground">ZAR</td>
                          {displayMonths.map(month => {
                            const total = activeReport.rows.reduce((sum, item) => sum + (item.byMonthZar[month] || 0), 0);
                            return <td key={month} className="px-3 py-2 text-right font-numbers">{currencyValue(total, 'ZAR')}</td>;
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
      </section>

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
              Choose the correct existing fund name or edit the reporting name below. The merge will be saved as a persistent rule and applied automatically on future uploads.
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

function defaultReportTab(group) {
  return group?.id === 'marc-anthony-hoar' ? 'local' : group?.entities?.[0]?.id || 'local';
}

function latestItemValue(item, latestMonth, currencyMode) {
  if (!latestMonth) return 0;
  if (currencyMode === 'native' && String(item.currency).toUpperCase() !== 'MIXED') return item.byMonthOriginal[latestMonth] || 0;
  return item.byMonthZar[latestMonth] || 0;
}

function sortInvestments(items, sortMode, latestMonth, currencyMode) {
  return [...items].sort((a, b) => {
    if (sortMode === SORT_BY_NAME) return a.name.localeCompare(b.name);
    return latestItemValue(b, latestMonth, currencyMode) - latestItemValue(a, latestMonth, currencyMode);
  });
}