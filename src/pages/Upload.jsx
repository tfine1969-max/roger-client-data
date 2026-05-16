import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_USD_ZAR_RATE, getUsdZarRateForMonth, saveUsdZarRateForMonth } from '@/lib/exchange-rates';
import ProviderLogo from '@/components/shared/ProviderLogo';
import JuliusBaerUpload from '@/components/upload/JuliusBaerUpload';
import PrimeUpload from '@/components/upload/PrimeUpload';
import GreyphonUpload from '@/components/upload/GreyphonUpload';
import CredoUpload from '@/components/upload/CredoUpload';
import NorthstarUpload from '@/components/upload/NorthstarUpload';
import PrescientUpload from '@/components/upload/PrescientUpload';
import PeresecUpload from '@/components/upload/PeresecUpload';
import DeleteMonthData from '@/components/upload/DeleteMonthData';
import { applyClientBlueprint } from '@/lib/client-canonicalization';
import { formatMonth } from '@/lib/valuation-utils';

const EMPTY_RATES = { USD: DEFAULT_USD_ZAR_RATE, EUR: '', GBP: '' };

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

function MonthlyWorkbookUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [exchangeRates, setExchangeRates] = useState(EMPTY_RATES);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);

  const handleMonthChange = (value) => {
    setUploadMonth(value);
    setExchangeRates(rates => ({ ...rates, USD: getUsdZarRateForMonth(value) }));
  };

  const handleRateChange = (currency, value) => {
    setExchangeRates(rates => ({ ...rates, [currency]: value }));
    if (currency === 'USD') saveUsdZarRateForMonth(uploadMonth, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;
    setStatus('uploading');
    setMessage('Uploading file...');
    setDetail(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMessage('Processing spreadsheet...');
      const response = await base44.functions.invoke('importMonthlyFile', {
        file_url,
        upload_month: uploadMonth,
        replace_existing: replaceExisting,
        exchange_rates: Object.fromEntries(
          Object.entries(exchangeRates).filter(([, v]) => String(v).trim() !== '')
        ),
      });
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Import failed');
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      setStatus('success');
      setMessage(`Successfully imported ${result.rows_imported} rows for ${uploadMonth}.`);
      setDetail({
        sheets_imported: result.sheets_imported,
        manual_rates_applied: result.manual_rates_applied,
        exchange_rates_detected: result.exchange_rates_detected,
        rows_skipped: result.rows_skipped,
      });
      if (onImported) await onImported(uploadMonth);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a multi-sheet Excel workbook to import portfolio valuations for a given month.
        Enter exchange rates when the file contains non-ZAR currencies.
      </p>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Upload Month</Label>
          <Input type="month" value={uploadMonth} onChange={e => handleMonthChange(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Spreadsheet File (.xlsx)</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setExchangeRates(EMPTY_RATES); }} required />
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-blue-950">Exchange Rates (Optional)</p>
            <p className="text-xs text-blue-800 mt-1">USD uses the shared month rate. Entered rates override workbook-detected rates for non-ZAR currencies.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['USD', 'EUR', 'GBP'].map(currency => (
              <div key={currency} className="space-y-1">
                <Label className="text-xs font-semibold">{currency}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.0001" min="0" placeholder={currency === 'USD' ? DEFAULT_USD_ZAR_RATE : 'e.g. 18.50'}
                    value={exchangeRates[currency]}
                    onChange={e => handleRateChange(currency, e.target.value)}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">ZAR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="rounded border-border" />
          <span>Replace existing data for this month</span>
        </label>
        <Button type="submit" disabled={!file || !uploadMonth || status === 'uploading'} className="w-full gap-2">
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing...' : 'Upload & Import'}
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
                {detail.manual_rates_applied && Object.keys(detail.manual_rates_applied).length > 0 && (
                  <p><strong className="text-foreground">Manual rates applied:</strong> {Object.entries(detail.manual_rates_applied).map(([c, r]) => `${c} ${r}`).join(', ')}</p>
                )}
                {detail.exchange_rates_detected && Object.keys(detail.exchange_rates_detected).length > 0 && (
                  <>
                    <p className="font-semibold text-foreground pt-1">Exchange rates used by account:</p>
                    {Object.entries(detail.exchange_rates_detected).slice(0, 8).map(([key, r]) => (
                      <p key={key}>{key.replace('||', ' / ')}: <strong>{r}</strong></p>
                    ))}
                    {Object.keys(detail.exchange_rates_detected).length > 8 && <p>+ {Object.keys(detail.exchange_rates_detected).length - 8} more</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
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

export default function Upload() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('julius-baer');
  const [repairMonth, setRepairMonth] = useState('');
  const [repairStatus, setRepairStatus] = useState(null);

  const handleImported = async (uploadMonth) => {
    if (uploadMonth) await applyClientBlueprint(uploadMonth);
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
  };

  const handleRepairMonth = async () => {
    if (!repairMonth) return;
    setRepairStatus('Checking client names and fees against April 2026...');
    try {
      const result = await applyClientBlueprint(repairMonth);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      if (result.skipped) {
        setRepairStatus('Choose May 2026 or a later month. April 2026 is the master list and does not need to be fixed.');
      } else {
        setRepairStatus(`Checked ${formatMonth(repairMonth)}. Updated ${result.updated} row${result.updated === 1 ? '' : 's'} to the April client names and fee rules.`);
      }
    } catch (err) {
      setRepairStatus(err.message || 'Could not fix client names for this month.');
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Imports</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload monthly data for each provider.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Keep Client Names & Fees Fixed</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              April 2026 is the master client and fee list. New uploads are automatically matched back to those corrected names, fund rebates, and client/provider advisory fees.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the month selector only if a month was already uploaded before this rule was added.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="month"
              value={repairMonth}
              onChange={event => {
                setRepairMonth(event.target.value);
                setRepairStatus(null);
              }}
              className="h-9 w-44 bg-white"
            />
            <Button type="button" variant="outline" className="h-9 bg-white" onClick={handleRepairMonth} disabled={!repairMonth}>
              Fix selected month
            </Button>
          </div>
        </div>
        {repairStatus && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{repairStatus}</p>}
      </div>

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
