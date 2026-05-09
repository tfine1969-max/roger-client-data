import React from 'react';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { Loader2 } from 'lucide-react';

/**
 * Wraps a scrollable list with a native-style pull-to-refresh indicator.
 * Usage: <PullToRefreshWrapper onRefresh={fn}>{children}</PullToRefreshWrapper>
 */
export default function PullToRefreshWrapper({ onRefresh, children, className = '' }) {
  const { containerRef, pulling, pullY, refreshing, threshold } = usePullToRefresh(onRefresh);
  const progress = Math.min(pullY / threshold, 1);
  const ready = progress >= 1;

  return (
    <div ref={containerRef} className={`relative overflow-y-auto ${className}`}>
      {/* Pull indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pulling || refreshing ? Math.max(pullY, refreshing ? 44 : 0) : 0 }}
      >
        <div className={`flex flex-col items-center gap-1 transition-opacity ${pulling || refreshing ? 'opacity-100' : 'opacity-0'}`}>
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-ocean animate-spin" />
          ) : (
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${ready ? 'rotate-180' : ''}`}
              style={{ color: ready ? '#1A6494' : '#94a3b8' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {refreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}