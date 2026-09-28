// ============================================================
// Path: apps/web/src/components/layout/app-shell.tsx
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  BarChart3,
  Target,
  Trophy,
  User,
  LogOut,
  Flame,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toBnDigits } from '@/lib/bn';
import { cn } from '@/lib/utils';

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

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  const initial = user.fullName?.[0] ?? '🐱';
  const presetEmoji =
    user.avatarUrl?.startsWith('preset:')
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
      {/* Top navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-lavender-200">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🐱</span>
            <span className="font-bold text-lg text-gradient hidden sm:inline">
              Study Buddy
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* streak */}
            <div className="flex items-center gap-1 rounded-full bg-peach-100 px-3 py-1.5 text-sm font-semibold text-peach-400">
              <Flame size={16} />
              {toBnDigits(user.currentStreak)}
            </div>
            {/* xp */}
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1.5 text-sm font-semibold text-primary-700">
              <Sparkles size={16} />
              {toBnDigits(user.xp)} XP
            </div>

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

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
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