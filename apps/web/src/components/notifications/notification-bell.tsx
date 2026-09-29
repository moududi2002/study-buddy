// ============================================================
// Path: apps/web/src/components/notifications/notification-bell.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { toBnDigits } from '@/lib/bn';

export function NotificationBell() {
  const [count, setCount] = useState(0);

  const load = async () => {
    try {
      const res = await api.get<{ success: true; data: { count: number } }>(
        '/notifications/unread-count',
      );
      setCount(res.data.count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative h-9 w-9 flex items-center justify-center rounded-full text-primary-500 hover:bg-lavender-100"
      title="নোটিফিকেশন"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-soft-400 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
          {count > 99 ? '৯৯+' : toBnDigits(count)}
        </span>
      )}
    </Link>
  );
}