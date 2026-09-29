// ============================================================
// Path: apps/web/src/app/(app)/goals/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Loader2, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { toBnDigits, formatMinutesShort, formatBnDate } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useConfetti } from '@/lib/hooks/use-confetti';


interface Subject {
  id: string;
  name: string;
  icon: string;
}

interface Goal {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  targetMinutes: number | null;
  targetChapters: number | null;
  subjectId: string | null;
  subject: { id: string; name: string; color: string; icon: string } | null;
  isCompleted: boolean;
  startsAt: string;
  endsAt: string;
  progressPercent: number;
  currentMinutes: number;
  currentChapters: number;
  isAchieved: boolean;
  daysRemaining: number;
}

const TYPE_LABEL: Record<Goal['type'], string> = {
  DAILY: 'আজকের',
  WEEKLY: 'সাপ্তাহিক',
  MONTHLY: 'মাসিক',
};

const TYPE_EMOJI: Record<Goal['type'], string> = {
  DAILY: '🌤️',
  WEEKLY: '📅',
  MONTHLY: '🗓️',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [open, setOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Goal['type']>('DAILY');
  const [targetMinutes, setTargetMinutes] = useState(120);
  const [targetChapters, setTargetChapters] = useState<number | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [g, s] = await Promise.all([
        api.get<{ success: true; data: Goal[] }>('/goals'),
        api.get<{ success: true; data: Subject[] }>('/subjects'),
      ]);
      setGoals(g.data);
      setSubjects(s.data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle('');
    setType('DAILY');
    setTargetMinutes(120);
    setTargetChapters('');
    setSubjectId('');
  };

  const create = async () => {
    if (!title.trim()) {
      toast.error('লক্ষ্যের নাম দাও');
      return;
    }
    if (!targetMinutes && !targetChapters) {
      toast.error('সময় অথবা অধ্যায় লক্ষ্য দাও');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ success: true; message: string }>('/goals', {
        title: title.trim(),
        type,
        targetMinutes: targetMinutes || undefined,
        targetChapters: targetChapters || undefined,
        subjectId: subjectId || undefined,
      });
      toast.success(res.message);
      setOpen(false);
      resetForm();
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const { fire } = useConfetti();

      const markComplete = async (g: Goal) => {
      try {
        const res = await api.patch<{ success: true; message: string }>(`/goals/${g.id}`, {
          isCompleted: true,
        });
        fire(); // 🎉 confetti
        toast.success('লক্ষ্য পূরণ! 🎉');
        await load();
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'সমস্যা হয়েছে');
      }
    };

  const remove = async (g: Goal) => {
    if (!confirm(`"${g.title}" লক্ষ্যটি মুছে ফেলবে?`)) return;
    try {
      await api.del(`/goals/${g.id}`);
      toast.success('লক্ষ্য মুছে ফেলা হয়েছে');
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'মুছতে সমস্যা');
    }
  };

  const filtered = goals.filter((g) =>
    tab === 'active' ? !g.isCompleted : g.isCompleted,
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          🎯
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
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            লক্ষ্য 🎯
          </h1>
          <p className="text-sm text-primary-500 mt-1">
            ছোট ছোট লক্ষ্য দাও, প্রতিদিন একটু একটু করে এগোও
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus size={16} />
          নতুন
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full bg-lavender-100 rounded-2xl p-1">
          <TabsTrigger value="active">
            চলমান ({toBnDigits(goals.filter((g) => !g.isCompleted).length)})
          </TabsTrigger>
          <TabsTrigger value="completed">
            সম্পন্ন ({toBnDigits(goals.filter((g) => g.isCompleted).length)})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <div className="text-5xl mb-2">🌸</div>
          <p className="text-sm text-primary-500 mb-4">
            {tab === 'active' ? 'এখনো কোনো লক্ষ্য নেই। একটা বানাও!' : 'এখনো কিছু সম্পন্ন হয়নি, চেষ্টা চালিয়ে যাও!'}
          </p>
          {tab === 'active' && (
            <Button onClick={() => setOpen(true)} variant="soft">
              <Plus size={16} />
              প্রথম লক্ষ্য বানাও
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((g) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="card-soft p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="rounded-2xl bg-lavender-100 p-2.5 text-2xl shrink-0">
                    {TYPE_EMOJI[g.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-800 truncate">{g.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge color="primary">{TYPE_LABEL[g.type]}</Badge>
                      {g.subject && (
                        <Badge color="pink">
                          {g.subject.icon} {g.subject.name}
                        </Badge>
                      )}
                      {!g.isCompleted && g.daysRemaining > 0 && (
                        <Badge color="peach">
                          <Calendar size={10} />
                          {toBnDigits(g.daysRemaining)} দিন বাকি
                        </Badge>
                      )}
                      {g.isCompleted && <Badge color="mint">✓ সম্পন্ন</Badge>}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(g)}
                    className="text-primary-300 hover:text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  {g.targetMinutes && (
                    <div>
                      <div className="flex justify-between text-xs text-primary-500 mb-1">
                        <span>⏱️ {formatMinutesShort(g.currentMinutes)} / {formatMinutesShort(g.targetMinutes)}</span>
                        <span>{toBnDigits(Math.min(100, Math.round((g.currentMinutes / g.targetMinutes) * 100)))}%</span>
                      </div>
                      <Progress value={Math.min(100, (g.currentMinutes / g.targetMinutes) * 100)} />
                    </div>
                  )}
                  {g.targetChapters && (
                    <div>
                      <div className="flex justify-between text-xs text-primary-500 mb-1">
                        <span>📕 {toBnDigits(g.currentChapters)} / {toBnDigits(g.targetChapters)} অধ্যায়</span>
                        <span>{toBnDigits(Math.min(100, Math.round((g.currentChapters / g.targetChapters) * 100)))}%</span>
                      </div>
                      <Progress
                        value={Math.min(100, (g.currentChapters / g.targetChapters) * 100)}
                        indicatorClassName="bg-gradient-to-r from-mint-300 to-mint-500"
                      />
                    </div>
                  )}
                </div>

                {!g.isCompleted && g.isAchieved && (
                  <Button
                    onClick={() => markComplete(g)}
                    variant="soft"
                    size="sm"
                    className="mt-3 w-full"
                  >
                    <CheckCircle2 size={14} />
                    লক্ষ্য পূরণ হয়েছে — সম্পন্ন করো
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>নতুন লক্ষ্য বানাও 🎯</DialogTitle>
          <DialogDescription>
            ছোট, পরিষ্কার লক্ষ্য সবচেয়ে ভালো কাজ করে
          </DialogDescription>

          <div className="space-y-4 mt-2">
            <div>
              <Label>লক্ষ্যের নাম</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: প্রতিদিন ২ ঘণ্টা পড়ব"
                maxLength={120}
              />
            </div>

            <div>
              <Label>ধরন</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={
                      'rounded-2xl border-2 py-2.5 text-sm font-medium transition-all ' +
                      (type === t
                        ? 'border-primary-400 bg-lavender-100 text-primary-700'
                        : 'border-primary-100 bg-white text-primary-500')
                    }
                  >
                    {TYPE_EMOJI[t]} {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>লক্ষ্য (মিনিট)</Label>
                <Input
                  type="number"
                  min={0}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>লক্ষ্য (অধ্যায়)</Label>
                <Input
                  type="number"
                  min={0}
                  value={targetChapters}
                  onChange={(e) =>
                    setTargetChapters(e.target.value ? Number(e.target.value) : '')
                  }
                  placeholder="ঐচ্ছিক"
                />
              </div>
            </div>

            <div>
              <Label>বিষয় (ঐচ্ছিক)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setSubjectId('')}
                  className={
                    'rounded-2xl border-2 px-3 py-1.5 text-sm font-medium ' +
                    (!subjectId
                      ? 'border-primary-400 bg-lavender-100 text-primary-700'
                      : 'border-primary-100 bg-white text-primary-500')
                  }
                >
                  সব বিষয়
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubjectId(s.id)}
                    className={
                      'rounded-2xl border-2 px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1 ' +
                      (subjectId === s.id
                        ? 'border-primary-400 bg-lavender-100 text-primary-700'
                        : 'border-primary-100 bg-white text-primary-500')
                    }
                  >
                    <span>{s.icon}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="secondary" className="flex-1">
                  বাতিল
                </Button>
              </DialogClose>
              <Button onClick={create} loading={saving} className="flex-1">
                বানাও
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
  
}