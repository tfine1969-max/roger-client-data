import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TYPES = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'mutual_funds', label: 'Mutual Funds' },
  { value: 'etfs', label: 'ETFs' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export default function AddInvestmentDialog({ clientId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'stocks', initial_value: '', current_value: '', currency: 'USD'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.Investment.create({
      ...form,
      client_id: clientId,
      initial_value: parseFloat(form.initial_value),
      current_value: parseFloat(form.current_value || form.initial_value),
    });
    setForm({ name: '', type: 'stocks', initial_value: '', current_value: '', currency: 'USD' });
    setOpen(false);
    setLoading(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> Add Investment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Investment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Investment Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apple Stock" required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Initial Value *</Label>
              <Input type="number" step="0.01" min="0" value={form.initial_value} onChange={e => setForm({ ...form, initial_value: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Current Value</Label>
              <Input type="number" step="0.01" min="0" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} placeholder="Same as initial" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.name || !form.initial_value}>
            {loading ? 'Creating...' : 'Create Investment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}