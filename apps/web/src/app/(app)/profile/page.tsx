// ============================================================
// Path: apps/web/src/app/(app)/profile/page.tsx
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Save, LogOut, Trash2, Loader2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, API_URL } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toBnDigits, formatMinutesShort, formatBnDate } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatCard } from '@/components/dashboard/stat-card';
import { Flame, Trophy, Star, Clock } from 'lucide-react';

const PRESET_AVATARS = [
  { key: 'cat_smile', emoji: '😺', label: 'হাসিখুশি বিড়াল' },
  { key: 'cat_sleepy', emoji: '😴', label: 'ঘুমন্ত বিড়াল' },
  { key: 'cat_wink', emoji: '😸', label: 'চোখ টেপা বিড়াল' },
  { key: 'cat_reader', emoji: '📖', label: 'পড়ুয়া বিড়াল' },
  { key: 'cat_star', emoji: '🌟', label: 'স্টার বিড়াল' },
  { key: 'cat_heart', emoji: '💖', label: 'ভালোবাসা বিড়াল' },
  { key: 'bunny_happy', emoji: '🐰', label: 'খুশি খরগোশ' },
  { key: 'bunny_reader', emoji: '📚', label: 'পড়ুয়া খরগোশ' },
];

interface Stats {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  totalEntries: number;
  weekStudyMinutes: number;
  badgeCount: number;
  subjectCount: number;
  activeGoals: number;
  lastStudyDate: string | null;
}

interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  classLevel: number;
  avatarUrl: string | null;
  role: string;
  xp: number;
  level: number;
  createdAt: string;
  hasGoogleLinked: boolean;
