
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlarmClock,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  Play,
  RotateCcw,
  Square,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api';
import { toBnDigits } from '@/lib/bn';
import { Button } from '@/components/ui/button';
import {
  SubjectPicker,
  SubjectOption,
} from '@/components/academic/subject-picker';
import { enableFocusNotifications } from '@/lib/focus-notification';

type FocusStatus = 'RUNNING' | 'WAITING' | 'COMPLETED';

type FocusRecord = {
  id: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  status: FocusStatus;
  startedAt: string;
  segmentStartedAt: string | null;
  checkpointAt: string | null;
  accumulatedSeconds: number;
  elapsedSeconds: number;
  durationMinutes: number;
  lastStudiedAt: string | null;
  endedAt: string | null;
  trackerEntryId: string | null;
  serverNow: string;
  chapter: string | null;
};

const CHECKPOINT_SECONDS = 3 * 60 * 60;

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');

  return toBnDigits(`${hours}:${minutes}:${secs}`);
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('bn-BD', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('bn-BD', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function getElapsed(record: FocusRecord, now: number) {
  if (
    record.status !== 'RUNNING' ||
    !record.segmentStartedAt ||
    !record.checkpointAt
  ) {
    return record.accumulatedSeconds;
  }

  const start = new Date(record.segmentStartedAt).getTime();
  const end = new Date(record.checkpointAt).getTime();

  const additional = Math.max(
    0,
    Math.floor((Math.min(now, end) - start) / 1000),
  );

  return record.accumulatedSeconds + Math.min(
    CHECKPOINT_SECONDS,
    additional,
  );
}

function FocusRing({
  seconds,
  checkpointRemaining,
}: {
  seconds: number;
  checkpointRemaining: number;
}) {
  const size = 244;
  const radius = 101;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.min(
    1,
    Math.max(0, 1 - checkpointRemaining / CHECKPOINT_SECONDS),
  );

  return (
    <div className="relative mx-auto h-[244px] w-[244px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="focus-gradient">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        <circle
          cx="122"
          cy="122"
          r={radius}
          stroke="#ede9fe"
          strokeWidth="13"
          fill="none"
        />

        <motion.circle
          cx="122"
          cy="122"
          r={radius}
          fill="none"
          stroke="url(#focus-gradient)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset: circumference * (1 - progress),
          }}
          transition={{ duration: 0.6 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-4xl"
        >
          📚
        </motion.span>

        <span className="mt-2 text-3xl font-extrabold tracking-tight text-violet-900">
          {formatTimer(seconds)}
        </span>

        <span className="mt-2 text-xs text-violet-500">
          মোট Focus Time
        </span>
      </div>
    </div>
  );
}

async function playCheckpointSound() {
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx();
    await context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 740;

    oscillator.connect(gain);
    gain.connect(context.destination);

    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.12,
      context.currentTime + 0.03,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.5,
    );

    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Autoplay restrictions may prevent sound.
  }
}

