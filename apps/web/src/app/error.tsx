// ============================================================
// Path: apps/web/src/app/error.tsx
// ============================================================

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          🙀
        </motion.div>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">
          উফ! কিছু একটা ভুল হয়েছে
        </h1>
        <p className="text-primary-600 mb-6 text-sm">
          চিন্তা নেই, আবার চেষ্টা করো। যদি সমস্যা থেকে যায়, একটু পরে আসো। 🐱
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={reset}>
            <RefreshCw size={16} />
            আবার চেষ্টা করো
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary">
              <Home size={16} />
              হোমে যাও
            </Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}