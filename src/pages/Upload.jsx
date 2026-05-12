import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import JuliusBaerUpload from '@/components/upload/JuliusBaerUpload';
import PrimeUpload from '@/components/upload/PrimeUpload';
import GreyphonUpload from '@/components/upload/GreyphonUpload';
import CredoUpload from '@/components/upload/CredoUpload';
import NorthstarUpload from '@/components/upload/NorthstarUpload';
import DeleteMonthData from '@/components/upload/DeleteMonthData';

const DEFAULT_USD_ZAR_RATE = '16.668';
const EMPTY_RATES = { USD: DEFAULT_USD_ZAR_RATE, EUR: '', GBP: '' };

const PROVIDERS = [
  { id: 'monthly', label: 'Monthly Workbook' },
  { id: 'julius-baer', label: 'Julius Baer' },
  { id: 'prime', label: 'Prime Investments' },
  { id: 'credo', label: 'Credo' },
  { id: 'gryphon', label: 'Gryphon' },
  { id: 'northstar', label: 'Northstar' },
  { id: 'peresec', label: 'Peresec' },
  { id: 'prescient', label: 'Prescient' },
];

function ComingSoon({ provider, providerId }) {
  return (
    <div className="space-y-0">
      <div className="bg-white border rounded-lg p-10 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <UploadIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{provider} import coming soon</p>
        <p className="text-xs text-muted-foreground">Use the Monthly Workbook tab to import this provider's data for now.</p>
      </div>
      <DeleteMonthData provider={providerId} />
    </div>
  );
}

function MonthlyWorkbookUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [exchangeRates, setExchangeRates] = useState(EMPTY_RATES);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);

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
      if (onImported) onImported();
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
          <Input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Spreadsheet File (.xlsx)</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setExchangeRates(EMPTY_RATES); }} required />
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-blue-950">Exchange Rates (Optional)</p>
            <p className="text-xs text-blue-800 mt-1">Entered rates override workbook-detected rates for non-ZAR currencies.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['USD', 'EUR', 'GBP'].map(currency => (
              <div key={currency} className="space-y-1">
                <Label className="text-xs font-semibold">{currency}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.0001" min="0" placeholder={currency === 'USD' ? DEFAULT_USD_ZAR_RATE : 'e.g. 18.50'}
                    value={exchangeRates[currency]}
                    onChange={e => setExchangeRates(rates => ({ ...rates, [currency]: e.target.value }))}
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

  const handleImported = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Imports</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload monthly data for each provider.</p>
      </div>

      {/* Provider tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
              activeTab === p.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
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
        {activeTab === 'peresec' && <ComingSoon provider="Peresec" providerId="peresec" />}
        {activeTab === 'prescient' && <ComingSoon provider="Prescient" providerId="prescient" />}
      </div>
    </div>
  );
}
