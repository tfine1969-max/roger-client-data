import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ReplacementBlock({ block, index, onUpdate, onDelete, investments = [] }) {
  return (
    <div className="border border-ocean/30 rounded-sm p-2.5 bg-ocean/5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[9px] font-bold text-ocean uppercase tracking-wider">Replacement {index + 1}</h3>
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="p-0.5 text-muted-foreground hover:text-danger transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-0.5">Existing Product Provider</label>
        <Input
          type="text"
          value={block.existing_product_provider || ''}
          onChange={e => onUpdate(index, 'existing_product_provider', e.target.value)}
          placeholder="e.g. Discovery, Momentum"
          className="h-7 text-xs rounded-sm"
        />
      </div>
      <div>
        <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-0.5">Existing Product / Policy</label>
        <Input
          type="text"
          value={block.existing_product_type || ''}
          onChange={e => onUpdate(index, 'existing_product_type', e.target.value)}
          placeholder="e.g. Life Policy"
          className="h-7 text-xs rounded-sm"
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-0.5">Policy / Account Number (Optional)</label>
        <Input
          type="text"
          value={block.existing_policy_number || ''}
          onChange={e => onUpdate(index, 'existing_policy_number', e.target.value)}
          placeholder="e.g. POL-2024-12345"
          className="h-7 text-xs rounded-sm"
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-0.5">New Product Replacing This</label>
        <Select
          value={block.replacing_investment_id || ''}
          onValueChange={(val) => {
            const inv = investments.find(i => i.id === val);
            if (inv) {
              const label = `${inv.provider}${inv.product_type ? ` — ${inv.product_type}` : ''}`;
              onUpdate(index, 'replacing_investment_id', val);
              onUpdate(index, 'replacing_investment_label', label);
            }
          }}
        >
          <SelectTrigger className="h-7 text-xs rounded-sm">
            <SelectValue placeholder="Select investment" />
          </SelectTrigger>
          <SelectContent>
            {investments.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2">No investments added yet</div>
            ) : (
              investments.map(inv => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.provider}{inv.product_type ? ` — ${inv.product_type}` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
        <div className="col-span-2">
          <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-0.5">Reason for Replacement *</label>
          <Textarea
            value={block.replacement_reason || ''}
            onChange={e => onUpdate(index, 'replacement_reason', e.target.value)}
            placeholder="Why is this in the client's best interest?"
            className="min-h-[48px] text-xs rounded-sm"
          />
        </div>
        <div>
          <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-1">Surrender Penalties Disclosed *</label>
          <div className="flex gap-1.5">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => onUpdate(index, 'penalties_disclosed', opt === 'Yes')}
                className={`flex-1 px-2.5 h-7 text-xs font-medium border rounded-sm transition-all ${
                  block.penalties_disclosed === (opt === 'Yes')
                    ? 'bg-navy text-white border-navy'
                    : 'bg-card text-navy border-border hover:border-navy'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-1">Waiting Periods Disclosed</label>
          <div className="flex gap-1.5">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => onUpdate(index, 'waiting_periods_disclosed', opt === 'Yes')}
                className={`flex-1 px-2.5 h-7 text-xs font-medium border rounded-sm transition-all ${
                  block.waiting_periods_disclosed === (opt === 'Yes')
                    ? 'bg-navy text-white border-navy'
                    : 'bg-card text-navy border-border hover:border-navy'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductReplacement({ data, onFieldChange, investments = [] }) {
  const isReplacement = data.is_replacement || false;
  const replacements = data.replacement_products || [];

  const handleToggle = (value) => {
    onFieldChange('is_replacement', value);
    if (!value) {
      onFieldChange('replacement_products', []);
    }
  };

  const handleAddBlock = () => {
    const newBlock = {
      existing_product_provider: '',
      existing_product_type: '',
      existing_policy_number: '',
      replacement_reason: '',
      penalties_disclosed: null,
      waiting_periods_disclosed: null,
    };
    onFieldChange('replacement_products', [...replacements, newBlock]);
  };

  const handleUpdateBlock = (index, field, value) => {
    const updated = [...replacements];
    updated[index] = { ...updated[index], [field]: value };
    onFieldChange('replacement_products', updated);
  };

  const handleDeleteBlock = (index) => {
    const updated = replacements.filter((_, i) => i !== index);
    onFieldChange('replacement_products', updated);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h2 className="text-[9px] font-semibold tracking-wider uppercase text-navy mb-2">Product Replacement</h2>

      {/* Toggle */}
      <div className="mb-3">
        <label className="text-[9px] font-semibold text-navy uppercase tracking-wider block mb-1.5">
          Does this advice involve the replacement of an existing financial product?
        </label>
        <div className="flex gap-1.5">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => handleToggle(opt === 'Yes')}
              className={`px-3.5 h-8 text-xs font-medium border rounded-sm transition-all ${
                isReplacement === (opt === 'Yes')
                  ? 'bg-navy text-white border-navy'
                  : 'bg-card text-navy border-border hover:border-navy'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {!isReplacement ? (
        <p className="text-[9px] text-muted-foreground italic">No existing products are being replaced in this recommendation.</p>
      ) : (
        <div className="space-y-2">
          {replacements.map((block, idx) => (
            <ReplacementBlock
              key={idx}
              block={block}
              index={idx}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              investments={investments}
            />
          ))}

          <button
            type="button"
            onClick={handleAddBlock}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-ocean text-ocean text-[10px] font-medium rounded-sm hover:bg-ocean/5 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Replacement
          </button>
        </div>
      )}
    </div>
  );
}
