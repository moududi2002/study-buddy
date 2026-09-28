// ============================================================
// Path: apps/web/src/app/(auth)/verify-email/page.tsx
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';

export default function VerifyEmailPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (otp.length < 6) {
      toast.error('৬ সংখ্যার কোড দাও');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ success: true; message: string }>(
        '/auth/verify-email',
        { email: user.email, otp },
        { skipAuth: true },
      );
      toast.success(res.message);
      // update local user
      useAuthStore.getState().setUser({ ...user, isEmailVerified: true });
      router.replace('/dashboard');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'কোড ভুল');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      const res = await api.post<{ success: true; message: string }>(
        '/auth/send-otp',
        { email: user.email },
        { skipAuth: true },
      );
      toast.success(res.message);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'পাঠানো যায়নি');
    } finally {
      setResending(false);
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
            className="inline-flex rounded-full bg-lavender-100 p-4 mb-3"
          >
            <MailCheck size={40} className="text-primary-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-primary-800">ইমেইল যাচাই করো</h1>
          <p className="text-primary-600 mt-2 text-sm">
            তোমার ইমেইলে একটি ৬-সংখ্যার কোড পাঠানো হয়েছে।
            {user?.email && (
              <>
                {' '}
                <span className="font-semibold">{user.email}</span>
              </>
            )}
          </p>
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />

            <Button
              type="submit"
              loading={loading}
              disabled={otp.length < 6}
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
              <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
              আবার পাঠাও
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-primary-400">
          ডেভ মোডে কোড backend টার্মিনালে প্রিন্ট হয় 🐱
        </p>
      </motion.div>
    </main>
  );
}