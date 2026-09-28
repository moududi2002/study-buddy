// ============================================================
// Path: apps/web/src/components/dashboard/stat-card.tsx
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  color?: 'primary' | 'pink' | 'peach' | 'mint';
  delay?: number;
}

const COLOR_MAP = {
  primary: { bg: 'bg-lavender-100', text: 'text-primary-500' },
  pink: { bg: 'bg-pink-soft-100', text: 'text-pink-soft-400' },
  peach: { bg: 'bg-peach-100', text: 'text-peach-400' },
  mint: { bg: 'bg-mint-100', text: 'text-mint-500' },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'primary',
  delay = 0,
}: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card-soft card-soft-hover p-4"
    >
      <div className={cn('inline-flex rounded-xl p-2 mb-2', c.bg, c.text)}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-primary-500 font-medium">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-primary-800 mt-0.5">{value}</p>
      {sublabel && <p className="text-[11px] text-primary-400 mt-0.5">{sublabel}</p>}
    </motion.div>
  );
}