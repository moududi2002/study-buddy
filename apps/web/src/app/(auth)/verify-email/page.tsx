// ============================================================
// Path: apps/web/src/app/(auth)/verify-email/page.tsx
// ============================================================

'use client';

import { useEffect, useState,Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, AuthUser } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const user = useAuthStore((s) => s.user);

  const emailFromUrl = searchParams.get('email') || '';
  const email = emailFromUrl || user?.email || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // If there is no email available, go back to register
  useEffect(() => {
    if (!email) {
      router.replace('/register');
    }
  }, [email, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('ইমেইল পাওয়া যায়নি');
      router.replace('/register');
      return;
    }

    if (otp.length !== 6) {
      toast.error('৬ সংখ্যার কোড দাও');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<{
        success: true;
        message: string;
        data: {
          user: AuthUser;
          accessToken: string;
        };
      }>(
        '/auth/verify-email',
        {
          email,
          otp,
        },
        {
          skipAuth: true,
        },
      );

      // Login ONLY after successful email verification
      useAuthStore
        .getState()
        .login(res.data.accessToken, res.data.user);

      toast.success(res.message);

      router.replace('/dashboard');
    } catch (err) {
      const e = err as ApiError;

      toast.error(e.message || 'কোড ভুল অথবা মেয়াদ শেষ হয়ে গেছে');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      toast.error('ইমেইল পাওয়া যায়নি');
      router.replace('/register');
      return;
    }

    setResending(true);

    try {
      const res = await api.post<{ success: true; message: string }>(
        '/auth/send-otp',
        { email },
        { skipAuth: true },
      );

      toast.success(res.message);
      setOtp('');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'কোড পাঠানো যায়নি');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

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
            className="inline-flex rounded-full bg-lavender-100 p-4 mb-3"
          >
            <MailCheck size={40} className="text-primary-500" />
          </motion.div>

          <h1 className="text-2xl font-bold text-primary-800">
            ইমেইল যাচাই করো
          </h1>

          <p className="text-primary-600 mt-2 text-sm">
            তোমার ইমেইলে একটি ৬-সংখ্যার কোড পাঠিয়েছি।
          <p>📩 মেইলের ইনবক্স থেকে দৌড়ে গিয়ে নিয়ে আসো 🏃‍♀️</p>
          </p>

          <p className="text-primary-800 mt-1 text-sm font-semibold break-all">
            {email}
          </p>
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={loading}
            />

            <Button
              type="submit"
              loading={loading}
              disabled={otp.length !== 6}
              className="w-full"
              size="lg"
            >
              যাচাই করো
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-primary-600">
            কোড পাওনি?{' '}
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-semibold disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={resending ? 'animate-spin' : ''}
              />
              আবার পাঠাও
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-primary-400">
          ডেভ মোডে কোড backend টার্মিনালে প্রিন্ট হয় 🐱 ||
        <p>ইমেইল যাচাই না করলে অ্যাকাউন্টে প্রবেশ করা যাবে না। </p>
        </p>
      </motion.div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}