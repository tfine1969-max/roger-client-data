import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_USD_ZAR_RATE, fetchMonthEndUsdZarRate, getConfiguredUsdZarRateForMonth, getUsdZarRateForMonth, saveUsdZarRateForMonth } from '@/lib/exchange-rates';
import ProviderLogo from '@/components/shared/ProviderLogo';
import JuliusBaerUpload from '@/components/upload/JuliusBaerUpload';
import PrimeUpload from '@/components/upload/PrimeUpload';
import GreyphonUpload from '@/components/upload/GreyphonUpload';
import CredoUpload from '@/components/upload/CredoUpload';
import NorthstarUpload from '@/components/upload/NorthstarUpload';
import PrescientUpload from '@/components/upload/PrescientUpload';
import PeresecUpload from '@/components/upload/PeresecUpload';
import DeleteMonthData from '@/components/upload/DeleteMonthData';
import UploadProgressSummary from '@/components/upload/UploadProgressSummary';
import { applyClientBlueprint } from '@/lib/client-canonicalization';
import { formatMonth } from '@/lib/valuation-utils';
import { importRogerDataWorkbook } from '@/lib/provider-workbook-import';
import { purgeEmbeddedMonthsFromDB } from '@/lib/roger-source-sync';
import { applySeededFeesToMonth } from '@/lib/fee-sync';

const PROVIDERS = [
  { id: 'credo', label: 'Credo' },
  { id: 'gryphon', label: 'Gryphon' },
  { id: 'julius-baer', label: 'Julius Baer' },
  { id: 'monthly', label: 'Monthly Workbook', type: 'workbook' },
  { id: 'northstar', label: 'Northstar' },
  { id: 'peresec', label: 'Peresec' },
  { id: 'prime', label: 'Prime Investments' },
  { id: 'prescient', label: 'Prescient' },
];

const USD_RATE_PROVIDER_IDS = new Set(['credo', 'julius-baer', 'northstar', 'monthly']);

const LAST_UPLOAD_KEYS = {
  credo: 'credo_last_upload',
  gryphon: 'gryphon_last_upload',
  peresec: 'peresec_last_upload',
  prescient: 'prescient_last_upload',
  prime: 'prime_last_upload',
};

function providerAliases(provider) {
  const label = provider.label.toLowerCase();
  const id = provider.id.toLowerCase();
  if (id === 'julius-baer') return ['julius baer', 'julius'];
  if (id === 'prime') return ['prime', 'prime investments'];
  if (id === 'monthly') return ['monthly workbook', 'sheets imported'];
  return [id, label];
}

function uploadMatchesProvider(upload, provider) {
  const haystack = `${upload.file_name || ''} ${upload.notes || ''}`.toLowerCase();
  return providerAliases(provider).some(alias => haystack.includes(alias));
}

function readLocalUpload(provider) {
  const key = LAST_UPLOAD_KEYS[provider.id];
  if (!key) return null;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      file_name: parsed.file_name,
      upload_month: parsed.upload_month,
      rows_imported: parsed.rows_imported,
      upload_date: parsed.uploaded_at,
      import_status: 'Imported',
      notes: parsed.client_name ? `Client: ${parsed.client_name}` : 'Local upload record',
      source: 'local',
    };
  } catch {
    return null;
  }
}

