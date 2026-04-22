import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateRef, NEEDS_OPTIONS } from '@/lib/constants';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export default function NewProposalModal({ open, onClose, advisorKey, advisorName }) {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_mobile: '',
    needs_identified: '', needs_array: [], notes: ''
  });

  const toggleNeed = (id) => {
    const current = form.needs_array || [];
    const updated = current.includes(id) ? current.filter(n => n !== id) : [...current, id];
    const labels = updated.map(n => NEEDS_OPTIONS.find(o => o.id === n)?.label).filter(Boolean);
    setForm(prev => ({ ...prev, needs_array: updated, needs_identified: labels.join(', ') }));
  };
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
      setForm({ client_name: '', client_email: '', client_mobile: '', needs_identified: '', needs_array: [], notes: '' });
      navigate(`/proposal/${created.id}`);
    }
  });

  const handleCreate = () => {
    if (!form.client_name.trim()) return;
    createMutation.mutate({
      ...form,
      reference: generateRef(),
      status: 'new',
      phase: 'client_details',
      advisor_key: advisorKey,
      advisor_name: advisorName
    });
  };

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] p-0 gap-0 rounded-none">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted">
          <DialogTitle className="text-sm font-medium text-navy tracking-wide">
            New proposal — client details
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">
                Client full name <span className="text-ocean">*</span>
              </Label>
              <Input value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Full name" className="rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Email address</Label>
              <Input type="email" value={form.client_email} onChange={e => update('client_email', e.target.value)} placeholder="client@email.com" className="rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Mobile number</Label>
              <Input type="tel" value={form.client_mobile} onChange={e => update('client_mobile', e.target.value)} placeholder="+27" className="rounded-sm" />
            </div>

          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Needs identified</Label>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {NEEDS_OPTIONS.map(opt => {
                const checked = (form.needs_array || []).includes(opt.id);
                return (
                  <label key={opt.id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${checked ? 'border-navy bg-navy/5' : 'border-border bg-card hover:border-ocean/50'}`}>
                    <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-navy border-navy' : 'border-border'}`}>
                      {checked && <div className="w-2 h-2 bg-white" />}
                    </div>
                    <span className="text-[13px] font-medium text-navy">{opt.label}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleNeed(opt.id)} className="sr-only" />
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold tracking-[.06em] uppercase text-navy">Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional context..." className="rounded-sm min-h-[70px]" />
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full bg-gold text-white py-3.5 text-[13px] font-medium tracking-[.08em] uppercase hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create proposal →'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}