export default function FocusPage() {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectId, setSubjectId] = useState('');

  const [active, setActive] = useState<FocusRecord | null>(null);
  const [history, setHistory] = useState<FocusRecord[]>([]);
  const [lastResult, setLastResult] = useState<FocusRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState('');

  const lastAlarmRef = useRef('');
  const dueRefreshRef = useRef('');

  const [chapter, setChapter] = useState('');

  const syncServerTime = useCallback((record: FocusRecord | null) => {
    if (record) {
      setServerOffset(
        Date.now() - new Date(record.serverNow).getTime(),
      );
    }
  }, []);

  const loadActive = useCallback(async () => {
    const response = await api.get<{
      success: true;
      data: FocusRecord | null;
    }>('/focus/active');

    syncServerTime(response.data);
    setActive(response.data);
  }, [syncServerTime]);

  const loadHistory = useCallback(async () => {
    const response = await api.get<{
      success: true;
      data: FocusRecord[];
    }>('/focus/history');

    setHistory(response.data);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [subjectResponse, activeResponse, historyResponse] =
        await Promise.all([
          api.get<{
            success: true;
            data: SubjectOption[];
          }>('/subjects'),

          api.get<{
            success: true;
            data: FocusRecord | null;
          }>('/focus/active'),

          api.get<{
            success: true;
            data: FocusRecord[];
          }>('/focus/history'),
        ]);

      setSubjects(subjectResponse.data);
      setSubjectId((previous) =>
        subjectResponse.data.some((s) => s.id === previous)
          ? previous
          : subjectResponse.data[0]?.id ?? '',
      );

      syncServerTime(activeResponse.data);
      setActive(activeResponse.data);
      setHistory(historyResponse.data);
    } catch (err) {
      setError(
        (err as ApiError).message || 'Focus তথ্য লোড করা যায়নি',
      );
    } finally {
      setLoading(false);
    }
  }, [syncServerTime]);

  useEffect(() => {
    setNowMs(Date.now());
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const clock = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    const refresh = window.setInterval(() => {
      void loadActive().catch(() => {});
    }, 20000);

    const onFocus = () => {
      void loadActive().catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(clock);
      clearInterval(refresh);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadActive]);

  const serverNow = nowMs - serverOffset;
  const seconds = active
    ? getElapsed(active, serverNow)
    : 0;

  const remaining = active?.checkpointAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(active.checkpointAt).getTime() - serverNow) /
            1000,
        ),
      )
    : 0;

  useEffect(() => {
    if (
      active?.status === 'RUNNING' &&
      remaining === 0 &&
      active.checkpointAt
    ) {
      const key = `${active.id}:${active.checkpointAt}`;

      if (dueRefreshRef.current !== key) {
        dueRefreshRef.current = key;
        void loadActive().catch(() => {});
      }
    }
  }, [active, remaining, loadActive]);

  useEffect(() => {
    if (active?.status !== 'WAITING') return;

    const key = `${active.id}:${active.checkpointAt}`;

    if (lastAlarmRef.current === key) return;
    lastAlarmRef.current = key;

    void playCheckpointSound();
  }, [active]);

  async function runAction(
    path: string,
    body?: Record<string, unknown>,
  ) {
    if (busy) return;

    setBusy(true);

    try {
      const response = await api.post<{
        success: true;
        message: string;
        data: FocusRecord;
      }>(path, body);

      toast.success(response.message);

      syncServerTime(response.data);

      if (response.data.status === 'COMPLETED') {
        setLastResult(response.data);
        setActive(null);
        await loadHistory();
      } else {
        setActive(response.data);
      }
    } catch (err) {
      const message =
        (err as ApiError).message ||
        'অনুরোধ সম্পন্ন করা যায়নি';

      toast.error(message);
      await loadActive().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function enableAlarm() {
    setNoticeBusy(true);

    try {
      await enableFocusNotifications();
      toast.success('Background Focus Alarm চালু হয়েছে 🔔');
    } catch (err) {
      toast.error(
        (err as Error).message || 'Notification চালু করা যায়নি',
      );
    } finally {
      setNoticeBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-violet-600">
        <RotateCcw className="mr-2 animate-spin" size={18} />
        Focus Mode লোড হচ্ছে...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-soft mx-auto max-w-lg p-8 text-center">
        <p className="text-red-600">{error}</p>

        <Button
          className="mt-4"
          onClick={() => void loadAll()}
        >
          আবার চেষ্টা করো
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-500">
            ✨ STUDY BUDDY
          </p>

          <h1 className="mt-1 text-3xl font-extrabold text-violet-900">
            Focus Mode 🎯
          </h1>

          <p className="mt-2 text-sm text-violet-500">
            মন দিয়ে পড়ো, সময়ের হিসাব আমরা রাখব।
          </p>
        </div>

        <Link
          href="/tracker"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700"
        >
          <BookOpen size={16} />
          ট্র্যাকার
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-soft p-5 sm:p-8"
        >
          {!active ? (
            <div className="space-y-6">
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="text-6xl"
                >
                  🐱
                </motion.div>

                <h2 className="mt-4 text-xl font-bold text-violet-900">
                  আজ কোন বিষয় নিয়ে পড়বে?
                </h2>
              </div>

              <SubjectPicker
                subjects={subjects}
                value={subjectId}
                onChange={setSubjectId}
                onCreated={(subject) => {
                  setSubjects((items) => [...items, subject]);
                }}
              />


                <div>
                <label
                    htmlFor="focus-chapter"
                    className="mb-2 block text-sm font-bold text-violet-800"
                >
                    📖 অধ্যায় (ঐচ্ছিক)
                </label>

                <input
                    id="focus-chapter"
                    value={chapter}
                    maxLength={120}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="যেমন: অধ্যায় ৫ — আলোকবিজ্ঞান"
                    className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-violet-900 outline-none focus:border-violet-500"
                />
                </div>


              <Button
                size="lg"
                className="w-full"
                loading={busy}
                disabled={!subjectId || busy}
                onClick={() =>
                    void runAction('/focus/start', {
                    subjectId,
                    chapter: chapter.trim() || undefined,
                    })

                }
              >
                <Play size={18} />
                Start Focus
              </Button>

              <p className="text-center text-xs text-violet-500">
                প্রথম ৩ ঘণ্টা পর্যন্ত Timer চলবে। তারপর Confirmation প্রয়োজন।
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-800">
                  {active.subject.icon}
                  {active.subject.name}
                </span>
              </div>

              <FocusRing
                seconds={seconds}
                checkpointRemaining={remaining}
              />

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-violet-50 p-4">
                  <Clock3
                    size={18}
                    className="mx-auto text-violet-500"
                  />

                  <p className="mt-2 text-xs text-violet-500">
                    শুরু হয়েছে
                  </p>

                  <p className="mt-1 text-sm font-bold text-violet-900">
                    {formatClock(active.startedAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-pink-50 p-4">
                  <AlarmClock
                    size={18}
                    className="mx-auto text-pink-500"
                  />

                  <p className="mt-2 text-xs text-violet-500">
                    Checkpoint বাকি
                  </p>

                  <p className="mt-1 text-sm font-bold text-violet-900">
                    {formatTimer(remaining)}
                  </p>
                </div>
              </div>

              {active.status === 'RUNNING' && remaining > 0 && (
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Focus চলছে
                </motion.div>
              )}

              <Button
                variant="danger"
                size="lg"
                className="w-full"
                loading={busy}
                onClick={() => {
                  if (window.confirm('Focus শেষ করতে চাও?')) {
                    void runAction(`/focus/${active.id}/stop`);
                  }
                }}
              >
                <Square size={18} />
                Stop Focus
              </Button>
            </div>
          )}
        </motion.div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-violet-600" />

              <h3 className="font-bold text-violet-900">
                Focus Alarm
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-violet-600">
              অ্যাপ বন্ধ থাকলেও ৩ ঘণ্টা শেষে Notification
              পেতে Alarm চালু করো।
            </p>

            <Button
              variant="secondary"
              className="mt-4 w-full"
              loading={noticeBusy}
              onClick={() => void enableAlarm()}
            >
              <Bell size={16} />
              Enable Background Alarm
            </Button>
          </div>

          <div className="card-soft p-5">
            <h3 className="font-bold text-violet-900">
              🌱 Focus Tips
            </h3>

            <div className="mt-4 space-y-3 text-sm text-violet-600">
              <p>📵 পড়ার সময় অপ্রয়োজনীয় Notification বন্ধ রাখো।</p>
              <p>💧 মাঝে পানি খাও এবং ছোট বিরতি নাও।</p>
              <p>📚 একটি নির্দিষ্ট অধ্যায়ে মনোযোগ দাও।</p>
              <p>✅ শেষ হলে Tracker-এ স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {active?.status === 'WAITING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-violet-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.88, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="focus-alert-title"
            >
              <motion.div
                animate={{ rotate: [0, -12, 12, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-6xl"
              >
                ⏰
              </motion.div>

              <h2
                id="focus-alert-title"
                className="mt-4 text-2xl font-extrabold text-violet-900"
              >
                ৩ ঘণ্টা হয়ে গেছে!
              </h2>

              <p className="mt-3 text-violet-600">
                তুমি কি এখনো পড়ছো?
              </p>

              <p className="mt-2 text-xs text-violet-500">
                উত্তর না দেওয়া পর্যন্ত Timer থেমে থাকবে।
              </p>

              <div className="mt-6 space-y-3">
                <Button
                  size="lg"
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    void runAction(
                      `/focus/${active.id}/continue`,
                    )
                  }
                >
                  <CheckCircle2 size={18} />
                  হ্যাঁ, আরও পড়ব
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void runAction(`/focus/${active.id}/stop`)
                  }
                >
                  না, Focus শেষ করো
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-violet-950/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-7 text-center"
            >
              <div className="text-6xl">🏆</div>

              <h2 className="mt-3 text-2xl font-extrabold text-violet-900">
                Focus Complete!
              </h2>

              <p className="mt-2 text-violet-600">
                {lastResult.subject.name}
              </p>

              <p className="mt-5 text-3xl font-extrabold text-violet-800">
                {formatTimer(lastResult.elapsedSeconds)}
              </p>

              <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-left text-sm text-violet-700">
                <p>📅 {formatDate(lastResult.startedAt)}</p>

                <p className="mt-2">
                  🕘 শুরু: {formatClock(lastResult.startedAt)}
                </p>

                <p className="mt-2">
                  🕒 শেষ: {formatClock(
                    lastResult.endedAt ?? lastResult.startedAt,
                  )}
                </p>

                <p className="mt-3 font-bold">
                  {lastResult.trackerEntryId
                    ? '✅ Tracker-এ অটো যোগ হয়েছে'
                    : 'ℹ️ ১ মিনিটের কম হওয়ায় Tracker-এ যোগ হয়নি'}
                </p>
              </div>

              <Button
                className="mt-5 w-full"
                onClick={() => setLastResult(null)}
              >
                ঠিক আছে
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="card-soft p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-900">
            📜 Focus History
          </h2>

          <Link
            href="/tracker"
            className="flex items-center gap-1 text-xs font-bold text-violet-600"
          >
            ট্র্যাকার <ArrowRight size={14} />
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="py-5 text-center text-sm text-violet-500">
            এখনো কোনো Focus Session শেষ করোনি।
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-violet-100 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-violet-900">
                    {item.subject.icon} {item.subject.name}
                  </p>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                    {formatTimer(item.elapsedSeconds)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-violet-500">
                  {formatDate(item.startedAt)}
                </p>

                <p className="mt-1 text-sm text-violet-700">
                  {formatClock(item.startedAt)} –{' '}
                  {formatClock(item.endedAt ?? item.startedAt)}
                </p>

                {item.trackerEntryId && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    ✓ Tracker-এ সংরক্ষিত
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-center text-xs leading-6 text-violet-500">
        Focus Time শুধু তোমার নিজের Account-এ সংরক্ষিত।
        অন্য Friends বা Group Members তোমার Session Details দেখতে পাবে না।
      </div>
    </div>
  );
}
