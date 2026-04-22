import React from 'react';

export default function InboxMetrics({ proposals }) {
  const newCount = proposals.filter(p => p.status === 'new').length;
  const inProgress = proposals.filter(p => p.status === 'in_progress' || p.status === 'signed').length;
  const sentCount = proposals.filter(p => p.status === 'sent' || p.status === 'client_signed').length;

  const metrics = [
    { value: newCount, label: 'Awaiting review', color: 'text-navy' },
    { value: inProgress, label: 'In progress', color: 'text-gold' },
    { value: sentCount, label: 'Sent', color: 'text-forest' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {metrics.map((m, i) => (
        <div key={i} className="bg-card border border-border p-4 px-5">
          <div className={`text-2xl font-medium font-lora ${m.color}`}>{m.value}</div>
          <div className="text-[9px] font-medium tracking-[.12em] uppercase text-muted-foreground mt-1">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}