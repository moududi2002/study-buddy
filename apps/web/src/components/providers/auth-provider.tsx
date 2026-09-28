// ============================================================
// Path: apps/web/src/components/providers/auth-provider.tsx
// ============================================================

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}