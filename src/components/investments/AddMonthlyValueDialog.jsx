import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function AddMonthlyValueDialog({ investment, existingValue, onSaved }) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    month: existingValue?.month || currentMonth,
    market_value: existingValue?.market_value?.toString() || '',
    number_of_units: existingValue?.number_of_units?.toString() || '',
    unit_price: existingValue?.unit_price?.toString() || '',
    exchange_rate: existingValue?.exchange_rate?.toString() || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      investment_id: investment.id,
      client_id: investment.client_id,
      month: form.month,
      market_value: parseFloat(form.market_value),
      number_of_units: form.number_of_units ? parseFloat(form.number_of_units) : undefined,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
      currency: investment.currency,
      exchange_rate: form.exchange_rate ? parseFloat(form.exchange_rate) : undefined,
    };
    if (existingValue) {
      await base44.entities.MonthlyValue.update(existingValue.id, data);
    } else {
      await base44.entities.MonthlyValue.create(data);
    }
    setOpen(false);
    setLoading(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({
        month: existingValue?.month || currentMonth,
        market_value: existingValue?.market_value?.toString() || '',
        number_of_units: existingValue?.number_of_units?.toString() || '',
        unit_price: existingValue?.unit_price?.toString() || '',
        exchange_rate: existingValue?.exchange_rate?.toString() || '',
      });
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> {existingValue ? 'Edit' : 'Add Value'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{investment.investment_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Month *</Label>
            <Input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Market Value ({investment.currency}) *</Label>
            <Input type="number" step="0.01" value={form.market_value} onChange={e => setForm({ ...form, market_value: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Units</Label>
              <Input type="number" step="0.0001" value={form.number_of_units} onChange={e => setForm({ ...form, number_of_units: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price</Label>
              <Input type="number" step="0.000001" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Exchange Rate (to ZAR)</Label>
            <Input type="number" step="0.0001" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.market_value}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}