// ============================================================
// Path: apps/web/src/app/(auth)/forgot-password/page.tsx
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, { skipAuth: true });
      toast.success('ইমেইলে কোড পাঠানো হয়েছে 📧');
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'কিছু একটা ভুল হয়েছে');
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
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex rounded-full bg-pink-soft-100 p-4 mb-3"
          >
            <KeyRound size={36} className="text-pink-soft-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-primary-800">পাসওয়ার্ড ভুলে গেছো?</h1>
          <p className="text-primary-600 mt-2 text-sm">
            চিন্তা নেই! ইমেইল দাও, আমরা রিসেট কোড পাঠাবো। 💜
          </p>
        </div>

        <div className="card-soft p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="munira@example.com"
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              রিসেট কোড পাঠাও
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-primary-600">
            মনে পড়েছে?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-800 font-semibold">
              লগইনে ফিরে যাও
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}