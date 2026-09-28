// ============================================================
// Path: apps/web/src/app/page.tsx
// ============================================================

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, BarChart3, Flame, Sparkles, Star, Heart, Trophy } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { greetingBn } from '@/lib/bn';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Floating sparkles */}
          <div className="relative mx-auto mb-6 flex justify-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-7xl md:text-8xl"
            >
              🐱
            </motion.div>
            <Sparkles className="absolute -top-2 -right-2 text-primary-400 sparkle" size={28} />
            <Star className="absolute top-6 -left-4 text-star sparkle" size={22} fill="currentColor" />
            <Heart className="absolute bottom-0 -right-4 text-heart sparkle" size={20} fill="currentColor" />
          </div>

          <p className="text-sm text-primary-500 font-medium mb-2">
            {greetingBn()}! 🌸
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient">Study Buddy</span>
          </h1>
          <p className="mt-2 text-lg md:text-xl text-primary-700 font-medium">
            তোমার পড়াশোনার কিউট সঙ্গী 💜
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-primary-600/80 leading-relaxed">
            প্রতিদিন কতটা পড়লে, কোন বিষয়ে কতটা মন দিলে — সব ট্র্যাক করো, নিজের
            অগ্রগতি দেখো, আর AI-এর কাছ থেকে সহজ ভাষায় পরামর্শ পাও।
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-pink-soft-400 text-white font-semibold px-8 py-3.5 shadow-soft-lg hover:scale-[1.03] transition-transform"
              >
                <BarChart3 size={20} />
                ড্যাশবোর্ডে যাও
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-pink-soft-400 text-white font-semibold px-8 py-3.5 shadow-soft-lg hover:scale-[1.03] transition-transform"
                >
                  <Sparkles size={20} />
                  শুরু করো
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-primary-700 font-semibold px-8 py-3.5 shadow-soft hover:scale-[1.03] transition-transform border border-primary-100"
                >
                  লগইন
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-16 grid gap-4 md:grid-cols-3"
        >
          {[
            {
              icon: BookOpen,
              title: 'প্রতিদিনের ট্র্যাকার',
              desc: 'প্রতিদিন কী পড়লে, কতটা পড়লে — সহজে লিখে রাখো। বিষয়, সময়, মুড সব সংরক্ষণ হবে।',
              color: 'text-primary-500',
              bg: 'bg-lavender-100',
            },
            {
              icon: Flame,
              title: 'স্ট্রিক ও ব্যাজ',
              desc: 'প্রতিদিন পড়ার স্ট্রিক ধরে রাখো। নতুন ব্যাজ, XP আর লেভেল আপের আনন্দ নাও।',
              color: 'text-pink-soft-400',
              bg: 'bg-pink-soft-100',
            },
            {
              icon: BarChart3,
              title: 'স্মার্ট বিশ্লেষণ',
              desc: 'AI দিয়ে সাপ্তাহিক ও মাসিক রিপোর্ট। কোন বিষয়ে বেশি মন দিতে হবে, সহজ ভাষায় জানো।',
              color: 'text-peach-400',
              bg: 'bg-peach-100',
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="card-soft card-soft-hover p-6"
            >
              <div className={`inline-flex rounded-2xl p-3 ${f.bg} ${f.color} mb-4`}>
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">{f.title}</h3>
              <p className="text-sm text-primary-600/80 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Gamification preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 card-soft p-8 text-center"
        >
          <div className="flex justify-center gap-3 mb-3">
            <Trophy className="text-star" size={28} />
            <Star className="text-star" size={28} fill="currentColor" />
            <Heart className="text-heart" size={28} fill="currentColor" />
          </div>
          <h3 className="text-xl font-bold text-primary-800 mb-2">
            পড়াশোনা এখন আর একঘেয়ে নয় ✨
          </h3>
          <p className="text-sm text-primary-600/80 max-w-xl mx-auto leading-relaxed">
            স্ট্রিক, XP, ব্যাজ আর লিডারবোর্ড — সব মিলিয়ে পড়াশোনা হয়ে উঠবে একটা
            মজার যাত্রা। তুমি পারবে, Study Buddy পাশে আছে! 🐱
          </p>
        </motion.div>

        <footer className="mt-16 text-center text-sm text-primary-500/70">
          তৈরি হয়েছে 💜 দিয়ে — Study Buddy © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}