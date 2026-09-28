// ============================================================
// Path: apps/web/src/app/(app)/dashboard/page.tsx
// ============================================================

'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { greetingBn } from '@/lib/bn';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-primary-500">{greetingBn()}! 🌸</p>
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          {user?.fullName} 🐱
        </h1>
      </div>
      <div className="card-soft p-6">
        <p className="text-primary-600">
          পরের ধাপে সম্পূর্ণ dashboard আসছে — আজকের ট্র্যাকার, স্ট্রিক, ব্যাজ, AI insight সব একসাথে ✨
        </p>
      </div>
    </div>
  );
}