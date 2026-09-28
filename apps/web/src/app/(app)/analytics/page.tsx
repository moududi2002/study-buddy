// ============================================================
// Path: apps/web/src/app/(app)/analytics/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, Calendar, Target, Award, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { toBnDigits, formatMinutesShort, formatBnDate } from '@/lib/bn';
import { WeeklyAnalytics, LevelInfo } from '@/lib/types/dashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { SectionHeader } from '@/components/dashboard/section';
import { StudyLineChart } from '@/components/charts/study-line-chart';
import { SubjectPieChart } from '@/components/charts/subject-pie-chart';
import { Heatmap } from '@/components/charts/heatmap';
import { ProgressRing } from '@/components/charts/progress-ring';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface MonthlyData {
  monthStart: string;
  monthEnd: string;
  totalMinutes: number;
  totalEntries: number;
  distinctDays: number;
  daysInMonth: number;
  consistencyPercent: number;
  prevMonthMinutes: number;
  growthPercent: number;
  subjectBreakdown: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    minutes: number;
    entries: number;
  }>;
  streak: { current: number; longest: number };
  xp: number;
  level: number;
  badgesEarnedThisMonth: number;
  suggestions: string[];
}

interface HeatmapData {
  days: number;
  from: string;
  to: string;
  totalMinutes: number;
  activeDays: number;
  maxLevel: number;
  cells: Array<{ date: string; minutes: number; entries: number; level: number }>;
}

