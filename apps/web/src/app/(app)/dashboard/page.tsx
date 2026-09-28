// ============================================================
// Path: apps/web/src/app/(app)/dashboard/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Clock,
  BookOpen,
  Flame,
  Target,
  TrendingUp,
  Sparkles,
  Trophy,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { greetingBn, toBnDigits, formatMinutes, formatMinutesShort } from '@/lib/bn';
import {
  DashboardResponse,
  LevelInfo,
  WeeklyAnalytics,
  AiInsight,
  BadgeInfo,
} from '@/lib/types/dashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { MotivationBanner } from '@/components/dashboard/motivation-banner';
import { SectionHeader } from '@/components/dashboard/section';
import { ProgressRing } from '@/components/charts/progress-ring';
import { StudyLineChart } from '@/components/charts/study-line-chart';
import { SubjectPieChart } from '@/components/charts/subject-pie-chart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const BADGE_ICONS: Record<string, string> = {
  FIRST_STUDY_ENTRY: '🌱',
  SEVEN_DAY_STREAK: '🌟',
  THIRTY_DAY_STREAK: '🏆',
  HUNDRED_HOURS: '⏰',
  MATH_HERO: '🦸',
  SCIENCE_EXPLORER: '🚀',
  CONSISTENCY_CHAMPION: '💎',
  CHAPTER_FINISHER: '📕',
  EARLY_BIRD: '🌅',
  NIGHT_OWL: '🌙',
};

