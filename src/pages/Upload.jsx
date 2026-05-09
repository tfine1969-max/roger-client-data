import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload as UploadIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Upload() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [status, setStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadMonth) return;

    setStatus('uploading');
    setMessage('Uploading file…');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  portfolio_name: { type: 'string' },
                  account_code: { type: 'string' },
                  identity_no: { type: 'string' },
                  platform: { type: 'string' },
                  investment_name: { type: 'string' },
                  currency: { type: 'string' },
                  month_end_market_value: { type: 'number' },
                },
              },
            },
          },
        },
      });

      if (result.status !== 'success') throw new Error(result.details || 'Extraction failed');

      const rows = result.output?.rows || [];

      // Create MonthlyUpload record
      const upload = await base44.entities.MonthlyUpload.create({
        upload_month: uploadMonth,
        file_name: file.name,
        upload_date: new Date().toISOString(),
        uploaded_by: (await base44.auth.me())?.email || 'unknown',
        total_rows: rows.length,
        rows_imported: rows.length,
        rows_skipped: 0,
        import_status: 'Imported',
      });

      // Bulk create valuation records
      if (rows.length > 0) {
        await base44.entities.PortfolioValuation.bulkCreate(
          rows.map(r => ({
            ...r,
            upload_month: uploadMonth,
            monthly_upload_id: upload.id,
            zar_value: r.month_end_market_value,
            original_currency_value: r.month_end_market_value,
            conversion_status: r.currency === 'ZAR' ? 'ZAR Base Currency' : 'Manual Rate Required',
            exchange_rate_to_zar: r.currency === 'ZAR' ? 1 : null,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });

      setStatus('success');
      setMessage(`Successfully imported ${rows.length} rows for ${uploadMonth}.`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Monthly Data</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a spreadsheet to import portfolio valuations for a given month.</p>
      </div>

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
          <Label>Spreadsheet File</Label>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        <Button type="submit" disabled={!file || !uploadMonth || status === 'uploading'} className="w-full gap-2">
          <UploadIcon className="w-4 h-4" />
          {status === 'uploading' ? 'Uploading…' : 'Upload'}
        </Button>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {message}
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