interface TrendPoint {
  date: string;
  minutes: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [level, setLevel] = useState<LevelInfo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [w, m, h, t, l] = await Promise.all([
          api.get<{ success: true; data: WeeklyAnalytics }>('/analytics/weekly'),
          api.get<{ success: true; data: MonthlyData }>('/analytics/monthly'),
          api.get<{ success: true; data: HeatmapData }>('/streak/heatmap?days=180'),
          api.get<{ success: true; data: { days: number; series: TrendPoint[] } }>(
            '/analytics/daily-trend?days=30',
          ),
          api.get<{ success: true; data: LevelInfo }>('/gamification/level'),
        ]);
        setWeekly(w.data);
        setMonthly(m.data);
        setHeatmap(h.data);
        setTrend(t.data.series);
        setLevel(l.data);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'লোড করা যায়নি');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !weekly || !monthly || !heatmap || !level) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          📊
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          বিশ্লেষণ 📊
        </h1>
        <p className="text-sm text-primary-500 mt-1">
          তোমার পড়াশোনার প্যাটার্ন, দুর্বলতা, শক্তি — সব একনজরে
        </p>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList className="grid grid-cols-3 w-full bg-lavender-100 rounded-2xl p-1">
          <TabsTrigger value="weekly">সাপ্তাহিক</TabsTrigger>
          <TabsTrigger value="monthly">মাসিক</TabsTrigger>
          <TabsTrigger value="heatmap">হিটম্যাপ</TabsTrigger>
        </TabsList>

        {/* ============ WEEKLY ============ */}
        <TabsContent value="weekly" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp}
              label="মোট সময়"
              value={formatMinutesShort(weekly.totalMinutes)}
              color="primary"
            />
            <StatCard
              icon={Calendar}
              label="পড়া দিন"
              value={`${toBnDigits(weekly.daysStudied)} দিন`}
              color="pink"
            />
            <StatCard
              icon={Target}
              label="প্রতিদিন গড়ে"
              value={formatMinutesShort(weekly.avgPerDay)}
              color="peach"
            />
            <StatCard
              icon={Flame}
              label="বেস্ট ডে"
              value={weekly.daily.reduce((a, b) => (a.minutes > b.minutes ? a : b)).dayLabel}
              sublabel={formatMinutesShort(
                weekly.daily.reduce((a, b) => (a.minutes > b.minutes ? a : b)).minutes,
              )}
              color="mint"
            />
          </div>

          <div className="card-soft p-5">
            <SectionHeader emoji="📈" title="দৈনিক পড়ার ধারা" />
            <StudyLineChart data={weekly.daily.map((d) => ({ date: d.date, minutes: d.minutes }))} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-soft p-5">
              <SectionHeader emoji="🥧" title="বিষয়ভিত্তিক" />
              <SubjectPieChart data={weekly.subjectBreakdown} />
            </div>
            <div className="card-soft p-5">
              <SectionHeader emoji="💡" title="পরামর্শ" />
              <ul className="space-y-2">
                {weekly.suggestions.map((s, i) => (
                  <li key={i} className="rounded-2xl bg-lavender-100 p-3 text-sm text-primary-700 leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Subject breakdown list */}
          <div className="card-soft p-5">
            <SectionHeader emoji="📚" title="বিষয় অনুযায়ী সময়" />
            <div className="space-y-3">
              {weekly.subjectBreakdown.map((s) => {
                const pct = Math.round((s.minutes / weekly.totalMinutes) * 100);
                return (
                  <div key={s.id}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="flex items-center gap-2 font-medium text-primary-700">
                        <span>{s.icon}</span>
                        {s.name}
                      </span>
                      <span className="text-primary-500">
                        {formatMinutesShort(s.minutes)} · {toBnDigits(pct)}%
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-2"
                      indicatorClassName="bg-gradient-to-r"
                    />
                  </div>
                );
              })}
              {weekly.subjectBreakdown.length === 0 && (
                <p className="text-sm text-primary-400 text-center py-4">
                  এই সপ্তাহে কোনো এন্ট্রি নেই
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============ MONTHLY ============ */}
        <TabsContent value="monthly" className="mt-4 space-y-4">
          <div className="card-soft p-5">
            <SectionHeader emoji="🗓️" title={`${formatBnDate(monthly.monthStart)} — ${formatBnDate(monthly.monthEnd)}`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div className="text-center p-3 rounded-2xl bg-lavender-100">
                <p className="text-xs text-primary-500">মোট সময়</p>
                <p className="text-lg font-bold text-primary-800">
                  {formatMinutesShort(monthly.totalMinutes)}
                </p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-pink-soft-100">
                <p className="text-xs text-primary-500">এন্ট্রি</p>
                <p className="text-lg font-bold text-primary-800">
                  {toBnDigits(monthly.totalEntries)}
                </p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-peach-100">
                <p className="text-xs text-primary-500">consistency</p>
                <p className="text-lg font-bold text-primary-800">
                  {toBnDigits(monthly.consistencyPercent)}%
                </p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-mint-100">
                <p className="text-xs text-primary-500">growth</p>
                <p className={`text-lg font-bold flex items-center justify-center gap-1 ${monthly.growthPercent >= 0 ? 'text-mint-500' : 'text-red-500'}`}>
                  {monthly.growthPercent >= 0 ? (
                    <TrendingUp size={16} />
                  ) : (
                    <TrendingDown size={16} />
                  )}
                  {toBnDigits(Math.abs(monthly.growthPercent))}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 rounded-2xl bg-lavender-100">
                <p className="text-xs text-primary-500">স্ট্রিক</p>
                <p className="text-base font-bold text-primary-800">
                  🔥 {toBnDigits(monthly.streak.current)}
                </p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-pink-soft-100">
                <p className="text-xs text-primary-500">সর্বোচ্চ</p>
                <p className="text-base font-bold text-primary-800">
                  ⭐ {toBnDigits(monthly.streak.longest)}
                </p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-peach-100">
                <p className="text-xs text-primary-500">ব্যাজ</p>
                <p className="text-base font-bold text-primary-800">
                  🏆 {toBnDigits(monthly.badgesEarnedThisMonth)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-soft p-5 flex items-center gap-5">
            <ProgressRing
              value={monthly.consistencyPercent}
              size={130}
              strokeWidth={10}
              label={`${toBnDigits(monthly.consistencyPercent)}%`}
              sublabel="নিয়মিত"
              emoji="💎"
            />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-primary-800">নিয়মিত পড়ার হার</p>
              <p className="text-sm text-primary-600 leading-relaxed">
                এই মাসে {toBnDigits(monthly.daysInMonth)} দিনের মধ্যে{' '}
                {toBnDigits(monthly.distinctDays)} দিন পড়েছো
              </p>
            </div>
          </div>

          <div className="card-soft p-5">
            <SectionHeader emoji="💡" title="মাসিক পরামর্শ" />
            <ul className="space-y-2">
              {monthly.suggestions.map((s, i) => (
                <li key={i} className="rounded-2xl bg-gradient-to-br from-lavender-100 to-pink-soft-100 p-3 text-sm text-primary-700 leading-relaxed">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        {/* ============ HEATMAP ============ */}
        <TabsContent value="heatmap" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Calendar} label="মোট দিন" value={toBnDigits(heatmap.days)} color="primary" />
            <StatCard icon={Award} label="সক্রিয় দিন" value={toBnDigits(heatmap.activeDays)} color="pink" />
            <StatCard icon={TrendingUp} label="মোট পড়া" value={formatMinutesShort(heatmap.totalMinutes)} color="peach" />
          </div>

          <div className="card-soft p-5">
            <SectionHeader emoji="🗓️" title="গত ১৮০ দিনের হিটম্যাপ" />
            <Heatmap cells={heatmap.cells} />
            <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-primary-400">
              <span>কম</span>
              <div className="h-3 w-3 rounded-sm bg-lavender-100" />
              <div className="h-3 w-3 rounded-sm bg-primary-200" />
              <div className="h-3 w-3 rounded-sm bg-primary-300" />
              <div className="h-3 w-3 rounded-sm bg-primary-400" />
              <div className="h-3 w-3 rounded-sm bg-primary-500" />
              <span>বেশি</span>
            </div>
          </div>

          <div className="card-soft p-5">
            <SectionHeader emoji="📈" title="গত ৩০ দিনের ধারা" />
            <StudyLineChart data={trend} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}