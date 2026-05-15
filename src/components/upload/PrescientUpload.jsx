import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { formatMonth } from '@/lib/valuation-utils';
import DeleteMonthData from './DeleteMonthData';

const LAST_UPLOAD_KEY = 'prescient_last_upload';

export default function PrescientUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [password, setPassword] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);
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
    setDetail(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth || !password.trim()) return;
    setStatus('uploading');
    setMessage('Uploading Prescient workbook...');
    setDetail(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMessage('Opening encrypted workbook and extracting valuation...');
      const res = await base44.functions.invoke('importPrescientFile', {
        file_url,
        upload_month: uploadMonth,
        password: password.trim(),
        replace_existing: replaceExisting,
      });
      const result = res.data;
      if (!result.success) throw new Error(result.error || 'Prescient import failed');

      const info = {
        file_name: file.name,
        upload_month: uploadMonth,
        rows_imported: result.rows_imported,
        client_name: result.client_name,
        account_code: result.account_code,
        uploaded_at: new Date().toISOString(),
      };
      localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(info));
      setLastUpload(info);

      setStatus('success');
      setMessage(`Imported ${result.rows_imported} Prescient valuation row${result.rows_imported === 1 ? '' : 's'} for ${formatMonth(uploadMonth)}.`);
      setDetail(result);
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      if (onImported) onImported();
      setFile(null);
      const input = document.getElementById('prescient-file-input');
      if (input) input.value = '';
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a password-protected Prescient Daily Valuation &amp; Flows workbook. The import uses the filename for the account and client, then extracts the month-end ZAR valuation.
      </p>

      {lastUpload && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground">Last uploaded Prescient file</p>
            <p>
              <span className="font-medium">{lastUpload.file_name}</span> - {formatMonth(lastUpload.upload_month)} - {lastUpload.rows_imported} rows
            </p>
            {(lastUpload.client_name || lastUpload.account_code) && (
              <p>{lastUpload.client_name} {lastUpload.account_code ? `(${lastUpload.account_code})` : ''}</p>
            )}
            <p>{new Date(lastUpload.uploaded_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
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
          <Label>Prescient Daily Valuation &amp; Flows File (.xlsx)</Label>
          <Input
            id="prescient-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            required
          />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <LockKeyhole className="w-4 h-4" />
            Workbook Password
          </Label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Required for encrypted Prescient workbooks"
            required
          />
          <p className="text-xs text-muted-foreground">The password is only sent to the import function to open this workbook.</p>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={e => setReplaceExisting(e.target.checked)}
            className="rounded border-border"
          />
          <span>Replace existing Prescient data for this account and month</span>
        </label>

        <Button
          type="submit"
          disabled={!file || !uploadMonth || !password.trim() || status === 'uploading'}
          className="w-full gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Processing...' : 'Upload & Extract'}
        </Button>

        {status === 'success' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
            </div>
            {detail && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-1">
                {detail.client_name && <p><strong className="text-foreground">Client:</strong> {detail.client_name}</p>}
                {detail.account_code && <p><strong className="text-foreground">Account:</strong> {detail.account_code}</p>}
                {detail.sheets_imported?.length > 0 && (
                  <p><strong className="text-foreground">Sheets checked:</strong> {detail.sheets_imported.join(', ')}</p>
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

      <DeleteMonthData provider="prescient" />
    </div>
  );
}
