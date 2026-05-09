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
    <section className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]', className)}>
      <div className={cn('flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6', palette.header)}>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-ocean">{eyebrow}</p>
          )}
          <h3 className={cn('text-[15px] sm:text-[16px] font-semibold uppercase tracking-[.1em]', palette.title)}>
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {badge && (
          <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground shadow-sm">
            {badge}
          </Badge>
        )}
      </div>
      <div className="px-5 py-5 sm:px-6">
        {children}
      </div>
      <div className={cn('h-1 w-full', palette.accent)} />
    </section>
  );
}
