import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PROVIDER_LABELS = {
  'monthly': 'Monthly Workbook',
  'julius-baer': 'Julius Baer',
  'prime': 'Prime Investments',
  'credo': 'Credo',
  'gryphon': 'Gryphon',
  'northstar': 'Northstar',
  'peresec': 'Peresec',
  'prescient': 'Prescient',
};

export default function DeleteMonthData({ provider }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState(null); // null | 'deleting' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState(null);

  const providerLabel = PROVIDER_LABELS[provider] || provider;

  const handleDelete = async () => {
    if (!month || !confirm) return;
    setStatus('deleting');
    setMessage('Deleting...');
    setDetail(null);
    try {
      const res = await base44.functions.invoke('deleteMonthData', {
        provider,
        upload_month: month,
      });
      const result = res.data;
      if (!result.success) throw new Error(result.error || 'Delete failed');
      queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyUploads'] });
      queryClient.invalidateQueries({ queryKey: ['primeHoldings'] });
      setStatus('success');
      setMessage(`All ${providerLabel} data for ${month} has been deleted.`);
      setDetail(result);
      setConfirm(false);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Delete failed');
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">Delete Data</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Permanently delete all <strong>{providerLabel}</strong> data for a specific month. This cannot be undone.
      </p>

      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Month to delete</Label>
          <Input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setStatus(null); setConfirm(false); }}
            className="max-w-xs h-9"
          />
        </div>

        {month && (
          <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirm}
              onChange={e => setConfirm(e.target.checked)}
              className="mt-0.5 rounded border-destructive"
            />
            <span className="text-destructive font-medium">
              I confirm: permanently delete all <strong>{providerLabel}</strong> records for <strong>{month}</strong>
            </span>
          </label>
        )}

        <Button
          variant="destructive"
          size="sm"
          disabled={!month || !confirm || status === 'deleting'}
          onClick={handleDelete}
          className="gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {status === 'deleting' ? 'Deleting...' : 'Delete All Data for This Month'}
        </Button>

        {status === 'success' && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{message}</p>
              {detail && (
                <p className="text-xs text-green-600 mt-1">
                  {detail.portfolio_valuations_deleted} valuation records deleted
                  {detail.prime_holdings_deleted > 0 && `, ${detail.prime_holdings_deleted} Prime holdings deleted`}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {message}
          </div>
        )}
      </div>
    </div>
  );
}