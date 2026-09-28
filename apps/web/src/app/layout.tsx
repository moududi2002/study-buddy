// ============================================================
// Path: apps/web/src/app/layout.tsx
// ============================================================

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Buddy — পড়াশোনার সঙ্গী 🐱',
  description:
    'মাধ্যমিক পর্যায়ের শিক্ষার্থীদের জন্য কিউট, বন্ধুসুলভ অ্যাপ যেখানে পড়াশোনার অগ্রগতি ট্র্যাক করা যায়।',
  applicationName: 'Study Buddy',
  authors: [{ name: 'Study Buddy' }],
};

export const viewport: Viewport = {
  themeColor: '#A78BFA',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              borderRadius: '1rem',
            },
          }}
        />
      </body>
    </html>
  );
}