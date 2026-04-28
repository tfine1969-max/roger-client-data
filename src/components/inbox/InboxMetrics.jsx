import React from 'react';

export const STATUS_MAP = {
  'AWAITING REVIEW': ['Submitted', 'Awaiting Review'],
  'IN PROGRESS':     ['Draft', 'In Progress', 'PDF Ready', 'PDF READY', 'new', 'in_progress', 'Pending Review'],
  'SENT':            ['Sent', 'Sent for Signature', 'Awaiting Client Signature', 'sent'],
  'FINALISED':       ['Signed', 'Completed', 'Finalised', 'signed', 'client_signed'],
};

const getCount = (proposals, category) =>
  proposals.filter(p =>
    STATUS_MAP[category].map(s => s.toLowerCase()).includes((p.status || '').toLowerCase())
  ).length;

const METRICS = [
  { key: 'AWAITING REVIEW', label: 'Awaiting Review', color: 'text-navy' },
  { key: 'IN PROGRESS',     label: 'In Progress',     color: 'text-gold' },
  { key: 'SENT',            label: 'Sent',             color: 'text-ocean' },
  { key: 'FINALISED',       label: 'Finalised',        color: 'text-forest' },
];

export default function InboxMetrics({ proposals, activeFilter, onFilter }) {
  return (
    <div className="grid grid-cols-4 gap-2.5 mb-5">
      {METRICS.map((m) => {
        const isActive = activeFilter === m.key;
        const count = getCount(proposals, m.key);
        return (
          <button
            key={m.key}
            onClick={() => onFilter(isActive ? null : m.key)}
            className={`bg-card border rounded-sm transition-colors w-full py-5 flex flex-col items-center justify-center gap-1 ${
              isActive ? 'border-navy ring-1 ring-navy bg-secondary/40' : 'border-border hover:border-navy/40'
            }`}
          >
            <div className={`text-3xl font-medium ${m.color}`}>{count}</div>
            <div className="text-[9px] font-semibold tracking-[.14em] uppercase text-muted-foreground">
              {m.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}