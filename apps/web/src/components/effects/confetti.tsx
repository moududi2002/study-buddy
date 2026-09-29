// ============================================================
// Path: apps/web/src/components/effects/confetti.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Piece {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  delay: number;
  size: number;
  shape: 'circle' | 'square' | 'emoji';
  emoji?: string;
}

const COLORS = ['#A78BFA', '#F9A8D4', '#FDBA74', '#6EE7B7', '#FBBF24', '#F472B6'];
const EMOJIS = ['⭐', '💜', '🎉', '✨', '🌟', '💖', '🏆'];

export function Confetti({ active, duration = 2500 }: { active: boolean; duration?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!active) return;
    const count = 40;
    const generated: Piece[] = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60, // start vw percentage 20-80
      y: 20 + Math.random() * 30, // start vh 20-50
      rotate: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.3,
      size: 8 + Math.random() * 10,
      shape: Math.random() > 0.6 ? 'emoji' : Math.random() > 0.5 ? 'circle' : 'square',
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    }));
    setPieces(generated);

    const timer = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {pieces.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                left: `${p.x}vw`,
                top: `${p.y}vh`,
                opacity: 1,
                scale: 0.5,
                rotate: p.rotate,
              }}
              animate={{
                left: `${p.x + (Math.random() - 0.5) * 40}vw`,
                top: `${p.y + 60 + Math.random() * 30}vh`,
                opacity: 0,
                scale: 1,
                rotate: p.rotate + 720,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.8,
                delay: p.delay,
                ease: 'easeOut',
              }}
              className="absolute"
              style={{
                width: p.shape === 'emoji' ? 'auto' : p.size,
                height: p.shape === 'emoji' ? 'auto' : p.size,
                fontSize: p.shape === 'emoji' ? p.size * 2 : undefined,
              }}
            >
              {p.shape === 'emoji' ? (
                <span>{p.emoji}</span>
              ) : (
                <div
                  className={p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: p.color,
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}