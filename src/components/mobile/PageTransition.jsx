import React from 'react';
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-30%', opacity: dir > 0 ? 1 : 0.6 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-30%' : '100%', opacity: dir > 0 ? 0.6 : 1 })
};

// Animação push/pop horizontal entre rotas (somente mobile). No desktop renderiza a rota direto.
export default function PageTransition() {
  const location = useLocation();
  const navType = useNavigationType();
  const outlet = useOutlet();
  const isMobile = useIsMobile();

  if (!isMobile) return outlet;

  const dir = navType === 'POP' ? -1 : 1;

  return (
    <div className="relative" style={{ overflowX: 'clip' }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={location.pathname}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}