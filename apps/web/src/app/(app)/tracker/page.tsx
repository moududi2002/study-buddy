// ============================================================
// Path: apps/web/src/app/(app)/tracker/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, BookOpen, Smile, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { formatMinutesShort, toBnDigits, formatBnDate } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
}

interface StudyEntry {
  id: string;
  subjectId: string;
  subject: { id: string; name: string; color: string; icon: string };
  date: string;
  durationMinutes: number;
  chapter: string | null;
  note: string | null;
  mood: 'HAPPY' | 'NEUTRAL' | 'SAD';
  createdAt: string;
}

interface TodayResponse {
  date: string;
  totalMinutes: number;
  totalEntries: number;
  distinctSubjects: number;
  entries: StudyEntry[];
}

const MOODS = [
  { value: 'HAPPY', emoji: '😊', label: 'দারুণ' },
  { value: 'NEUTRAL', emoji: '😐', label: 'ঠিকঠাক' },
  { value: 'SAD', emoji: '😔', label: 'কষ্ট হয়েছে' },
] as const;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TrackerPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState(30);
  const [chapter, setChapter] = useState('');
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<'HAPPY' | 'NEUTRAL' | 'SAD'>('HAPPY');


  const fire = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };


  const loadToday = async () => {
    const res = await api.get<{ success: true; data: TodayResponse }>('/study-entries/today');
    setToday(res.data);
  };

  const loadSubjects = async () => {
    const res = await api.get<{ success: true; data: Subject[] }>('/subjects');
    setSubjects(res.data);
    if (!subjectId && res.data.length > 0) setSubjectId(res.data[0].id);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadToday(), loadSubjects()]);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'লোড করতে সমস্যা');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error('একটি বিষয় বাছাই করো');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ success: true; message: string; data: { xpGained: number } }>(
        '/study-entries',
        {
          subjectId,
          date,
          durationMinutes: duration,
          chapter: chapter || undefined,
          note: note || undefined,
          mood,
        },
      );
      toast.success(`${res.message} +${toBnDigits(res.data.xpGained)} XP 🌟`);

        if (res.data.xpGained > 0) {
          // optional: only big XP
          fire();
       }
      setChapter('');
      setNote('');
      setDuration(30);
      await loadToday();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সংরক্ষণ করা যায়নি');
    } finally {
      setSubmitting(false);
    }
  };  
    
   
   
    

  const remove = async (id: string) => {
    if (!confirm('এই এন্ট্রি মুছে ফেলবে?')) return;
    try {
      await api.del(`/study-entries/${id}`);
      toast.success('এন্ট্রি মুছে ফেলা হয়েছে');
      await loadToday();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'মুছতে সমস্যা');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          📚
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
          আজকের ট্র্যাকার 📝
        </h1>
        <p className="text-sm text-primary-500 mt-1">
          আজ যা পড়েছো সেটা লিখে রাখো — ছোট ছোট ধাপেই বড় অগ্রগতি 🌱
        </p>
      </div>

      {/* Today summary */}
      {today && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card-soft p-4 text-center">
            <Clock size={18} className="text-primary-500 mx-auto mb-1" />
            <p className="text-xs text-primary-500">মোট সময়</p>
            <p className="text-lg font-bold text-primary-800">
              {formatMinutesShort(today.totalMinutes)}
            </p>
          </div>
          <div className="card-soft p-4 text-center">
            <BookOpen size={18} className="text-pink-soft-400 mx-auto mb-1" />
            <p className="text-xs text-primary-500">এন্ট্রি</p>
            <p className="text-lg font-bold text-primary-800">
              {toBnDigits(today.totalEntries)}
            </p>
          </div>
          <div className="card-soft p-4 text-center">
            <Smile size={18} className="text-peach-400 mx-auto mb-1" />
            <p className="text-xs text-primary-500">বিষয়</p>
            <p className="text-lg font-bold text-primary-800">
              {toBnDigits(today.distinctSubjects)}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card-soft p-5">
        <SectionHeader emoji="➕" title="নতুন এন্ট্রি" />
        <form onSubmit={submit} className="space-y-4">
          {/* Subject chips */}
          <div>
            <Label>বিষয়</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(s.id)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 text-sm font-medium transition-all ' +
                    (subjectId === s.id
                      ? 'border-primary-400 bg-lavender-100 text-primary-700 scale-105'
                      : 'border-primary-100 bg-white text-primary-500 hover:border-primary-300')
                  }
                >
                  <span>{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>তারিখ</Label>
              <Input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>সময় (মিনিট)</Label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Quick duration */}
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDuration(m)}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
                  (duration === m
                    ? 'bg-primary-500 text-white'
                    : 'bg-lavender-100 text-primary-600 hover:bg-lavender-200')
                }
              >
                {toBnDigits(m)} মিনিট
              </button>
            ))}
          </div>

          <div>
            <Label>অধ্যায় (ঐচ্ছিক)</Label>
            <Input
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="যেমন: অধ্যায় ৩ - বীজগণিত"
              maxLength={120}
            />
          </div>

          <div>
            <Label>নোট (ঐচ্ছিক)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="আজ কী শিখলে?"
              maxLength={500}
              rows={2}
              className="w-full rounded-2xl border border-primary-200 bg-white px-4 py-3 outline-none focus:border-primary-400 focus:ring-2 focus:ring-lavender-200 text-primary-900 placeholder:text-primary-300 resize-none"
            />
          </div>

          {/* Mood */}
          <div>
            <Label>আজ কেমন লাগলো?</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={
                    'rounded-2xl border-2 py-2.5 text-sm font-medium transition-all ' +
                    (mood === m.value
                      ? 'border-primary-400 bg-lavender-100 text-primary-700 scale-105'
                      : 'border-primary-100 bg-white text-primary-500 hover:border-primary-300')
                  }
                >
                  <span className="text-xl block">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" loading={submitting} size="lg" className="w-full">
            <Plus size={18} />
            এন্ট্রি যোগ করো
          </Button>
        </form>
      </div>

      {/* Today's entries */}
      <div>
        <SectionHeader emoji="📖" title="আজকের এন্ট্রি" />
        {!today || today.entries.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <div className="text-4xl mb-2">🌸</div>
            <p className="text-sm text-primary-500">
              আজ এখনো কোনো এন্ট্রি নেই। উপরের form দিয়ে শুরু করো!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {today.entries.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="card-soft p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="rounded-2xl p-2.5 shrink-0"
                      style={{ backgroundColor: `${e.subject.color}22` }}
                    >
                      <span className="text-xl">{e.subject.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-primary-800 text-sm">
                          {e.subject.name}
                        </p>
                        <Badge color="primary">
                          {formatMinutesShort(e.durationMinutes)}
                        </Badge>
                        <span className="text-lg">
                          {MOODS.find((m) => m.value === e.mood)?.emoji}
                        </span>
                      </div>
                      {e.chapter && (
                        <p className="text-xs text-primary-500 mt-1 truncate">
                          📕 {e.chapter}
                        </p>
                      )}
                      {e.note && (
                        <p className="text-xs text-primary-600 mt-1 italic">
                          "{e.note}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(e.id)}
                      className="text-primary-300 hover:text-red-500 transition-colors p-1"
                      title="মুছে ফেলো"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
 }