isEmailVerified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [classLevel, setClassLevel] = useState(9);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get<{ success: true; data: Profile }>('/users/me'),
        api.get<{ success: true; data: Stats }>('/users/me/stats'),
      ]);
      setProfile(p.data);
      setStats(s.data);
      setFullName(p.data.fullName);
      setClassLevel(p.data.classLevel);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: true; message: string; data: Profile }>(
        '/users/me',
        { fullName, classLevel },
      );
      toast.success(res.message);
      setProfile({ ...profile!, ...res.data });
      if (user) {
        setUser({ ...user, fullName: res.data.fullName, classLevel: res.data.classLevel });
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'আপডেট করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ছবি ২ মেগাবাইটের কম হতে হবে');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<{ id: string; avatarUrl: string }>(
        '/users/me/avatar',
        fd,
      );
      toast.success('প্রোফাইল ছবি আপডেট হয়েছে');
      setProfile({ ...profile!, avatarUrl: res.data.avatarUrl });
      if (user) setUser({ ...user, avatarUrl: res.data.avatarUrl });
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = async (preset: string) => {
    try {
      const res = await api.post<{ success: true; message: string; data: { avatarUrl: string } }>(
        '/users/me/avatar/preset',
        { preset },
      );
      toast.success('অ্যাভাটার পরিবর্তন হয়েছে');
      setProfile({ ...profile!, avatarUrl: res.data.avatarUrl });
      if (user) setUser({ ...user, avatarUrl: res.data.avatarUrl });
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'পরিবর্তন হয়নি');
    }
  };

  const removeAvatar = async () => {
    try {
      await api.del('/users/me/avatar');
      toast.success('অ্যাভাটার মুছে ফেলা হয়েছে');
      setProfile({ ...profile!, avatarUrl: null });
      if (user) setUser({ ...user, avatarUrl: null });
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'মুছতে সমস্যা');
    }
  };

  const deactivate = async () => {
    if (!confirm('তুমি কি সত্যিই অ্যাকাউন্ট নিষ্ক্রিয় করতে চাও? সব ডেটা সংরক্ষিত থাকবে, কিন্তু লগইন করতে পারবে না।')) return;
    try {
      await api.del('/users/me');
      toast.success('অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে');
      await logout();
      router.replace('/login');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সমস্যা হয়েছে');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !profile || !stats) {
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

  const presetEmoji = profile.avatarUrl?.startsWith('preset:')
    ? PRESET_AVATARS.find((p) => p.key === profile.avatarUrl?.replace('preset:', ''))?.emoji ?? '🐱'
    : profile.fullName[0];

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          আমার প্রোফাইল 🐱
        </h1>
      </div>

      {/* Avatar + name */}
      <div className="card-soft p-6 flex flex-col items-center text-center">
        <div className="relative">
          <Avatar className="h-24 w-24 ring-4 ring-lavender-200">
            {profile.avatarUrl && !profile.avatarUrl.startsWith('preset:') && (
              <AvatarImage src={profile.avatarUrl} />
            )}
            <AvatarFallback className="text-4xl">{presetEmoji}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-soft hover:scale-110 transition-transform disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Camera size={16} />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = '';
            }}
          />
        </div>
        <h2 className="mt-3 text-xl font-bold text-primary-800">{profile.fullName}</h2>
        <p className="text-sm text-primary-500">@{profile.username}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Badge color="primary">ক্লাস {toBnDigits(profile.classLevel)}</Badge>
          <Badge color="pink">লেভেল {toBnDigits(profile.level)}</Badge>
          <Badge color={profile.isEmailVerified ? 'mint' : 'peach'}>
            {profile.isEmailVerified ? '✓ যাচাইকৃত' : 'যাচাই হয়নি'}
          </Badge>
        </div>
        <p className="text-xs text-primary-400 mt-2">
          যোগ দিয়েছো {formatBnDate(profile.createdAt)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="মোট পড়া"
          value={formatMinutesShort(stats.totalStudyMinutes)}
          color="primary"
        />
        <StatCard
          icon={Flame}
          label="স্ট্রিক"
          value={`${toBnDigits(stats.currentStreak)} দিন`}
          sublabel={`সর্বোচ্চ ${toBnDigits(stats.longestStreak)}`}
          color="peach"
        />
        <StatCard
          icon={Trophy}
          label="ব্যাজ"
          value={toBnDigits(stats.badgeCount)}
          color="pink"
        />
        <StatCard
          icon={Star}
          label="XP"
          value={toBnDigits(stats.xp)}
          color="mint"
        />
      </div>

      {/* Preset avatars */}
      <div className="card-soft p-5">
        <SectionHeader emoji="🎨" title="কিউট অ্যাভাটার বেছে নাও" />
        <div className="grid grid-cols-4 gap-3">
          {PRESET_AVATARS.map((p) => {
            const isSelected = profile.avatarUrl === `preset:${p.key}`;
            return (
              <button
                key={p.key}
                onClick={() => selectPreset(p.key)}
                className={
                  'rounded-2xl p-2 transition-all flex flex-col items-center gap-1 ' +
                  (isSelected
                    ? 'bg-lavender-200 ring-2 ring-primary-300 scale-105'
                    : 'bg-lavender-100 hover:bg-lavender-200 hover:scale-105')
                }
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-[10px] text-primary-600 text-center leading-tight">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
        {profile.avatarUrl && (
          <button
            onClick={removeAvatar}
            className="mt-3 text-xs text-primary-400 hover:text-red-500 flex items-center gap-1 mx-auto"
          >
            <Trash2 size={12} />
            অ্যাভাটার মুছে ফেলো
          </button>
        )}
      </div>

      {/* Edit form */}
      <div className="card-soft p-5">
        <SectionHeader emoji="✏️" title="তথ্য আপডেট করো" />
        <div className="space-y-4">
          <div>
            <Label>নাম</Label>
            <Input
              icon={<UserIcon size={16} />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div>
            <Label>ক্লাস</Label>
            <div className="grid grid-cols-5 gap-2">
              {[6, 7, 8, 9, 10].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassLevel(c)}
                  className={
                    'rounded-2xl border-2 py-2.5 font-semibold transition-all ' +
                    (classLevel === c
                      ? 'border-primary-400 bg-lavender-100 text-primary-700 scale-105'
                      : 'border-primary-100 bg-white text-primary-500')
                  }
                >
                  {['৬', '৭', '৮', '৯', '১০'][c - 6]}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={save} loading={saving} className="w-full">
            <Save size={16} />
            সংরক্ষণ করো
          </Button>
        </div>
      </div>

      {/* Account actions */}
      <div className="card-soft p-5 space-y-3">
        <SectionHeader emoji="⚙️" title="অ্যাকাউন্ট" />
        <Button onClick={handleLogout} variant="secondary" className="w-full">
          <LogOut size={16} />
          লগআউট করো
        </Button>
        <Button onClick={deactivate} variant="danger" className="w-full">
          <Trash2 size={16} />
          অ্যাকাউন্ট নিষ্ক্রিয় করো
        </Button>
      </div>

      <p className="text-center text-xs text-primary-400 pb-4">
        Study Buddy · তৈরি হয়েছে 💜 দিয়ে
      </p>
    </div>
  );
}