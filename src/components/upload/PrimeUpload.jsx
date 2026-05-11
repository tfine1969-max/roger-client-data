import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatMonth } from '@/lib/valuation-utils';

export default function PrimeUpload({ onImported }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;
    setStatus('uploading');
    setMessage('Uploading file...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMessage('Processing...');
      const res = await base44.functions.invoke('importPrimeFile', {
        file_url,
        upload_month: uploadMonth,
        replace_existing: replaceExisting,
      });
      if (!res.data.success) throw new Error(res.data.error || 'Import failed');
      setStatus('success');
      setMessage(`Imported ${res.data.rows_imported} rows for ${formatMonth(uploadMonth)}.`);
      queryClient.invalidateQueries({ queryKey: ['primeHoldings'] });
      if (onImported) onImported();
      setFile(null);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a Prime Investments Holdings Excel file (.xlsx) to import monthly holdings data.
        The file should contain an <strong>Investor</strong>, <strong>Account number</strong>, and <strong>Instrument name</strong> column.
      </p>
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
          <Label>Prime Holdings File (.xlsx)</Label>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] || null)}
            required
          />
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
    </div>
  );
}