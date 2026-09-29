// ============================================================
// Path: apps/web/src/components/effects/level-up-modal.tsx
// ============================================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toBnDigits } from '@/lib/bn';

export function LevelUpModal({
  open,
  level,
  onClose,
}: {
  open: boolean;
  level: number;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary-900/30 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[95] w-full max-w-sm"
          >
            <div className="card-soft p-8 text-center relative overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-7xl mb-3"
              >
                🏆
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles size={18} className="text-primary-500" />
                  <span className="text-sm font-semibold text-primary-500">
                    লেভেল আপ!
                  </span>
                  <Sparkles size={18} className="text-primary-500" />
                </div>
                <h2 className="text-3xl font-bold text-gradient mb-2">
                  লেভেল {toBnDigits(level)}
                </h2>
                <p className="text-sm text-primary-600 mb-1">
                  অভিনন্দন! তুমি পরের লেভেলে পৌঁছেছো 🎉
                </p>
                <p className="text-xs text-primary-400 mb-5">
                  এভাবেই এগিয়ে যাও — Study Buddy পাশে আছে! 🐱
                </p>
                <div className="flex justify-center gap-1 mb-5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    >
                      <Star
                        size={22}
                        className="text-star"
                        fill="currentColor"
                      />
                    </motion.div>
                  ))}
                </div>
                <Button onClick={onClose} className="w-full">
                  দারুণ! এগিয়ে যাই 🚀
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}