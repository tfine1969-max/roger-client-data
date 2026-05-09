import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function UpdateValueDialog({ investment, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [form, setForm] = useState({
    value: investment.current_value?.toString() || '',
    month: currentMonth,
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const newValue = parseFloat(form.value);

    // Create the value update record
    await base44.entities.ValueUpdate.create({
      investment_id: investment.id,
      client_id: investment.client_id,
      value: newValue,
      month: form.month,
      notes: form.notes,
    });

    // Update the investment's current value
    await base44.entities.Investment.update(investment.id, {
      current_value: newValue,
    });

    setOpen(false);
    setLoading(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({ value: investment.current_value?.toString() || '', month: currentMonth, notes: '' });
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Update
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update: {investment.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Value *</Label>
            <Input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Month</Label>
            <Input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.value}>
            {loading ? 'Saving...' : 'Save Update'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}