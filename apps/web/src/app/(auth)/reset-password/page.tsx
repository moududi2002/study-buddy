// ============================================================
// Path: apps/web/src/app/(auth)/reset-password/page.tsx
// ============================================================

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('ইমেইল পাওয়া যায়নি, আবার শুরু করো');
      router.push('/forgot-password');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<{ success: true; message: string }>(
        '/auth/reset-password',
        { email, otp, newPassword },
        { skipAuth: true },
      );

      toast.success(res.message);
      router.replace('/login');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'রিসেট ব্যর্থ');
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
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-primary-800">
            নতুন পাসওয়ার্ড দাও
          </h1>

          {email && (
            <p className="text-primary-600 mt-2 text-sm">{email}</p>
          )}
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label>ইমেইলে পাঠানো কোড</Label>

              <div className="mt-2">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">নতুন পাসওয়ার্ড</Label>

              <Input
                id="newPassword"
                type="password"
                icon={<Lock size={18} />}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
                minLength={8}
                required
              />
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={otp.length < 6 || newPassword.length < 8}
              className="w-full"
              size="lg"
            >
              পাসওয়ার্ড পরিবর্তন করো
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}