// ============================================================
// Path: apps/web/src/components/layout/app-shell.tsx
// (existing file আপডেট — MessageCircle icon যোগ + chat unread badge)
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  BarChart3,
  Target,
  Trophy,
  LogOut,
  Flame,
  Sparkles,
  Users,
  MessageCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toBnDigits } from '@/lib/bn';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSocket } from '@/lib/hooks/use-socket';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'হোম', icon: Home },
  { href: '/tracker', label: 'ট্র্যাকার', icon: BookOpen },
  { href: '/analytics', label: 'রিপোর্ট', icon: BarChart3 },
  { href: '/goals', label: 'লক্ষ্য', icon: Target },
  { href: '/achievements', label: 'ব্যাজ', icon: Trophy },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [chatUnread, setChatUnread] = useState(0);
  const { socket } = useSocket();

  // Load unread chat count
  useEffect(() => {
    const loadUnread = async () => {
      try {
        const res = await api.get<{ success: true; data: Array<{ unreadCount: number }> }>(
          '/chat/conversations',
        );
        const total = res.data.reduce((s, c) => s + c.unreadCount, 0);
        setChatUnread(total);
      } catch {
        /* ignore */
      }
    };
    if (user) loadUnread();
  }, [user, pathname]);

  // Bump on incoming
  useEffect(() => {
    if (!socket) return;
    const onNew = () => setChatUnread((c) => c + 1);
    socket.on('new_message', onNew);
    return () => {
      socket.off('new_message', onNew);
    };
  }, [socket]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  const initial = user.fullName?.[0] ?? '🐱';
  const presetEmoji = user.avatarUrl?.startsWith('preset:')
    ? {
        cat_smile: '😺',
        cat_sleepy: '😴',
        cat_wink: '😸',
        cat_reader: '📖',
        cat_star: '🌟',
        cat_heart: '💖',
        bunny_happy: '🐰',
        bunny_reader: '📚',
      }[user.avatarUrl.replace('preset:', '')] ?? initial
    : initial;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-lavender-200">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🐱</span>
            <span className="font-bold text-lg text-gradient hidden sm:inline">
              Study Buddy
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 rounded-full bg-peach-100 px-3 py-1.5 text-sm font-semibold text-peach-400">
              <Flame size={16} />
              {toBnDigits(user.currentStreak)}
            </div>

            <div className="hidden sm:flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1.5 text-sm font-semibold text-primary-700">
              <Sparkles size={16} />
              {toBnDigits(user.xp)} XP
            </div>

            <Link
              href="/groups"
              className="h-9 w-9 flex items-center justify-center rounded-full text-primary-500 hover:bg-lavender-100"
              title="গ্রুপ"
            >
              <Users size={18} />
            </Link>

            {/* Chat icon with badge */}
            <Link
              href="/chat"
              className="relative h-9 w-9 flex items-center justify-center rounded-full text-primary-500 hover:bg-lavender-100"
              title="চ্যাট"
            >
              <MessageCircle size={18} />
              {chatUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-mint-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {chatUnread > 99 ? '৯৯+' : toBnDigits(chatUnread)}
                </span>
              )}
            </Link>

            <NotificationBell />

            <Link href="/profile">
              <Avatar className="h-9 w-9 cursor-pointer">
                {user.avatarUrl && !user.avatarUrl.startsWith('preset:') && (
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                )}
                <AvatarFallback className="text-lg">{presetEmoji}</AvatarFallback>
              </Avatar>
            </Link>

            <button
              onClick={handleLogout}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-full text-primary-400 hover:bg-lavender-100"
              title="লগআউট"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 backdrop-blur-lg border-t border-lavender-200 pb-safe">
        <div className="mx-auto max-w-md grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 py-2.5"
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl bg-lavender-100"
                  />
                )}
                <item.icon
                  size={20}
                  className={cn(
                    'relative',
                    active ? 'text-primary-500' : 'text-primary-300',
                  )}
                />
                <span
                  className={cn(
                    'relative text-[10px] font-medium',
                    active ? 'text-primary-600' : 'text-primary-400',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}