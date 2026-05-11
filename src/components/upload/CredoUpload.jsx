import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { formatMonth } from '@/lib/valuation-utils';
import DeleteMonthData from './DeleteMonthData';

const LAST_UPLOAD_KEY = 'credo_last_upload';

export default function CredoUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth || !rate) return;
    setStatus('uploading');
    setMessage('Uploading file...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMessage('Extracting holdings...');
      const res = await base44.functions.invoke('importCredoPdf', {
        file_url,
        upload_month: uploadMonth,
        exchange_rate: parseFloat(rate),
      });
      if (!res.data.success) throw new Error(res.data.error || 'Import failed');

      const info = {
        file_name: file.name,
        upload_month: uploadMonth,
        rows_imported: res.data.rows_imported,
        client_name: res.data.client_name,
        uploaded_at: new Date().toISOString(),
      };
      localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(info));
      setLastUpload(info);

      setStatus('success');
      setMessage(`Imported ${res.data.rows_imported} holdings for ${formatMonth(uploadMonth)}.`);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      if (onImported) onImported();
      setFile(null);
      setRate('');
      document.getElementById('credo-file-input').value = '';
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a Credo valuation PDF to import monthly holdings. Enter the USD → ZAR exchange rate for that month.
      </p>

      {lastUpload && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground">Last uploaded file</p>
            <p><span className="font-medium">{lastUpload.file_name}</span> · {formatMonth(lastUpload.upload_month)} · {lastUpload.rows_imported} holdings</p>
            <p>{lastUpload.client_name && `Client: ${lastUpload.client_name} · `}{new Date(lastUpload.uploaded_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Upload Month</Label>
            <Input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>USD → ZAR Exchange Rate</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g. 18.50"
                value={rate}
                onChange={e => setRate(e.target.value)}
                required
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">ZAR / USD</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Credo Valuation PDF</Label>
          <Input
            id="credo-file-input"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
        </div>

        <Button
          type="submit"
          disabled={!file || !uploadMonth || !rate || status === 'uploading'}
          className="w-full gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing...' : 'Upload & Extract'}
        </Button>

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
      <DeleteMonthData provider="credo" />
    </div>
  );
}