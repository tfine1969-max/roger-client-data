import React from 'react';

/**
 * Reusable checklist component for selecting recommendation reasons.
 * Renders a list of checkboxes filtered to a specific section_context.
 */
export default function ReasonChecklist({ reasons, selectedIds, onChange, label, required }) {
  const toggle = (id, checked) => {
    const current = selectedIds || [];
    onChange(checked ? [...current, id] : current.filter(x => x !== id));
  };

  if (reasons.length === 0) return null;

  return (
    <div>
      {label && (
        <label className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div className="space-y-1">
        {reasons.map(r => (
          <label key={r.id} className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={(selectedIds || []).includes(r.id)}
              onChange={e => toggle(r.id, e.target.checked)}
              className="mt-0.5 shrink-0 accent-navy"
            />
            <span className="text-[11px] text-foreground leading-snug group-hover:text-navy transition-colors">
              {r.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}