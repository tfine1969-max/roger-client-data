import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import ExchangeRateInputs from '@/components/upload/ExchangeRateInputs';

export default function Upload() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);
  const [detectedCurrencies, setDetectedCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;

    setStatus('uploading');
    setMessage('Uploading file…');
    setDetail(null);

    // Step 1: upload file to get a URL
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setMessage('Processing spreadsheet…');

    // Step 2: call backend function which parses XLSX directly
    const response = await base44.functions.invoke('importMonthlyFile', {
      file_url,
      upload_month: uploadMonth,
      replace_existing: replaceExisting,
      exchange_rates: exchangeRates,
    });

    const result = response.data;
    if (!result.success) throw new Error(result.error || 'Import failed');

    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });

    setStatus('success');
    setMessage(`Successfully imported ${result.rows_imported} rows for ${uploadMonth}.`);
    setDetail(result.exchange_rates_detected);
    setDetectedCurrencies([]);
    setExchangeRates({});
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

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (selectedFile) {
      // Detect currencies in the file by uploading and parsing
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
        const result = await base44.functions.invoke('debugSheetColumns', { file_url });
        const sheetData = result.data;
        
        // Extract unique currencies from the data
        const currencies = new Set();
        Object.values(sheetData).forEach(sheet => {
          if (sheet.data) {
            sheet.data.forEach(row => {
              if (row.Currency) currencies.add(row.Currency);
            });
          }
        });
        
        setDetectedCurrencies(Array.from(currencies).sort());
        setExchangeRates({});
      } catch (err) {
        console.error('Failed to detect currencies:', err);
      }
    } else {
      setDetectedCurrencies([]);
      setExchangeRates({});
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Monthly Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a multi-sheet Excel workbook to import portfolio valuations for a given month.
          Exchange rates are automatically detected from the file.
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

        {detectedCurrencies.length > 0 && (
          <ExchangeRateInputs
            currencies={detectedCurrencies}
            rates={exchangeRates}
            onChange={(currency, value) => setExchangeRates(prev => ({ ...prev, [currency]: value }))}
          />
        )}

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
          {status === 'uploading' ? 'Processing…' : 'Upload & Import'}
        </Button>

        {status === 'success' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {message}
            </div>
            {detail && Object.keys(detail).length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-1">
                <p className="font-semibold text-foreground mb-1">Exchange rates detected:</p>
                {Object.entries(detail).map(([key, rate]) => (
                  <p key={key}>{key.replace('||', ' / ')}: <strong>{rate}</strong></p>
                ))}
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
    </div>
  );
}