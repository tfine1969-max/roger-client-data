import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const toneMap = {
  blue: {
    accent: 'bg-ocean',
    header: 'bg-slate-50/90',
  },
  teal: {
    accent: 'bg-teal',
    header: 'bg-teal/5',
  },
  navy: {
    accent: 'bg-navy',
    header: 'bg-navy/5',
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
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className={cn('flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5', palette.header)}>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-ocean">{eyebrow}</p>
          )}
          <h3 className="text-sm font-semibold uppercase tracking-[.08em] text-navy">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {badge && (
          <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-white text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
            {badge}
          </Badge>
        )}
      </div>
      <div className="px-4 py-4 sm:px-5">
        {children}
      </div>
      <div className={cn('h-1 w-full', palette.accent)} />
    </section>
  );
}
