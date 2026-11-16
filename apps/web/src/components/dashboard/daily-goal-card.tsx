
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  ArrowRight,
  BookOpen,
  RefreshCw,
  Target,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  formatMinutesShort,
  toBnDigits,
} from '@/lib/bn';

import { SectionHeader } from '@/components/dashboard/section';
import { ProgressRing } from '@/components/charts/progress-ring';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

type DailyGoal = {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  targetMinutes: number | null;
  targetChapters: number | null;
  currentMinutes: number;
  currentChapters: number;
  progressPercent: number;
  isAchieved: boolean;
  isCompleted: boolean;
  startsAt: string;
  endsAt: string;
};

function getDhakaToday(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return [
    value('year'),
    value('month'),
    value('day'),
  ].join('-');
}

export function DailyGoalCard() {
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      setLoading(true);
      setError(false);

      try {
        const response = await api.get<{
          success: true;
          data: DailyGoal[];
        }>('/goals');

        if (!cancelled) {
          setGoals(response.data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGoals();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const today = getDhakaToday();

  const dailyGoals = goals.filter((goal) => {
    return (
      goal.type === 'DAILY' &&
      goal.startsAt <= today &&
      goal.endsAt >= today
    );
  });

  const selectedGoal =
    dailyGoals.find((goal) => goal.id === selectedId) ??
    dailyGoals[0] ??
    null;

  return (
    <div className="card-soft flex h-full flex-col p-5">
      <SectionHeader
        emoji="🎯"
        title="আজকের লক্ষ্য"
        className="w-full"
        action={
          <Link
            href="/goals"
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700"
          >
            সব লক্ষ্য
            <ArrowRight size={13} />
          </Link>
        }
      />

      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-100 border-t-primary-500" />
          <p className="text-sm text-primary-500">
            লক্ষ্য লোড হচ্ছে...
          </p>
        </div>
      ) : error ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-red-500">
            লক্ষ্য লোড করা যায়নি।
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReloadKey((n) => n + 1)}
          >
            <RefreshCw size={15} />
            আবার চেষ্টা করো
          </Button>
        </div>
      ) : !selectedGoal ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-3xl bg-lavender-100 p-5">
            <Target size={38} className="text-primary-500" />
          </div>

          <div>
            <p className="font-bold text-primary-800">
              আজকের লক্ষ্য এখনো তৈরি করোনি
            </p>
            <p className="mt-1 text-sm text-primary-500">
              নিজের সুবিধামতো পড়ার সময় বা অধ্যায়ের লক্ষ্য দাও।
            </p>
          </div>

          <Link href="/goals">
            <Button size="sm">
              <BookOpen size={16} />
              নতুন লক্ষ্য তৈরি করো
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center">
          {dailyGoals.length > 1 && (
            <div className="mb-4 flex w-full flex-wrap justify-center gap-2">
              {dailyGoals.map((goal) => {
                const active = goal.id === selectedGoal.id;

                return (
                  <button
                    key={goal.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(goal.id)}
                    className={
                      'max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                      (active
                        ? 'border-primary-400 bg-lavender-100 text-primary-800'
                        : 'border-primary-100 bg-white text-primary-500 hover:border-primary-300')
                    }
                  >
                    {goal.title}
                  </button>
                );
              })}
            </div>
          )}

          <h3 className="mb-3 text-center text-base font-bold text-primary-800">
            {selectedGoal.title}
          </h3>

          <ProgressRing
            value={selectedGoal.progressPercent}
            size={160}
            label={`${toBnDigits(selectedGoal.progressPercent)}%`}
            emoji={
              selectedGoal.isCompleted
                ? '🏆'
                : selectedGoal.isAchieved
                  ? '🎉'
                  : '📚'
            }
          />

          <div className="mt-5 w-full space-y-4">
            {selectedGoal.targetMinutes != null && (
              <div>
                <div className="mb-1.5 flex justify-between gap-2 text-xs text-primary-600">
                  <span>⏱️ পড়ার সময়</span>
                  <span className="font-semibold">
                    {formatMinutesShort(selectedGoal.currentMinutes)}
                    {' / '}
                    {formatMinutesShort(selectedGoal.targetMinutes)}
                  </span>
                </div>

                <Progress
                  value={Math.min(
                    100,
                    (selectedGoal.currentMinutes /
                      selectedGoal.targetMinutes) *
                      100,
                  )}
                />
              </div>
            )}

            {selectedGoal.targetChapters != null && (
              <div>
                <div className="mb-1.5 flex justify-between gap-2 text-xs text-primary-600">
                  <span>📖 অধ্যায়</span>
                  <span className="font-semibold">
                    {toBnDigits(selectedGoal.currentChapters)}
                    {' / '}
                    {toBnDigits(selectedGoal.targetChapters)}
                  </span>
                </div>

                <Progress
                  value={Math.min(
                    100,
                    (selectedGoal.currentChapters /
                      selectedGoal.targetChapters) *
                      100,
                  )}
                  indicatorClassName="bg-gradient-to-r from-mint-300 to-mint-500"
                />
              </div>
            )}
          </div>

          <p
            className="mt-5 text-center text-sm font-medium text-primary-700"
            aria-live="polite"
          >
            {selectedGoal.isCompleted
              ? 'লক্ষ্য সম্পন্ন হয়েছে! অভিনন্দন 🏆'
              : selectedGoal.isAchieved
                ? 'লক্ষ্য অর্জিত! এবার সম্পন্ন হিসেবে চিহ্নিত করো 🎉'
                : 'তুমি এগিয়ে যাচ্ছো। পড়াশোনা চালিয়ে যাও! 💜'}
          </p>

          {selectedGoal.isAchieved &&
            !selectedGoal.isCompleted && (
              <Link href="/goals" className="mt-3">
                <Button size="sm">
                  লক্ষ্য সম্পন্ন করো
                  <ArrowRight size={14} />
                </Button>
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
