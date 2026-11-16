// ============================================================
// Path: apps/web/src/components/charts/progress-ring.tsx
// ============================================================


'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  value: number;
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
  const gradientId = useId();

  const percent = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference * (1 - percent / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="পড়াশোনার লক্ষ্যের অগ্রগতি"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="55%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#F472B6" />
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
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 0.9,
            ease: 'easeOut',
          }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {emoji && (
          <span className="mb-0.5 text-2xl">
            {emoji}
          </span>
        )}

        {label && (
          <span className="text-2xl font-extrabold tracking-tight text-primary-800">
            {label}
          </span>
        )}

        {sublabel && (
          <span className="mt-1 text-xs text-primary-500">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
