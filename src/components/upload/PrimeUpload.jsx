import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { formatMonth } from '@/lib/valuation-utils';
import DeleteMonthData from './DeleteMonthData';
import ProviderUploadSummary from './ProviderUploadSummary';
import UploadProgressSummary from './UploadProgressSummary';

const LAST_UPLOAD_KEY = 'prime_last_upload';

function uploadErrorMessage(err, fallback = 'Upload failed') {
  const data = err?.response?.data || err?.data || err?.cause?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (err?.response?.status) return `${err.response.status}: ${err.message || fallback}`;
  return err?.message || fallback;
}

export default function PrimeUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ clients: 0, holdings: 0, aum: 0 });
  const [lastUpload, setLastUpload] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_UPLOAD_KEY);
    if (stored) {
      try { setLastUpload(JSON.parse(stored)); } catch {}
    }
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setStatus(null);
    setMessage('');
    setProgress({ clients: 0, holdings: 0, aum: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;
    setStatus('uploading');
    setMessage('Uploading file...');
    setProgress({ clients: 0, holdings: 0, aum: 0 });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMessage('Processing...');
      const res = await base44.functions.invoke('importPrimeFile', {
        file_url,
        upload_month: uploadMonth,
        replace_existing: replaceExisting,
      });
      if (!res.data.success) throw new Error(res.data.error || 'Import failed');
      setMessage('Refreshing Prime AUM...');
      const rows = await base44.entities.PortfolioValuation.filter({ upload_month: uploadMonth, platform: 'Prime' }, '-created_date', 20000);
      setProgress({
        clients: new Set(rows.map(row => row.client_id || row.account_code || row.portfolio_name).filter(Boolean)).size,
        holdings: res.data.rows_imported || rows.length,
        aum: rows.reduce((sum, row) => sum + (Number(row.zar_value ?? row.month_end_market_value) || 0), 0),
      });
      
      const info = {
        file_name: file.name,
        upload_month: uploadMonth,
        rows_imported: res.data.rows_imported,
        uploaded_at: new Date().toISOString(),
      };
      localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(info));
      setLastUpload(info);

      setStatus('success');
      setMessage(`Imported ${res.data.rows_imported} rows for ${formatMonth(uploadMonth)}.`);
      queryClient.invalidateQueries({ queryKey: ['primeHoldings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      queryClient.invalidateQueries({ queryKey: ['providerUploadSummary'] });
      if (onImported) await onImported(uploadMonth);
      setFile(null);
      // reset file input
      document.getElementById('prime-file-input').value = '';
    } catch (err) {
      setStatus('error');
      setMessage(uploadErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a Prime Investments Holdings Excel file (.xlsx) to import monthly holdings data.
      </p>

      {/* Last upload info */}
      {lastUpload && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground">Last uploaded file</p>
            <p><span className="font-medium">{lastUpload.file_name}</span> · {formatMonth(lastUpload.upload_month)} · {lastUpload.rows_imported} rows</p>
            <p>{new Date(lastUpload.uploaded_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_280px]">
          <div className="space-y-1.5">
            <Label>Upload Month</Label>
            <Input
              type="month"
              value={uploadMonth}
              onChange={e => setUploadMonth(e.target.value)}
              required
            />
          </div>
          <ProviderUploadSummary provider="Prime" uploadMonth={uploadMonth} />
        </div>
        <div className="space-y-1.5">
          <Label>Prime Holdings File (.xlsx)</Label>
          <Input
            id="prime-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            required
          />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
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
        <Button
          type="submit"
          disabled={!file || !uploadMonth || status === 'uploading'}
          className="w-full gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing...' : 'Upload & Import'}
        </Button>

        <UploadProgressSummary
          active={status === 'uploading'}
          processed={status === 'success' ? 1 : 0}
          total={file ? 1 : 0}
          clients={progress.clients}
          holdings={progress.holdings}
          aum={progress.aum}
          message={message}
        />

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
      </form>
      <DeleteMonthData provider="prime" />
    </div>
  );
}
