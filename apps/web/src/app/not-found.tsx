// ============================================================
// Path: apps/web/src/app/not-found.tsx
// ============================================================

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          🐱
        </motion.div>
        <h1 className="text-4xl font-bold text-primary-800 mb-2">৪০৪</h1>
        <p className="text-primary-600 mb-6">
          এই পেজটা খুঁজে পাওয়া গেল না! বিড়ালটা হয়তো অন্য কোথাও ঘুরতে গেছে 🐾
        </p>
        <Link href="/dashboard">
          <Button>
            <Home size={16} />
            হোমে ফিরে যাও
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}