import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const toneMap = {
  blue: {
    accent: 'bg-ocean',
    header: 'bg-slate-50/90',
    title: 'text-navy',
  },
  teal: {
    accent: 'bg-teal',
    header: 'bg-teal/5',
    title: 'text-navy',
  },
  navy: {
    accent: 'bg-navy',
    header: 'bg-navy/5',
    title: 'text-navy',
  },
};

export default function SectionBlock({
  eyebrow,
  title,
  description,
  badge,
  tone = 'blue',
  className,
  children,
}) {
  const palette = toneMap[tone] || toneMap.blue;

  return (
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]', className)}>
      <div className={cn('flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5', palette.header)}>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-ocean leading-none mb-0.5">{eyebrow}</p>
          )}
          <h3 className={cn('text-sm font-bold uppercase tracking-[.08em]', palette.title)}>
            {title}
          </h3>
        </div>
        {badge && (
          <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-white px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            {badge}
          </Badge>
        )}
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
      <div className={cn('h-0.5 w-full', palette.accent)} />
    </section>
  );
}
