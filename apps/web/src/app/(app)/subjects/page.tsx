// ============================================================
// Path: apps/web/src/app/(app)/subjects/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
}

const PRESET_COLORS = [
  '#A78BFA', '#8B5CF6', '#F472B6', '#EC4899',
  '#FB923C', '#F59E0B', '#34D399', '#10B981',
  '#60A5FA', '#3B82F6', '#F87171', '#EF4444',
];

const PRESET_ICONS = ['📚', '📖', '🔤', '➗', '🔬', '💻', '🕌', '🌏', '📐', '🧮', '🎨', '🎵', '🧪', '⚗️', '📝', '🌿'];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ success: true; data: Subject[] }>('/subjects');
      setSubjects(res.data);
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

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setIcon(PRESET_ICONS[0]);
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setName(s.name);
    setColor(s.color);
    setIcon(s.icon);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('নাম দাও');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { color, icon };
        if (editing.isCustom) payload.name = name.trim();
        const res = await api.patch<{ success: true; message: string }>(
          `/subjects/${editing.id}`,
          payload,
        );
        toast.success(res.message);
      } else {
        const res = await api.post<{ success: true; message: string }>('/subjects', {
          name: name.trim(),
          color,
          icon,
        });
        toast.success(res.message);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Subject) => {
    if (!confirm(`"${s.name}" বিষয়টি মুছে ফেলবে?`)) return;
    try {
      const res = await api.del<{ success: true; message: string }>(`/subjects/${s.id}`);
      toast.success(res.message);
      await load();
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

  const defaults = subjects.filter((s) => !s.isCustom);
  const customs = subjects.filter((s) => s.isCustom);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between px-1 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            আমার বিষয়সমূহ 📖
          </h1>
          <p className="text-sm text-primary-500 mt-1">
            ডিফল্ট বিষয়গুলোর রং/আইকন বদলাতে পারো, এবং নিজের বিষয় যোগ করতে পারো
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          নতুন বিষয়
        </Button>
      </div>

      {/* Default subjects */}
      <div>
        <SectionHeader emoji="🎒" title="ডিফল্ট বিষয়" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {defaults.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-soft p-4 flex items-center gap-3"
            >
              <div
                className="rounded-2xl p-2.5 shrink-0"
                style={{ backgroundColor: `${s.color}22` }}
              >
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-800 truncate">{s.name}</p>
                <Badge color="gray" className="mt-1">ডিফল্ট</Badge>
              </div>
              <button
                onClick={() => openEdit(s)}
                className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-lavender-100 transition-colors"
                title="এডিট"
              >
                <Pencil size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom subjects */}
      <div>
        <SectionHeader emoji="✨" title={`আমার যোগ করা (${customs.length})`} />
        {customs.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <div className="text-4xl mb-2">🌟</div>
            <p className="text-sm text-primary-500 mb-4">
              এখনো কোনো কাস্টম বিষয় যোগ করোনি
            </p>
            <Button onClick={openCreate} variant="soft">
              <Plus size={16} />
              প্রথম বিষয় যোগ করো
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {customs.map((s, i) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-soft p-4 flex items-center gap-3"
                >
                  <div
                    className="rounded-2xl p-2.5 shrink-0"
                    style={{ backgroundColor: `${s.color}22` }}
                  >
                    <span className="text-2xl">{s.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-800 truncate">{s.name}</p>
                  </div>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-lavender-100"
                    title="এডিট"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="text-primary-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                    title="মুছো"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>
            {editing ? 'বিষয় এডিট করো' : 'নতুন বিষয় যোগ করো'}
          </DialogTitle>
          <DialogDescription>
            {editing?.isCustom === false
              ? 'ডিফল্ট বিষয়ের নাম পরিবর্তন করা যাবে না, তবে রং/আইকন বদলাতে পারো'
              : 'নাম, রং এবং আইকন বেছে নাও'}
          </DialogDescription>

          <div className="space-y-4 mt-2">
            {/* Preview */}
            <div className="flex justify-center">
              <div
                className="rounded-3xl p-4 flex items-center gap-3"
                style={{ backgroundColor: `${color}22` }}
              >
                <span className="text-4xl">{icon}</span>
                <span className="font-bold text-primary-800 text-lg">
                  {name || 'নতুন বিষয়'}
                </span>
              </div>
            </div>

            <div>
              <Label>নাম</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: উচ্চতর গণিত"
                disabled={editing?.isCustom === false}
                maxLength={40}
              />
            </div>

            <div>
              <Label>রং</Label>
              <div className="grid grid-cols-6 gap-2 mt-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={
                      'h-10 rounded-2xl transition-transform ' +
                      (color === c ? 'ring-2 ring-offset-2 ring-primary-400 scale-105' : 'hover:scale-105')
                    }
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>আইকন</Label>
              <div className="grid grid-cols-8 gap-2 mt-1.5">
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={
                      'h-10 rounded-2xl text-xl transition-transform ' +
                      (icon === ic
                        ? 'bg-lavender-200 ring-2 ring-primary-300 scale-105'
                        : 'bg-lavender-100 hover:bg-lavender-200 hover:scale-105')
                    }
                  >
                    {ic}
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
              <Button onClick={save} loading={saving} className="flex-1">
                {editing ? 'আপডেট করো' : 'যোগ করো'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}