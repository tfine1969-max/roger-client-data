import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

const EMPTY_RATES = { USD: '', EUR: '', GBP: '' };

export default function Upload() {
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

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setMessage('Processing spreadsheet...');

    const response = await base44.functions.invoke('importMonthlyFile', {
      file_url,
      upload_month: uploadMonth,
      replace_existing: replaceExisting,
      exchange_rates: Object.fromEntries(
        Object.entries(exchangeRates).filter(([, value]) => String(value).trim() !== '')
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
  };

  const handleSubmitSafe = async (e) => {
    e.preventDefault();
    try {
      await handleSubmit(e);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  const handleFileSelect = (e) => {
    setFile(e.target.files?.[0] || null);
    setExchangeRates(EMPTY_RATES);
  };

  // Julius Baer PDF upload state
  const [jbFile, setJbFile] = useState(null);
  const [jbMonth, setJbMonth] = useState('');
  const [jbRate, setJbRate] = useState('');
  const [jbReplace, setJbReplace] = useState(false);
  const [jbStatus, setJbStatus] = useState(null);
  const [jbMessage, setJbMessage] = useState('');
  const [jbDetail, setJbDetail] = useState(null);

  const handleJbSubmit = async (e) => {
    e.preventDefault();
    if (!jbFile || !jbMonth || !jbRate) return;
    setJbStatus('uploading');
    setJbMessage('Uploading PDF...');
    setJbDetail(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: jbFile });
      setJbMessage('Extracting holdings from PDF (this may take ~20s)...');
      const response = await base44.functions.invoke('importJuliusBaerPdf', {
        file_url,
        upload_month: jbMonth,
        exchange_rate: parseFloat(jbRate),
        replace_existing: jbReplace,
      });
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Import failed');
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      setJbStatus('success');
      setJbMessage(`Imported ${result.rows_imported} holdings for ${result.client_name} (${jbMonth}).`);
      setJbDetail(result);
    } catch (err) {
      setJbStatus('error');
      setJbMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Upload Monthly Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a multi-sheet Excel workbook to import portfolio valuations for a given month.
          Enter a USD rate when the file needs USD values converted to ZAR using your month-end rate.
        </p>
      </div>

      <form onSubmit={handleSubmitSafe} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Upload Month</Label>
          <Input
            type="month"
            value={uploadMonth}
            onChange={e => setUploadMonth(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Spreadsheet File (.xlsx)</Label>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            required
          />
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
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="e.g. 18.50"
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
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={e => setReplaceExisting(e.target.checked)}
            className="rounded border-border"
          />
          <span>Replace existing data for this month</span>
        </label>

        <Button type="submit" disabled={!file || !uploadMonth || status === 'uploading'} className="w-full gap-2">
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing...' : 'Upload & Import'}
        </Button>

        {status === 'success' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {message}
            </div>
            {detail && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-1">
                {detail.sheets_imported?.length > 0 && <p><strong className="text-foreground">Sheets imported:</strong> {detail.sheets_imported.join(', ')}</p>}
                {detail.rows_skipped > 0 && <p><strong className="text-foreground">Rows skipped:</strong> {detail.rows_skipped}</p>}
                {detail.manual_rates_applied && Object.keys(detail.manual_rates_applied).length > 0 && (
                  <p><strong className="text-foreground">Manual rates applied:</strong> {Object.entries(detail.manual_rates_applied).map(([ccy, rate]) => `${ccy} ${rate}`).join(', ')}</p>
                )}
                {detail.exchange_rates_detected && Object.keys(detail.exchange_rates_detected).length > 0 && (
                  <>
                    <p className="font-semibold text-foreground pt-1">Exchange rates used by account:</p>
                    {Object.entries(detail.exchange_rates_detected).slice(0, 8).map(([key, rate]) => (
                      <p key={key}>{key.replace('||', ' / ')}: <strong>{rate}</strong></p>
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
            <AlertCircle className="w-4 h-4 shrink-0" />
            {message}
          </div>
        )}
      </form>

      {/* Julius Baer PDF Import */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Julius Baer PDF Import</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a Julius Baer monthly valuation PDF. Holdings are extracted automatically and stored as USD values, then converted to ZAR using your supplied rate.
        </p>
        <form onSubmit={handleJbSubmit} className="bg-white border rounded-lg p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Upload Month</Label>
            <Input type="month" value={jbMonth} onChange={e => setJbMonth(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Julius Baer PDF (.pdf)</Label>
            <Input type="file" accept=".pdf" onChange={e => setJbFile(e.target.files?.[0] || null)} required />
          </div>
          <div className="space-y-1.5">
            <Label>USD → ZAR Exchange Rate</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 18.50"
                value={jbRate}
                onChange={e => setJbRate(e.target.value)}
                className="max-w-[160px]"
                required
              />
              <span className="text-sm text-muted-foreground">ZAR per 1 USD</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={jbReplace} onChange={e => setJbReplace(e.target.checked)} className="rounded border-border" />
            <span>Replace existing Julius Baer data for this month</span>
          </label>
          <Button type="submit" disabled={!jbFile || !jbMonth || !jbRate || jbStatus === 'uploading'} className="w-full gap-2">
            <UploadIcon className="w-4 h-4" />
            {jbStatus === 'uploading' ? 'Extracting & Importing...' : 'Upload & Import PDF'}
          </Button>
          {jbStatus === 'success' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {jbMessage}
              </div>
              {jbDetail && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-1">
                  <p><strong className="text-foreground">Portfolio:</strong> {jbDetail.portfolio_no}</p>
                  <p><strong className="text-foreground">Account code:</strong> {jbDetail.account_code}</p>
                  <p><strong className="text-foreground">USD/ZAR rate used:</strong> {jbDetail.exchange_rate_used}</p>
                  {jbDetail.holdings_extracted?.length > 0 && (
                    <>
                      <p className="font-semibold text-foreground pt-1">Holdings imported:</p>
                      {jbDetail.holdings_extracted.map((h, i) => (
                        <p key={i}>{h.instrument} — USD {h.usd_value?.toLocaleString()} → ZAR {Math.round(h.zar_value)?.toLocaleString()}</p>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {jbStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {jbMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}