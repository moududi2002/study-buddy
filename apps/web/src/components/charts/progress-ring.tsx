// ============================================================
// Path: apps/web/src/components/charts/progress-ring.tsx
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { toBnDigits } from '@/lib/bn';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  emoji?: string;
}

export function ProgressRing({
  value,
  size = 140,
  strokeWidth = 12,
  label,
  sublabel,
  emoji,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#F9A8D4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EDE9FE"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {emoji && <span className="text-2xl mb-0.5">{emoji}</span>}
        {label && <span className="text-2xl font-bold text-primary-800">{label}</span>}
        {sublabel && <span className="text-xs text-primary-500 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}