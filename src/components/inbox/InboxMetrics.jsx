import React from 'react';

export default function InboxMetrics({ proposals, activeFilter, onFilter }) {
  const metrics = [
    {
      value: proposals.filter(p => p.status === 'new' || p.status === 'Pending Review').length,
      label: 'Awaiting review',
      color: 'text-navy',
      filter: 'new',
    },
    {
      value: proposals.filter(p => p.status === 'in_progress' || p.status === 'signed').length,
      label: 'In progress',
      color: 'text-gold',
      filter: 'in_progress',
    },
    {
      value: proposals.filter(p => p.status === 'sent' || p.status === 'client_signed').length,
      label: 'Sent',
      color: 'text-forest',
      filter: 'sent',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {metrics.map((m) => {
        const isActive = activeFilter === m.filter;
        return (
          <button
            key={m.filter}
            onClick={() => onFilter(isActive ? null : m.filter)}
            className={`bg-card border p-4 px-5 text-center transition-colors w-full ${
              isActive ? 'border-navy ring-1 ring-navy' : 'border-border hover:border-navy/40'
            }`}
          >
            <div className={`text-2xl font-medium font-lora ${m.color}`}>{m.value}</div>
            <div className="text-[9px] font-medium tracking-[.12em] uppercase text-muted-foreground mt-1">
              {m.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}