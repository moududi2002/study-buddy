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
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { greetingBn, toBnDigits, formatMinutesShort } from '@/lib/bn';
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

import { StudyLineChart } from '@/components/charts/study-line-chart';
import { SubjectPieChart } from '@/components/charts/subject-pie-chart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


import { DailyGoalCard } from '@/components/dashboard/daily-goal-card';


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



export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);



  useEffect(() => {
    let cancelled = false;

    async function loadEssentialData() {
      try {
        setLoading(true);
        setLoadError(null);

        const [dashboardResponse, levelResponse, weeklyResponse] =
          await Promise.all([
            api.get<{
              success: true;
              data: DashboardResponse;
            }>('/analytics/dashboard'),

            api.get<{
              success: true;
              data: LevelInfo;
            }>('/gamification/level'),

            api.get<{
              success: true;
              data: WeeklyAnalytics;
            }>('/analytics/weekly'),
          ]);

        if (cancelled) return;

        setDashboard(dashboardResponse.data);
        setLevel(levelResponse.data);
        setWeekly(weeklyResponse.data);
      } catch (err) {
        if (cancelled) return;

        console.error('Dashboard load failed:', err);

        const error = err as ApiError;

        setLoadError(
          error.message || 'ড্যাশবোর্ড লোড করা যায়নি',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadOptionalData() {
      const results = await Promise.allSettled([
        api.get<{
          success: true;
          data: AiInsight;
        }>('/ai/weekly-insight'),

        api.get<{
          success: true;
          data: { items: BadgeInfo[] };
        }>('/gamification/badges'),
      ]);

      if (cancelled) return;

      const [aiResult, badgeResult] = results;

      if (aiResult.status === 'fulfilled') {
        setInsight(aiResult.value.data);
      }

      if (badgeResult.status === 'fulfilled') {
        setBadges(
          badgeResult.value.data.items
            .filter((badge) => badge.earned)
            .slice(0, 4),
        );
      }
    }

    void loadEssentialData();
    void loadOptionalData();

    return () => {
      cancelled = true;
    };
  }, []);


  if (loading) {
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

  
  if (loadError || !dashboard || !level || !weekly) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-5xl">🐱</span>

        <h2 className="text-xl font-bold text-primary-800">
          ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে
        </h2>

        <p className="max-w-md text-sm text-primary-500">
          {loadError || 'প্রয়োজনীয় তথ্য পাওয়া যায়নি।'}
        </p>

        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
        >
          আবার চেষ্টা করো
        </Button>
      </div>
    );
  }

  
  const todayMinutes = dashboard.today.minutes;
  

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


    {/* Focus Mode shortcut */}
    
    <Link href="/focus" className="block">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        className="group relative isolate overflow-hidden rounded-3xl
          bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700
          p-5 text-white shadow-xl shadow-purple-300/40
          transition-all duration-300 hover:shadow-2xl
          hover:shadow-purple-400/40 sm:p-6"
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
        </div>

        {/* Floating target icon */}
        <motion.div
          animate={{
            rotate: [0, 8, -8, 0],
            y: [0, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-4 -top-7 text-8xl opacity-20"
        >
          🎯
        </motion.div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">

            {/* Main icon */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center
              rounded-2xl border border-white/30 bg-white/20
              text-4xl shadow-inner backdrop-blur-md">
              ⏱️
            </div>

            {/* Content */}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em]
                text-violet-100">
                Study Focus
              </p>

              <h2 className="mt-1 text-xl font-extrabold tracking-tight
                text-white sm:text-2xl">
                Focus Mode
              </h2>

              <p className="mt-1 text-sm font-medium leading-relaxed
                text-white/90">
                মন দিয়ে পড়ো, Tracker নিজেই আপডেট হবে।
              </p>
            </div>
          </div>

          {/* Arrow */}
          <span className="flex h-11 w-11 shrink-0 items-center
            justify-center rounded-full border border-white/30
            bg-white/20 text-white shadow-sm backdrop-blur-md
            transition-all duration-300
            group-hover:translate-x-1 group-hover:bg-white/30">
            <ArrowRight size={22} />
          </span>
        </div>

        {/* Feature badge */}
        <div className="relative mt-5 inline-flex items-center gap-2
          rounded-full border border-white/25 bg-black/15
          px-4 py-2 text-xs font-bold text-white shadow-sm
          backdrop-blur-md sm:text-sm">
          <Clock size={15} />
          <span>৩ ঘণ্টার Checkpoint ও Background Alarm</span>
        </div>
      </motion.div>
    </Link>



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
        
          {/* Dynamic daily goal */}
          <DailyGoalCard />


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
          <div className="rounded-2xl .bg-gradient-to-br {
              --tw-gradient-position: to bottom right in oklab;
              background-image: linear-gradient(var(--tw-gradient-stops));
              } from-lavender-100 to-pink-soft-100 p-4">
            <p className="text-sm text-primary-700 leading-relaxed">
              {insight?.insight ??
              weekly.suggestions?.[0] ??
              'নিয়মিত পড়াশোনা চালিয়ে যাও। প্রতিদিনের ছোট অগ্রগতিও গুরুত্বপূর্ণ!'}
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
                className="card-soft p-4 transition-shadow hover:shadow-soft-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-lavender-100 p-2.5 text-2xl">
                    🎯
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-primary-800">
                        {g.title}
                      </p>

                      <Badge color={g.isAchieved ? 'mint' : 'primary'}>
                        {toBnDigits(g.progressPercent)}%
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-primary-500">
                      {g.type === 'DAILY'
                        ? 'আজকের'
                        : g.type === 'WEEKLY'
                          ? 'সাপ্তাহিক'
                          : 'মাসিক'}
                      {g.subject && ` · ${g.subject.name}`}
                    </p>

                    <div className="mt-3">
                      <Progress value={g.progressPercent} />
                    </div>

                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-primary-500">
                      <span>
                        {g.targetMinutes != null &&
                          `${formatMinutesShort(g.currentMinutes)} / ${formatMinutesShort(g.targetMinutes)}`}

                        {g.targetMinutes != null &&
                          g.targetChapters != null &&
                          ' · '}

                        {g.targetChapters != null &&
                          `${toBnDigits(g.currentChapters)} / ${toBnDigits(g.targetChapters)} অধ্যায়`}
                      </span>

                      <span>
                        {g.isAchieved
                          ? '🎉 অর্জিত'
                          : `${toBnDigits(g.daysRemaining)} দিন বাকি`}
                      </span>
                    </div>
                  </div>
                </div>
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