function ProviderUploadHistory() {
  const { data: uploads = [] } = useQuery({
    queryKey: ['monthlyUploads'],
    queryFn: () => base44.entities.MonthlyUpload.list('-upload_date', 500),
  });

  const rows = useMemo(() => {
    return PROVIDERS.map(provider => {
      const remoteUploads = uploads
        .filter(upload => uploadMatchesProvider(upload, provider))
        .sort((a, b) => String(b.upload_date || b.created_date || '').localeCompare(String(a.upload_date || a.created_date || '')));
      const localUpload = readLocalUpload(provider);
      const combined = [localUpload, ...remoteUploads].filter(Boolean)
        .sort((a, b) => String(b.upload_date || b.created_date || '').localeCompare(String(a.upload_date || a.created_date || '')));
      return { provider, latest: combined[0], count: combined.length };
    });
  }, [uploads]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Provider Upload History</h2>
          <p className="text-xs text-muted-foreground">Latest imported file, date, month and row count by provider.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Last File</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Month</th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Uploaded</th>
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-muted-foreground">Rows</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ provider, latest }) => (
              <tr key={provider.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {provider.type === 'workbook' ? <FileSpreadsheet className="h-4 w-4 text-primary" /> : <ProviderLogo providerId={provider.id} provider={provider.label} logoBoxClassName="h-7 w-16" logoClassName="max-h-4 max-w-[50px]" showName={false} />}
                    <span className="font-medium">{provider.label}</span>
                  </div>
                </td>
                <td className="max-w-[300px] truncate px-3 py-2 text-muted-foreground" title={latest?.file_name || ''}>{latest?.file_name || 'No upload recorded'}</td>
                <td className="px-3 py-2">{latest?.upload_month ? formatMonth(latest.upload_month) : '-'}</td>
                <td className="px-3 py-2 text-muted-foreground">{latest?.upload_date ? new Date(latest.upload_date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
                <td className="px-3 py-2 text-right font-numbers">{latest?.rows_imported ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlyWorkbookUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);
  const [progress, setProgress] = useState({ clients: 0, holdings: 0, aum: 0 });

  const refreshAfterSourceImport = async (months) => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
    queryClient.invalidateQueries({ queryKey: ['providerUploadSummary'] });
    if (onImported) {
      for (const month of months) {
        await onImported(month);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setMessage('Reading Roger source workbook...');
    setDetail(null);
    setProgress({ clients: 0, holdings: 0, aum: 0 });
    try {
      const result = await importRogerDataWorkbook({
        file,
        replaceExisting,
        defaultYear: 2026,
      });
      if (!result.success) throw new Error(result.error || 'Import failed');
      setMessage('Refreshing source AUM...');
      setProgress({
        clients: result.clients_imported || 0,
        holdings: result.rows_imported || 0,
        aum: result.aum_imported || 0,
      });
      setStatus('success');
      setMessage(`Successfully imported ${result.rows_imported} source rows across ${result.months_imported.map(formatMonth).join(', ')}.`);
      setDetail({
        sheets_imported: result.sheets_imported,
        rows_skipped: result.rows_skipped,
        sheet_summaries: result.sheet_summaries,
      });
      await refreshAfterSourceImport(result.months_imported);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  const handlePurgeEmbeddedMonths = async () => {
    setStatus('uploading');
    setMessage('Removing Jan-Mar 2026 database copies...');
    setDetail(null);
    setProgress({ clients: 0, holdings: 0, aum: 0 });
    try {
      const result = await purgeEmbeddedMonthsFromDB();
      setStatus('success');
      setMessage(
        `Removed ${result.portfolioRowsDeleted} portfolio rows and ${result.uploadRecordsDeleted} upload records for ${result.months.map(formatMonth).join(', ')}. Data is now served exclusively from the embedded file.`
      );
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      queryClient.invalidateQueries({ queryKey: ['providerUploadSummary'] });
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Purge failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload the Roger source workbook. Each month sheet is imported using the ZAR NAV values exactly as supplied, with rebate and advisory fee rates seeded from the workbook.
      </p>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Jan–Mar 2026 Source Data</p>
        <p className="mt-1 text-xs text-amber-800">
          Jan–Mar 2026 data is served from the embedded source file and never written to the database. If duplicate records exist from a previous import, use the button below to remove them.
        </p>
        <div className="mt-3">
          <Button type="button" variant="outline" className="bg-white" onClick={handlePurgeEmbeddedMonths} disabled={status === 'uploading'}>
            Remove DB Duplicates (Jan–Mar)
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Roger Source Workbook (.xlsx)</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} required />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded border-border" />
          <span>Replace existing data for all months found in this workbook</span>
        </label>
        <Button type="submit" disabled={!file || status === 'uploading'} className="w-full gap-2">
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing source workbook...' : 'Upload & Import Source Workbook'}
        </Button>
        {status === 'success' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
            </div>
            {detail && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-1">
                {detail.sheets_imported?.length > 0 && <p><strong className="text-foreground">Sheets imported:</strong> {detail.sheets_imported.join(', ')}</p>}
                {detail.rows_skipped > 0 && <p><strong className="text-foreground">Rows skipped:</strong> {detail.rows_skipped}</p>}
                {detail.sheet_summaries?.map(summary => (
                  <p key={summary.sheet}>
                    <strong className="text-foreground">{summary.sheet}:</strong> {summary.rows_imported} rows, AUM R {summary.aum.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <UploadProgressSummary
          active={status === 'uploading'}
          processed={status === 'success' ? 1 : 0}
          total={file ? 1 : 0}
          clients={progress.clients}
          holdings={progress.holdings}
          aum={progress.aum}
          message={message}
        />
        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {message}
          </div>
        )}
      </form>
      <DeleteMonthData provider="monthly" />
    </div>
  );
}

const APPLY_PROVIDERS = [
  { id: 'Prime', label: 'Prime' },
  { id: 'Julius Baer', label: 'Julius Baer' },
  { id: 'Credo', label: 'Credo' },
  { id: 'Gryphon', label: 'Gryphon' },
  { id: 'Northstar', label: 'Northstar' },
  { id: 'Prescient', label: 'Prescient' },
  { id: 'Peresec', label: 'Peresec' },
];

function ApplySeededFees() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [selectedProviders, setSelectedProviders] = useState(['Prime', 'Julius Baer']);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const toggleProvider = id =>
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

  const handleApply = async () => {
    if (!month || selectedProviders.length === 0) return;
    setStatus('running');
    setMessage('Applying seeded fees…');
    setProgress({ done: 0, total: 0 });
    try {
      const result = await applySeededFeesToMonth(month, {
        platforms: selectedProviders,
        onProgress: (done, total) => {
          setProgress({ done, total });
          setMessage(`Updated ${done} / ${total} rows…`);
        },
      });
      setStatus('success');
      setMessage(
        `Applied seeded fees to ${result.updated} rows for ${selectedProviders.join(', ')} in ${formatMonth(month)}.`
      );
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to apply fees');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">Apply Seeded Fees to Month</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Recalculates and writes rebate &amp; advisory fees from the fee mapping directly to portfolio valuation records for the selected month and providers.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9 w-40 bg-white" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Providers</Label>
          <div className="flex flex-wrap gap-1.5">
            {APPLY_PROVIDERS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProvider(p.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  selectedProviders.includes(p.id)
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-muted-foreground hover:border-primary/40'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          disabled={!month || selectedProviders.length === 0 || status === 'running'}
          onClick={handleApply}
          className="h-9 gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
          {status === 'running' ? 'Applying…' : 'Apply Fees'}
        </Button>
      </div>
      {status === 'running' && progress.total > 0 && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
          />
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}
      {status === 'running' && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default function Upload() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('julius-baer');
  const [rateMonth, setRateMonth] = useState('');
  const [usdZarRate, setUsdZarRate] = useState('');
  const [rateStatus, setRateStatus] = useState(null);
  const [fetchingRate, setFetchingRate] = useState(false);

  const handleImported = async (uploadMonth) => {
    if (uploadMonth) await applyClientBlueprint(uploadMonth);
    // Apply any saved fund merge rules to the newly imported data
    if (uploadMonth) {
      try {
        await base44.functions.invoke('applyFundMergeRules', { upload_month: uploadMonth });
      } catch (_err) {
        // Non-fatal
      }
    }
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
    queryClient.invalidateQueries({ queryKey: ['providerUploadSummary'] });
  };

  const handleRateMonthChange = (value) => {
    setRateMonth(value);
    setUsdZarRate(getUsdZarRateForMonth(value));
    setRateStatus(null);
  };

  const handleRateChange = (value) => {
    setUsdZarRate(value);
    saveUsdZarRateForMonth(rateMonth, value);
    setRateStatus(value ? `Saved USD/ZAR ${value} for ${formatMonth(rateMonth)}.` : null);
  };

  const handleFetchRate = async () => {
    if (!rateMonth) return;
    setFetchingRate(true);
    setRateStatus('Fetching month-end USD/ZAR rate...');
    try {
      const result = await fetchMonthEndUsdZarRate(rateMonth);
      setUsdZarRate(result.rate);
      setRateStatus(`Fetched USD/ZAR ${result.rate} for ${formatMonth(rateMonth)} using ${result.rateDate}${result.rateDate !== result.requestedDate ? ' (last available market day)' : ''}.`);
    } catch (err) {
      setRateStatus(err.message || 'Could not fetch the month-end rate.');
    } finally {
      setFetchingRate(false);
    }
  };

  const displayedRate = rateMonth ? getConfiguredUsdZarRateForMonth(rateMonth) || usdZarRate || getUsdZarRateForMonth(rateMonth) : '';

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Imports</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload monthly data for each provider.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Month-End USD/ZAR Rate</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Set the universal month-end exchange rate used by USD uploads such as Credo, Julius Baer, Northstar, and multi-currency monthly workbooks.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_170px_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Input type="month" value={rateMonth} onChange={event => handleRateMonthChange(event.target.value)} className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">USD/ZAR</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder={DEFAULT_USD_ZAR_RATE}
                value={usdZarRate}
                onChange={event => handleRateChange(event.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <Button type="button" variant="outline" className="h-9 gap-2 bg-white" onClick={handleFetchRate} disabled={!rateMonth || fetchingRate}>
              <RefreshCw className={cn('h-4 w-4', fetchingRate && 'animate-spin')} />
              Fetch month-end
            </Button>
          </div>
        </div>
        {rateStatus && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{rateStatus}</p>}
      </div>

      <ProviderUploadHistory />

      <ApplySeededFees />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={cn(
              'group rounded-lg border bg-white p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm',
              activeTab === p.id
                ? 'border-primary shadow-sm ring-1 ring-primary/20'
                : 'border-border'
            )}
          >
            <div className="flex items-center gap-3">
              {p.type === 'workbook' ? (
                <div className={cn(
                  'flex h-10 w-24 items-center justify-center rounded-md border bg-muted/30',
                  activeTab === p.id && 'border-primary/30 bg-primary/5'
                )}>
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <ProviderLogo
                  providerId={p.id}
                  provider={p.label}
                  logoBoxClassName={cn(
                    'h-10 w-24 bg-white transition-colors',
                    activeTab === p.id && 'border-primary/30 bg-primary/5'
                  )}
                  logoClassName="max-h-6 max-w-[78px]"
                  showName={false}
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{p.label}</p>
                <p className={cn(
                  'mt-0.5 text-[11px] font-medium',
                  activeTab === p.id ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {activeTab === p.id ? 'Selected' : 'Upload'}
                </p>
                {rateMonth && USD_RATE_PROVIDER_IDS.has(p.id) && displayedRate && (
                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                    USD/ZAR {displayedRate}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'monthly' && <MonthlyWorkbookUpload onImported={handleImported} />}
        {activeTab === 'julius-baer' && <JuliusBaerUpload onImported={handleImported} />}
        {activeTab === 'prime' && <PrimeUpload onImported={handleImported} />}
        {activeTab === 'credo' && <CredoUpload onImported={handleImported} />}
        {activeTab === 'gryphon' && <GreyphonUpload onImported={handleImported} />}
        {activeTab === 'northstar' && <NorthstarUpload onImported={handleImported} />}
        {activeTab === 'peresec' && <PeresecUpload onImported={handleImported} />}
        {activeTab === 'prescient' && <PrescientUpload onImported={handleImported} />}
      </div>
    </div>
  );
}
