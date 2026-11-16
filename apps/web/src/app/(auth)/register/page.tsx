// ============================================================
// Path: apps/web/src/app/(auth)/register/page.tsx
// ============================================================


'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AtSign,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react';

import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  AcademicSelector,
  AcademicGroup,
} from '@/components/academic/academic-selector';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    classLevel: 9,
    academicGroup: null as AcademicGroup | null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canRegister =
    form.fullName.trim().length >= 2 &&
    form.email.includes('@') &&
    form.username.length >= 3 &&
    form.password.length >= 8 &&
    (form.classLevel <= 8 || form.academicGroup !== null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canRegister || loading) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
        classLevel: form.classLevel,
        ...(form.classLevel >= 9 && {
          academicGroup: form.academicGroup,
        }),
      });

      toast.success('অ্যাকাউন্ট তৈরি হয়েছে! 🎉');

      router.replace(
        `/verify-email?email=${encodeURIComponent(
          form.email.trim().toLowerCase(),
        )}`,
      );
    } catch (err) {
      const message =
        (err as ApiError).message ||
        'রেজিস্ট্রেশন সম্পন্ন করা যায়নি';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -35, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="mb-7 text-center">
          <motion.div
            animate={{
              y: [0, -7, 0],
              rotate: [0, -4, 4, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
            className="text-6xl"
          >
            🐱
          </motion.div>

          <h1 className="mt-3 text-3xl font-extrabold text-violet-900 sm:text-4xl">
            Study Buddy
          </h1>

          <p className="mt-2 text-sm text-violet-600">
            তোমার নিজের পড়াশোনার জগৎ তৈরি করো ✨
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-violet-100 backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Sparkles size={14} />
              নতুন একাডেমিক যাত্রা
            </div>

            <h2 className="mt-3 text-2xl font-bold text-violet-900">
              অ্যাকাউন্ট তৈরি করো
            </h2>

            <p className="mt-1 text-sm text-violet-500">
              তোমার তথ্য শুধুমাত্র তোমার নিজের পড়াশোনা সাজাতে ব্যবহার হবে।
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="register-name">তোমার নাম</Label>
                <Input
                  id="register-name"
                  icon={<User size={17} />}
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fullName: e.target.value,
                    }))
                  }
                  placeholder="তোমার পুরো নাম"
                  required
                  minLength={2}
                  maxLength={60}
                />
              </div>

              <div>
                <Label htmlFor="register-username">
                  ইউজারনেম
                </Label>
                <Input
                  id="register-username"
                  icon={<AtSign size={17} />}
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      username: e.target.value.replace(
                        /[^a-zA-Z0-9_]/g,
                        '',
                      ),
                    }))
                  }
                  placeholder="your_username"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="register-email">ইমেইল</Label>
              <Input
                id="register-email"
                type="email"
                icon={<Mail size={17} />}
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value,
                  }))
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="rounded-3xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
              <AcademicSelector
                classLevel={form.classLevel}
                academicGroup={form.academicGroup}
                onClassChange={(classLevel) =>
                  setForm((f) => ({
                    ...f,
                    classLevel,
                    academicGroup:
                      classLevel <= 8 ? null : f.academicGroup,
                  }))
                }
                onGroupChange={(academicGroup) =>
                  setForm((f) => ({
                    ...f,
                    academicGroup,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="register-password">
                পাসওয়ার্ড
              </Label>

              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  icon={<Lock size={17} />}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      password: e.target.value,
                    }))
                  }
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? 'পাসওয়ার্ড লুকাও'
                      : 'পাসওয়ার্ড দেখাও'
                  }
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-800"
                >
                  {showPassword
                    ? <EyeOff size={17} />
                    : <Eye size={17} />}
                </button>
              </div>

              <p className="mt-2 text-xs text-violet-500">
                {form.password.length >= 8
                  ? '✓ পাসওয়ার্ডের দৈর্ঘ্য ঠিক আছে'
                  : 'নিরাপদ পাসওয়ার্ড ব্যবহার করো।'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            <motion.div whileHover={{ scale: 1.01 }}>
              <Button
                type="submit"
                loading={loading}
                disabled={!canRegister || loading}
                className="w-full"
              >
                <BookOpen size={17} />
                অ্যাকাউন্ট তৈরি করো
                <ArrowRight size={17} />
              </Button>
            </motion.div>
          </form>

          <p className="mt-6 text-center text-sm text-violet-600">
            আগেই অ্যাকাউন্ট আছে?{' '}
            <Link
              href="/login"
              className="font-bold text-violet-800 underline underline-offset-4"
            >
              লগইন করো
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
