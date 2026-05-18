import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload as UploadIcon, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import ProviderLogo from '@/components/shared/ProviderLogo';
import MonthBadge from '@/components/shared/MonthBadge';
import { effectiveExchangeRate, fmtNum, getSortedMonths, zarVal } from '@/lib/valuation-utils';
import { withCalculatedFees } from '@/lib/fee-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { clientKey } from '@/lib/client-utils';

const PROVIDERS = [
  { id: 'prime', label: 'Prime' },
  { id: 'gryphon', label: 'Gryphon' },
  { id: 'julius-baer', label: 'Julius Baer' },
  { id: 'credo', label: 'Credo' },
  { id: 'northstar', label: 'Northstar' },
  { id: 'peresec', label: 'Peresec' },
  { id: 'prescient', label: 'Prescient' },
];

const PLATFORM_IDS = {
  'julius baer': 'julius-baer',
  credo: 'credo',
  gryphon: 'gryphon',
  'gryphon asset management': 'gryphon',
  prime: 'prime',
  'prime investments': 'prime',
  northstar: 'northstar',
  'northstar fnb': 'northstar',
  'northstar sanlam': 'northstar',
  peresec: 'peresec',
  'peresec securities': 'peresec',
  prescient: 'prescient',
};

const norm = value => String(value || '').toLowerCase().replace(/\b(mr|mrs|ms|miss|dr|prof)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const compact = value => norm(value).replace(/[^a-z0-9]+/g, '');
const providerId = value => PLATFORM_IDS[norm(value)] || norm(value).replace(/\s+/g, '-');
const diffClass = value => Math.abs(value || 0) > 1 ? 'text-destructive font-semibold' : 'text-positive';
const pctFromControl = value => Number(value || 0);
const LOCAL_CONTROL_KEY = 'control_sheet_rows_v1';

function functionErrorMessage(err, fallback = 'Upload failed') {
  const data = err?.response?.data || err?.data || err?.cause?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (err?.response?.status) return `${err.response.status}: ${err.message || fallback}`;
  return err?.message || fallback;
}

async function invokeFunction(name, payload) {
  const response = await base44.functions.invoke(name, payload).catch((err) => {
    throw new Error(functionErrorMessage(err, `${name} failed`));
  });
  if (response?.data?.success === false || response?.data?.error) {
    throw new Error(response.data.error || `${name} failed`);
  }
  return response.data;
}

function getLocalControlRows() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CONTROL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalControlRows(uploadMonth, provider, records) {
  if (!records?.length) return;
  const otherRows = getLocalControlRows().filter(row => !(row.upload_month === uploadMonth && row.provider_id === provider.id));
  const rows = records.map((row, index) => ({
    ...row,
    id: `local-${uploadMonth}-${provider.id}-${index}`,
    _localOnly: true,
  }));
  localStorage.setItem(LOCAL_CONTROL_KEY, JSON.stringify([...otherRows, ...rows]));
}

function investmentKey(value) {
  return norm(value)
    .replace(/\bfof\b/g, 'fund of funds')
    .replace(/\bfund of fund\b/g, 'fund of funds')
    .replace(/\b(class|cls)\s+[a-z0-9]+\b/g, ' ')
    .replace(/\b[a-z]\b$/, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9]+/g, '');
}

function rowKey(client, investment) {
  return `${compact(client)}||${investmentKey(investment)}`;
}

function monthName(month) {
  return month ? new Date(+month.split('-')[0], +month.split('-')[1] - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) : '';
}

function UploadControl({ provider, uploadMonth, onImported }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;
    setStatus('uploading');
    setMessage('Uploading control sheet...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await invokeFunction('importControlSheet', {
        provider_id: provider.id,
        file_url,
        upload_month: uploadMonth,
        replace_existing: true,
      });
      setStatus('success');
      if (result.persisted === false) saveLocalControlRows(uploadMonth, provider, result.records);
      setMessage(`${result.rows_imported} rows · ZAR ${fmtNum(result.total_nav_zar || 0)}${result.persisted === false ? ' · temporary until entity is published' : ''}`);
      setFile(null);
      onImported();
    } catch (err) {
      setStatus('error');
      setMessage(functionErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <ProviderLogo providerId={provider.id} provider={provider.label} logoBoxClassName="h-9 w-24" logoClassName="max-h-6 max-w-[76px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Control Sheet</Label>
        <Input type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(null); }} />
      </div>
      <Button type="submit" disabled={!file || !uploadMonth || status === 'uploading'} className="w-full gap-2" size="sm">
        <UploadIcon className="h-4 w-4" />
        {status === 'uploading' ? 'Importing...' : 'Upload Control'}
      </Button>
      {status === 'success' && <p className="flex items-center gap-1 text-xs text-positive"><CheckCircle2 className="h-3.5 w-3.5" /> {message}</p>}
      {status === 'error' && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> {message}</p>}
    </form>
  );
}

