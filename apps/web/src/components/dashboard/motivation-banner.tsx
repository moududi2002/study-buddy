// ============================================================
// Path: apps/web/src/components/dashboard/motivation-banner.tsx
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function MotivationBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl gradient-primary p-5 shadow-soft-lg"
    >
      {/* Floating sparkles */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute right-4 top-3 text-2xl opacity-70"
      >
        ✨
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute right-12 bottom-2 text-xl opacity-60"
      >
        ⭐
      </motion.div>

      <div className="relative flex items-start gap-3">
        <div className="text-4xl shrink-0">🐱</div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-white/90" />
            <span className="text-xs font-semibold text-white/90">আজকের কথা</span>
          </div>
          <p className="text-white font-medium leading-snug text-sm md:text-base">
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}