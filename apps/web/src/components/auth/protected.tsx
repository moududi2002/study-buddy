// ============================================================
// Path: apps/web/src/components/auth/protected.tsx
// ============================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce-slow">🐱</div>
          <p className="text-primary-500">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}