const DAILY_TARGET_MINUTES = 120; // 2 hours goal display

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [d, l, w, ai, b] = await Promise.all([
          api.get<{ success: true; data: DashboardResponse }>('/analytics/dashboard'),
          api.get<{ success: true; data: LevelInfo }>('/gamification/level'),
          api.get<{ success: true; data: WeeklyAnalytics }>('/analytics/weekly'),
          api.get<{ success: true; data: AiInsight }>('/ai/weekly-insight'),
          api.get<{ success: true; data: { items: BadgeInfo[] } }>('/gamification/badges'),
        ]);
        if (cancelled) return;
        setDashboard(d.data);
        setLevel(l.data);
        setWeekly(w.data);
        setInsight(ai.data);
        setBadges(b.data.items.filter((x) => x.earned).slice(0, 4));
      } catch (err) {
        const e = err as ApiError;
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !dashboard || !level || !weekly) {
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

  const todayMinutes = dashboard.today.minutes;
  const goalPercent = Math.min(100, Math.round((todayMinutes / DAILY_TARGET_MINUTES) * 100));

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="px-1">
        <p className="text-sm text-primary-500">{greetingBn()}! 🌸</p>
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          {user?.fullName ?? dashboard.user.fullName} 🐱
        </h1>
      </div>

      {/* Motivation banner */}
      <MotivationBanner message={dashboard.motivation} />

      {/* Today's quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="আজ পড়েছো"
          value={formatMinutesShort(todayMinutes)}
          color="primary"
          delay={0}
        />
        <StatCard
          icon={BookOpen}
          label="আজ এন্ট্রি"
          value={`${toBnDigits(dashboard.today.entries)} টি`}
          color="pink"
          delay={0.05}
        />
        <StatCard
          icon={Flame}
          label="স্ট্রিক"
          value={`${toBnDigits(dashboard.user.currentStreak)} দিন`}
          sublabel={`সর্বোচ্চ ${toBnDigits(dashboard.user.longestStreak)}`}
          color="peach"
          delay={0.1}
        />
        <StatCard
          icon={Target}
          label="এই সপ্তাহে"
          value={formatMinutesShort(dashboard.weekTotalMinutes)}
          color="mint"
          delay={0.15}
        />
      </div>

      {/* Big two-column: goal ring + level */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Today goal ring */}
        <div className="card-soft p-5 flex flex-col items-center">
          <SectionHeader emoji="🎯" title="আজকের লক্ষ্য" className="w-full" />
          <ProgressRing
            value={goalPercent}
            size={160}
            label={`${toBnDigits(goalPercent)}%`}
            sublabel={`${formatMinutesShort(todayMinutes)} / ২ ঘণ্টা`}
            emoji={goalPercent >= 100 ? '🎉' : '📚'}
          />
          <p className="mt-3 text-sm text-primary-600 text-center">
            {goalPercent >= 100
              ? 'আজকের লক্ষ্য পূরণ! দারুণ করেছো 🌟'
              : todayMinutes > 0
                ? `আরও ${formatMinutesShort(DAILY_TARGET_MINUTES - todayMinutes)} পড়লেই আজকের লক্ষ্য পূরণ!`
                : 'ছোট করে হলেও শুরু করো — স্ট্রিক গড়ে উঠবে ✨'}
          </p>
        </div>

        {/* Level progress */}
        <div className="card-soft p-5 flex flex-col">
          <SectionHeader emoji="⭐" title={`লেভেল ${toBnDigits(level.level)}`} />
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">🏅</div>
            <div className="flex-1">
              <p className="text-sm text-primary-500 mb-1">
                {toBnDigits(level.xp)} XP মোট
              </p>
              <p className="text-xs text-primary-400">
                পরের লেভেলে যেতে {toBnDigits(level.xpToNextLevel)} XP বাকি
              </p>
            </div>
          </div>
          <Progress value={level.progressPercent} className="mb-2" />
          <div className="flex justify-between text-xs text-primary-400 mb-4">
            <span>{toBnDigits(level.xpInLevel)} / {toBnDigits(level.xpNeededForLevel)}</span>
            <span>{toBnDigits(level.progressPercent)}%</span>
          </div>

          {/* Weekly summary chips */}
          <div className="mt-auto space-y-2 text-sm">
            {dashboard.weeklySummary.topSubject && (
              <div className="flex items-center justify-between rounded-xl bg-lavender-100 px-3 py-2">
                <span className="text-primary-600">🏆 সেরা বিষয়</span>
                <span className="font-semibold text-primary-800">
                  {dashboard.weeklySummary.topSubject.name}
                </span>
              </div>
            )}
            {dashboard.weeklySummary.daysStudied > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-pink-soft-100 px-3 py-2">
                <span className="text-primary-600">📅 এই সপ্তাহে পড়েছো</span>
                <span className="font-semibold text-primary-800">
                  {toBnDigits(dashboard.weeklySummary.daysStudied)} দিন
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card-soft p-5">
        <SectionHeader
          emoji="📈"
          title="এই সপ্তাহের পড়া"
          action={
            <Link
              href="/analytics"
              className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
            >
              বিস্তারিত <ArrowRight size={12} />
            </Link>
          }
        />
        <StudyLineChart data={weekly.daily} />
      </div>

      {/* Two columns: pie + AI insight */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-soft p-5">
          <SectionHeader emoji="🥧" title="বিষয়ভিত্তিক বিতরণ" />
          <SubjectPieChart data={weekly.subjectBreakdown} />
        </div>

        <div className="card-soft p-5">
          <SectionHeader
            emoji="✨"
            title="AI পরামর্শ"
            action={
              insight?.source === 'ai' ? (
                <Badge color="mint">Gemini</Badge>
              ) : (
                <Badge color="gray">স্মার্ট টিপস</Badge>
              )
            }
          />
          <div className="rounded-2xl bg-gradient-to-br from-lavender-100 to-pink-soft-100 p-4">
            <p className="text-sm text-primary-700 leading-relaxed">
              {insight?.insight ?? 'কিছুক্ষণ পর আবার দেখা যাবে...'}
            </p>
          </div>
         {insight && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-lavender-100 px-3 py-2">
                <p className="text-primary-400">মোট</p>
                <p className="font-semibold text-primary-800">
                  {formatMinutesShort(insight.stats?.totalMinutes ?? 0)}
                </p>
              </div>

              <div className="rounded-xl bg-pink-soft-100 px-3 py-2">
                <p className="text-primary-400">পড়া দিন</p>
                <p className="font-semibold text-primary-800">
                  {toBnDigits(insight.stats?.daysStudied ?? 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active goals */}
      {dashboard.activeGoals.length > 0 && (
        <div>
          <SectionHeader
            emoji="🎯"
            title="চলমান লক্ষ্য"
            action={
              <Link
                href="/goals"
                className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
              >
                সব দেখো <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="space-y-2">
            {dashboard.activeGoals.slice(0, 3).map((g) => (
              <div
                key={g.id}
                className="card-soft p-4 flex items-center gap-3 hover:shadow-soft-lg transition-shadow"
              >
                <div className="text-2xl">🎯</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-800 text-sm truncate">
                    {g.title}
                  </p>
                  <p className="text-xs text-primary-500">
                    {g.type === 'DAILY' && 'আজকের'}
                    {g.type === 'WEEKLY' && 'সাপ্তাহিক'}
                    {g.type === 'MONTHLY' && 'মাসিক'}
                    {g.targetMinutes && ` · ${formatMinutesShort(g.targetMinutes)}`}
                  </p>
                </div>
                <Badge color="primary">
                  {g.endsAt.slice(-2).replace(/^0/, '')} তারিখ পর্যন্ত
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent badges */}
      {badges.length > 0 && (
        <div>
          <SectionHeader
            emoji="🏆"
            title="সাম্প্রতিক ব্যাজ"
            action={
              <Link
                href="/achievements"
                className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
              >
                সব দেখো <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map((b) => (
              <motion.div
                key={b.code}
                whileHover={{ scale: 1.03 }}
                className="card-soft p-4 text-center"
              >
                <div className="text-3xl mb-1">{BADGE_ICONS[b.code] ?? '🏅'}</div>
                <p className="text-xs font-semibold text-primary-800 leading-tight">
                  {b.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick action */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/tracker" className="flex-1">
          <Button size="lg" className="w-full">
            <BookOpen size={18} />
            আজকের পড়া যোগ করো
          </Button>
        </Link>
        <Link href="/analytics" className="flex-1">
          <Button size="lg" variant="secondary" className="w-full">
            <TrendingUp size={18} />
            বিস্তারিত রিপোর্ট
          </Button>
        </Link>
      </div>
    </div>
  );
}