export default function Control() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [aligning, setAligning] = useState(false);
  const [alignMessage, setAlignMessage] = useState(null);

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });
  const { data: controlValues = [] } = useQuery({
    queryKey: ['controlValues'],
    queryFn: async () => {
      const localRows = getLocalControlRows();
      try {
        const remoteRows = await base44.entities.ControlValue.list('-upload_month', 5000);
        const remoteKeys = new Set(remoteRows.map(row => `${row.upload_month}|${row.provider_id}|${row.client_name}|${row.investment_name}`));
        return [
          ...remoteRows,
          ...localRows.filter(row => !remoteKeys.has(`${row.upload_month}|${row.provider_id}|${row.client_name}|${row.investment_name}`)),
        ];
      } catch {
        return localRows;
      }
    },
  });
  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const feeRows = useMemo(() => valuations.map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)), [valuations, feeConfigs]);
  const months = useMemo(() => [...new Set([...getSortedMonths(valuations), ...getSortedMonths(controlValues), '2026-04'])].filter(Boolean).sort((a, b) => b.localeCompare(a)), [valuations, controlValues]);
  const monthControl = useMemo(() => controlValues.filter(row => row.upload_month === selectedMonth), [controlValues, selectedMonth]);
  const monthDbRows = useMemo(() => feeRows.filter(row => row.upload_month === selectedMonth), [feeRows, selectedMonth]);

  const comparison = useMemo(() => {
    return PROVIDERS.map(provider => {
      const controlRows = monthControl.filter(row => row.provider_id === provider.id);
      const dbRows = monthDbRows.filter(row => providerId(row.platform) === provider.id);
      const controlAum = controlRows.reduce((s, row) => s + (row.nav_zar || 0), 0);
      const dbAum = dbRows.reduce((s, row) => s + zarVal(row), 0);
      const controlRebate = controlRows.reduce((s, row) => s + (row.rebate_monthly_zar || 0), 0);
      const dbRebate = dbRows.reduce((s, row) => s + (row.rebate_fee_monthly_amount_zar || 0), 0);
      const controlAdvisory = controlRows.reduce((s, row) => s + (row.advisory_monthly_zar || 0), 0);
      const dbAdvisory = dbRows.reduce((s, row) => s + (row.advisory_fee_monthly_amount_zar || 0), 0);
      return {
        ...provider,
        controlRows,
        dbRows,
        controlAum,
        dbAum,
        aumDiff: dbAum - controlAum,
        controlRebate,
        dbRebate,
        rebateDiff: dbRebate - controlRebate,
        controlAdvisory,
        dbAdvisory,
        advisoryDiff: dbAdvisory - controlAdvisory,
      };
    });
  }, [monthControl, monthDbRows]);

  const active = comparison.find(row => row.id === selectedProvider);

  const detailRows = useMemo(() => {
    if (!active) return [];
    const dbMap = {};
    active.dbRows.forEach(row => {
      const key = rowKey(row.portfolio_name || clientKey(row), row.investment_name);
      if (!dbMap[key]) dbMap[key] = { rows: [], aum: 0, rebate: 0, advisory: 0 };
      dbMap[key].rows.push(row);
      dbMap[key].aum += zarVal(row);
      dbMap[key].rebate += row.rebate_fee_monthly_amount_zar || 0;
      dbMap[key].advisory += row.advisory_fee_monthly_amount_zar || 0;
    });

    const rows = active.controlRows.map(control => {
      const key = rowKey(control.client_name, control.investment_name);
      const db = dbMap[key] || { rows: [], aum: 0, rebate: 0, advisory: 0 };
      return {
        key,
        control,
        dbRows: db.rows,
        dbAum: db.aum,
        dbRebate: db.rebate,
        dbAdvisory: db.advisory,
        aumDiff: db.aum - (control.nav_zar || 0),
        rebateDiff: db.rebate - (control.rebate_monthly_zar || 0),
        advisoryDiff: db.advisory - (control.advisory_monthly_zar || 0),
      };
    });

    const controlKeys = new Set(rows.map(row => row.key));
    Object.entries(dbMap).forEach(([key, db]) => {
      if (controlKeys.has(key)) return;
      const first = db.rows[0];
      rows.push({
        key,
        control: null,
        dbRows: db.rows,
        dbAum: db.aum,
        dbRebate: db.rebate,
        dbAdvisory: db.advisory,
        aumDiff: db.aum,
        rebateDiff: db.rebate,
        advisoryDiff: db.advisory,
        dbOnlyName: first?.portfolio_name,
        dbOnlyInvestment: first?.investment_name,
      });
    });

    return rows.sort((a, b) => Math.abs(b.aumDiff) - Math.abs(a.aumDiff));
  }, [active]);

  const alignActiveProvider = async () => {
    if (!active) return;
    setAligning(true);
    setAlignMessage(null);
    try {
      let updated = 0;
      let skipped = 0;
      for (const row of detailRows) {
        if (!row.control || row.dbRows.length !== 1) {
          skipped++;
          continue;
        }
        const target = row.dbRows[0];
        const currency = String(target.currency || 'ZAR').toUpperCase();
        const rate = currency === 'USD' ? effectiveExchangeRate(target) : 1;
        const nav = row.control.nav_zar || 0;
        const originalValue = currency === 'USD' && rate ? nav / rate : nav;
        const rebate = pctFromControl(row.control.rebate_annual_percent);
        const advisory = pctFromControl(row.control.advisory_annual_percent);
        await base44.entities.PortfolioValuation.update(target.id, {
          original_currency_value: originalValue,
          month_end_market_value: originalValue,
          exchange_rate_to_zar: rate || 1,
          zar_value: nav,
          rebate_fee_annual_percent: rebate,
          advisory_fee_annual_percent: advisory,
          rebate_fee_monthly_amount_zar: row.control.rebate_monthly_zar || 0,
          advisory_fee_monthly_amount_zar: row.control.advisory_monthly_zar || 0,
          total_monthly_fee_zar: (row.control.rebate_monthly_zar || 0) + (row.control.advisory_monthly_zar || 0),
          fee_required: false,
        });
        updated++;
      }
      await queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      setAligning(false);
      setAlignMessage({
        type: 'success',
        text: `Aligned ${updated} matching row${updated === 1 ? '' : 's'}. ${skipped} row${skipped === 1 ? '' : 's'} still need review because they have no match or multiple matches.`,
      });
    } catch (err) {
      setAligning(false);
      setAlignMessage({ type: 'error', text: err.message || 'Failed to align values' });
    }
  };

  if (active) {
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedProvider(null); setAlignMessage(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Control Summary
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <ProviderLogo providerId={active.id} provider={active.label} logoBoxClassName="h-12 w-36" logoClassName="max-h-8 max-w-[120px]" />
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MonthBadge month={selectedMonth} />
              <span>{detailRows.length} control comparison lines</span>
            </div>
          </div>
          <Button onClick={alignActiveProvider} disabled={aligning} className="gap-2">
            <RefreshCw className="h-4 w-4" /> {aligning ? 'Aligning...' : 'Align Matched Rows'}
          </Button>
        </div>
        {alignMessage && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            alignMessage.type === 'error'
              ? 'border-destructive/20 bg-destructive/5 text-destructive'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}>
            {alignMessage.text}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[24%] px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Client / Investment</th>
                  <th className="w-[12%] px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Control AUM</th>
                  <th className="w-[12%] px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Database AUM</th>
                  <th className="w-[10%] px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">AUM Diff</th>
                  <th className="w-[10%] px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Rebate Diff</th>
                  <th className="w-[10%] px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Advisory Diff</th>
                  <th className="w-[22%] px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {detailRows.map(row => {
                  const hasDiff = Math.abs(row.aumDiff) > 1 || Math.abs(row.rebateDiff) > 1 || Math.abs(row.advisoryDiff) > 1;
                  const status = !row.control ? 'Database row not in control sheet'
                    : row.dbRows.length === 0 ? 'Missing from database/AUM'
                    : row.dbRows.length > 1 ? 'Multiple database matches'
                    : hasDiff ? 'Difference requires review' : 'Matched';
                  return (
                    <tr key={row.key} className={hasDiff ? 'bg-amber-50/50' : ''}>
                      <td className="px-3 py-2">
                        <p className="truncate font-medium">{row.control?.client_name || row.dbOnlyName || 'Unknown'}</p>
                        <p className="truncate text-muted-foreground">{row.control?.investment_name || row.dbOnlyInvestment || 'Unknown'}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-numbers">{fmtNum(row.control?.nav_zar || 0)}</td>
                      <td className="px-3 py-2 text-right font-numbers">{fmtNum(row.dbAum)}</td>
                      <td className={`px-3 py-2 text-right font-numbers ${diffClass(row.aumDiff)}`}>{fmtNum(row.aumDiff)}</td>
                      <td className={`px-3 py-2 text-right font-numbers ${diffClass(row.rebateDiff)}`}>{fmtNum(row.rebateDiff)}</td>
                      <td className={`px-3 py-2 text-right font-numbers ${diffClass(row.advisoryDiff)}`}>{fmtNum(row.advisoryDiff)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare uploaded AUM and fee values against provider control sheets.
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-10 w-48 bg-white">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => <SelectItem key={month} value={month}>{monthName(month)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Control Sheet Uploads</h2>
            <p className="text-xs text-muted-foreground">Upload the provider control sheets for <strong>{monthName(selectedMonth)}</strong>.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PROVIDERS.map(provider => (
            <UploadControl
              key={provider.id}
              provider={provider}
              uploadMonth={selectedMonth}
              onImported={() => queryClient.invalidateQueries({ queryKey: ['controlValues'] })}
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Control AUM</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">AUM Panel</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">AUM Diff</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rebate Diff</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advisory Diff</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rows</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparison.map(row => {
                const hasDiff = Math.abs(row.aumDiff) > 1 || Math.abs(row.rebateDiff) > 1 || Math.abs(row.advisoryDiff) > 1;
                return (
                  <tr key={row.id} onClick={() => setSelectedProvider(row.id)} className={`cursor-pointer hover:bg-muted/20 ${hasDiff ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <ProviderLogo providerId={row.id} provider={row.label} logoBoxClassName="h-10 w-28" logoClassName="max-h-7 max-w-[90px]" />
                    </td>
                    <td className="px-4 py-3 text-right font-numbers">ZAR {fmtNum(row.controlAum)}</td>
                    <td className="px-4 py-3 text-right font-numbers">ZAR {fmtNum(row.dbAum)}</td>
                    <td className={`px-4 py-3 text-right font-numbers ${diffClass(row.aumDiff)}`}>{fmtNum(row.aumDiff)}</td>
                    <td className={`px-4 py-3 text-right font-numbers ${diffClass(row.rebateDiff)}`}>{fmtNum(row.rebateDiff)}</td>
                    <td className={`px-4 py-3 text-right font-numbers ${diffClass(row.advisoryDiff)}`}>{fmtNum(row.advisoryDiff)}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.controlRows.length}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                <td className="px-4 py-3 text-right font-numbers">ZAR {fmtNum(comparison.reduce((s, row) => s + row.controlAum, 0))}</td>
                <td className="px-4 py-3 text-right font-numbers">ZAR {fmtNum(comparison.reduce((s, row) => s + row.dbAum, 0))}</td>
                <td className={`px-4 py-3 text-right font-numbers ${diffClass(comparison.reduce((s, row) => s + row.aumDiff, 0))}`}>{fmtNum(comparison.reduce((s, row) => s + row.aumDiff, 0))}</td>
                <td className={`px-4 py-3 text-right font-numbers ${diffClass(comparison.reduce((s, row) => s + row.rebateDiff, 0))}`}>{fmtNum(comparison.reduce((s, row) => s + row.rebateDiff, 0))}</td>
                <td className={`px-4 py-3 text-right font-numbers ${diffClass(comparison.reduce((s, row) => s + row.advisoryDiff, 0))}`}>{fmtNum(comparison.reduce((s, row) => s + row.advisoryDiff, 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
