// ============================================================
// Path: apps/web/src/app/(app)/layout.tsx
// ============================================================

'use client';

import { Protected } from '@/components/auth/protected';
import { AppShell } from '@/components/layout/app-shell';
import { InstallPrompt } from '@/components/pwa/install-prompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <AppShell>{children}</AppShell>
      <InstallPrompt />
    </Protected>
  );
}