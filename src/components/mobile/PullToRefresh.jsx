import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const THRESHOLD = 64;
const MAX_PULL = 100;

// Pull-to-refresh nativo (somente mobile). No desktop renderiza os filhos sem alteração.
export default function PullToRefresh({ onRefresh, children }) {
  const isMobile = useIsMobile();
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  if (!isMobile) return children;

  const onTouchStart = (e) => {
    startY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    setPull(delta > 0 && window.scrollY <= 0 ? Math.min(MAX_PULL, delta * 0.5) : 0);
  };
  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } finally { setRefreshing(false); setPull(0); }
    } else {
      setPull(0);
    }
  };

  const ready = pull >= THRESHOLD;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <motion.div
        animate={{ height: pull }}
        transition={{ duration: startY.current != null ? 0 : 0.25 }}
        className="flex items-end justify-center overflow-hidden"
      >
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-md">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
          ) : (
            <ArrowDown className={`h-4 w-4 text-gold transition-transform ${ready ? 'rotate-180' : ''}`} />
          )}
        </div>
      </motion.div>
      {children}
    </div>
  );
}