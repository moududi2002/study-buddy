// ============================================================
// Path: apps/web/src/app/(app)/friends/[userId]/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Loader2,
  MessageCircle,
  Flame,
  Clock,
  BookOpen,
  Trophy,
  Calendar,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toBnDigits, formatMinutesShort, formatBnDate } from '@/lib/bn';
import { FriendBadge, FriendSummary } from '@/lib/types/friends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { SectionHeader } from '@/components/dashboard/section';
import { StudyLineChart } from '@/components/charts/study-line-chart';

export default function FriendDashboardPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FriendSummary | null>(null);
  const [badges, setBadges] = useState<FriendBadge[]>([]);
  const [trend, setTrend] = useState<Array<{ date: string; minutes: number }>>([]);
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, b, t] = await Promise.all([
          api.get<{ success: true; data: FriendSummary }>(
            `/friends/${params.userId}/summary`,
          ),
          api.get<{ success: true; data: { items: FriendBadge[] } }>(
            `/friends/${params.userId}/badges`,
          ),
          api.get<{ success: true; data: { series: Array<{ date: string; minutes: number }> } }>(
            `/friends/${params.userId}/weekly-trend`,
          ),
        ]);
        setSummary(s.data);
        setBadges(b.data.items);
        setTrend(t.data.series);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'লোড করা যায়নি');
        router.replace('/dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.userId, router]);

  const openChat = async () => {
    if (!summary) return;
    setOpeningChat(true);
    try {
      const res = await api.post<{ success: true; data: { id: string } }>(
        '/chat/conversations',
        { userId: summary.user.id },
      );
      router.push(`/chat/${res.data.id}`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'চ্যাট শুরু করা যায়নি');
    } finally {
      setOpeningChat(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          🐱
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const user = summary.user;
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
      }[user.avatarUrl.replace('preset:', '')] ?? user.fullName[0]
    : user.fullName[0];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700 pl-1"
      >
        <ChevronLeft size={16} />
        ফিরে যাও
      </button>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-soft p-6 flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 text-8xl opacity-10">🐱</div>
        <Avatar className="h-24 w-24 ring-4 ring-lavender-200">
          {user.avatarUrl && !user.avatarUrl.startsWith('preset:') && (
            <AvatarImage src={user.avatarUrl} />
          )}
          <AvatarFallback className="text-4xl">{presetEmoji}</AvatarFallback>
        </Avatar>
        <h1 className="mt-3 text-xl md:text-2xl font-bold text-primary-800">
          {user.fullName}
        </h1>
        <p className="text-sm text-primary-500">@{user.username}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Badge color="primary">ক্লাস {toBnDigits(user.classLevel)}</Badge>
          <Badge color="pink">লেভেল {toBnDigits(user.level)}</Badge>
          <Badge color="peach">
            <Flame size={10} />
            {toBnDigits(user.currentStreak)} দিন
          </Badge>
          {summary.isInSameGroup && <Badge color="mint">✓ একই গ্রুপে</Badge>}
        </div>
        <p className="text-xs text-primary-400 mt-2">
          যোগ দিয়েছে {formatBnDate(user.joinedAt)}
        </p>

        <Button
          onClick={openChat}
          loading={openingChat}
          className="mt-4 w-full sm:w-auto"
        >
          <MessageCircle size={16} />
          চ্যাট শুরু করো
        </Button>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="আজ পড়েছে"
          value={formatMinutesShort(summary.today.minutes)}
          sublabel={`${toBnDigits(summary.today.entries)} এন্ট্রি`}
          color="primary"
          delay={0}
        />
        <StatCard
          icon={Calendar}
          label="এই সপ্তাহে"
          value={formatMinutesShort(summary.week.minutes)}
          sublabel={`${toBnDigits(summary.week.daysStudied)} দিন`}
          color="pink"
          delay={0.05}
        />
        <StatCard
          icon={Sparkles}
          label="এই মাসে"
          value={formatMinutesShort(summary.month.minutes)}
          color="peach"
          delay={0.1}
        />
        <StatCard
          icon={Trophy}
          label="ব্যাজ"
          value={toBnDigits(summary.badgeCount)}
          sublabel={`লেভেল ${toBnDigits(user.level)}`}
          color="mint"
          delay={0.15}
        />
      </div>

      {/* Streak card */}
      <div className="card-soft p-5">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🔥</div>
          <div className="flex-1">
            <p className="text-sm text-primary-500">বর্তমান স্ট্রিক</p>
            <p className="text-2xl font-bold text-primary-800">
              {toBnDigits(user.currentStreak)} দিন
            </p>
            <p className="text-xs text-primary-400 mt-0.5">
              সর্বোচ্চ স্ট্রিক {toBnDigits(user.longestStreak)} দিন
            </p>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="card-soft p-5">
        <SectionHeader emoji="📈" title="শেষ ৭ দিনের পড়া" />
        {trend.length > 0 ? (
          <StudyLineChart data={trend} />
        ) : (
          <p className="text-sm text-primary-400 text-center py-6">
            এই সপ্তাহে কোনো এন্ট্রি নেই
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="card-soft p-5">
        <SectionHeader
          emoji="🏆"
          title={`অর্জিত ব্যাজ (${badges.length})`}
        />
        {badges.length === 0 ? (
          <p className="text-sm text-primary-400 text-center py-6">
            এখনো কোনো ব্যাজ অর্জন করেনি
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badges.map((b, i) => (
              <motion.div
                key={b.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="text-center p-3 rounded-2xl bg-lavender-100"
              >
                <div className="text-3xl mb-1">{b.icon}</div>
                <p className="text-xs font-bold text-primary-800 leading-tight">
                  {b.name}
                </p>
                <p className="text-[10px] text-primary-400 mt-1 line-clamp-2">
                  {b.description}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy note */}
      <p className="text-center text-xs text-primary-400 px-4">
        🔒 বন্ধুর বিস্তারিত এন্ট্রি, নোট এবং ডায়েরি প্রাইভেট — শুধু সারসংক্ষেপ দেখা যাচ্ছে
      </p>
    </div>
  );
}