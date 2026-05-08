import { useEffect, useRef, useState } from 'react';

/**
 * Native-style pull-to-refresh hook.
 * @param {Function} onRefresh - async function to call on pull
 * @param {Object} options
 * @param {number} options.threshold - px to pull before triggering (default 72)
 */
export default function usePullToRefresh(onRefresh, { threshold = 72 } = {}) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current || window;

    const getScrollTop = () => {
      if (containerRef.current) return containerRef.current.scrollTop;
      return window.scrollY || document.documentElement.scrollTop;
    };

    const onTouchStart = (e) => {
      if (getScrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startY.current === null) return;
      if (getScrollTop() > 0) { startY.current = null; return; }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;
      // Dampen the movement
      const y = Math.min(delta * 0.5, threshold * 1.2);
      setPulling(true);
      setPullY(y);
    };

    const onTouchEnd = async () => {
      if (!pulling) return;
      if (pullY >= threshold && !refreshing) {
        setRefreshing(true);
        try { await onRefresh(); } finally { setRefreshing(false); }
      }
      setPulling(false);
      setPullY(0);
      startY.current = null;
    };

    const target = containerRef.current || window;
    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: true });
    target.addEventListener('touchend', onTouchEnd);

    return () => {
      target.removeEventListener('touchstart', onTouchStart);
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('touchend', onTouchEnd);
    };
  }, [pulling, pullY, refreshing, onRefresh, threshold]);

  return { containerRef, pulling, pullY, refreshing, threshold };
}