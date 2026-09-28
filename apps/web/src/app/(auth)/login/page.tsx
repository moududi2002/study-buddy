//apps/web/src/app/(auth)/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, AuthUser } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextUrl = params.get('next') || '/dashboard';
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{
        success: true;
        message: string;
        data: { user: AuthUser; accessToken: string };
      }>('/auth/login', { identifier, password, rememberMe });

      login(res.data.accessToken, res.data.user);
      toast.success(res.message);
      router.replace(nextUrl);
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || 'লগইন ব্যর্থ');
      toast.error(e.message || 'লগইন ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="text-6xl mb-2"
          >
            🐱
          </motion.div>

          <h1 className="text-3xl font-bold">
            <span className="text-gradient">Study Buddy</span>
          </h1>

          <p className="text-primary-600 mt-1">আবার স্বাগতম! 🌸</p>
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="identifier">ইমেইল অথবা ইউজারনেম</Label>
              <Input
                id="identifier"
                icon={<Mail size={18} />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="munira@example.com বা munira_2010"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-primary-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-primary-300 text-primary-500 focus:ring-primary-300"
                />
                মনে রাখো
              </label>

              <Link
                href="/forgot-password"
                className="text-primary-500 hover:text-primary-700 font-medium"
              >
                পাসওয়ার্ড ভুলে গেছো?
              </Link>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <Sparkles size={18} />
              লগইন করো
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-primary-600">
            অ্যাকাউন্ট নেই?{' '}
            <Link
              href="/register"
              className="text-primary-600 hover:text-primary-800 font-semibold"
            >
              নতুন অ্যাকাউন্ট খোলো
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}