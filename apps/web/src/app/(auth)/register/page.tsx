// ============================================================
// Path: apps/web/src/app/(auth)/register/page.tsx
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AtSign, GraduationCap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, AuthUser } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    classLevel: 9,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{
        success: true;
        message: string;
        data: { user: AuthUser; accessToken: string };
      }>('/auth/register', form);

      login(res.data.accessToken, res.data.user);
      toast.success('অ্যাকাউন্ট তৈরি হয়েছে! 🎉');
      router.replace('/verify-email');
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || 'রেজিস্ট্রেশন ব্যর্থ');
      toast.error(e.message || 'রেজিস্ট্রেশন ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl mb-2"
          >
            🐱
          </motion.div>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">Study Buddy</span>
          </h1>
          <p className="text-primary-600 mt-1">তোমার পড়াশোনার যাত্রা শুরু হোক! ✨</p>
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">তোমার নাম</Label>
              <Input
                id="fullName"
                icon={<User size={18} />}
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="সিরাজুম মুনিরা"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                icon={<Mail size={18} />}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="munira@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label htmlFor="username">ইউজারনেম</Label>
              <Input
                id="username"
                icon={<AtSign size={18} />}
                value={form.username}
                onChange={(e) => set('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="munira_2010"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <Label htmlFor="classLevel">তুমি কোন ক্লাসে পড়ো?</Label>
              <div className="grid grid-cols-5 gap-2">
                {[6, 7, 8, 9, 10].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('classLevel', c)}
                    className={
                      'rounded-2xl border-2 py-2.5 font-semibold transition-all ' +
                      (form.classLevel === c
                        ? 'border-primary-400 bg-lavender-100 text-primary-700 scale-105'
                        : 'border-primary-100 bg-white text-primary-500 hover:border-primary-300')
                    }
                  >
                    {['৬', '৭', '৮', '৯', '১০'][c - 6]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                icon={<Lock size={18} />}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <Sparkles size={18} />
              শুরু করি!
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-primary-600">
            অ্যাকাউন্ট আছে?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-800 font-semibold">
              লগইন করো
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}