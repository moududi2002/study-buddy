// ============================================================
// Path: apps/web/src/middleware.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// Protected routes (require auth)
const PROTECTED = [
  '/dashboard',
  '/tracker',
  '/subjects',
  '/analytics',
  '/goals',
  '/achievements',
  '/diary',
  '/profile',
];

// Auth routes (redirect to dashboard if already logged in)
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasRefreshCookie = req.cookies.has('sb_refresh');

  // If accessing protected route without refresh cookie → login
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (!hasRefreshCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // If accessing auth route WITH refresh cookie → dashboard
  if (AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (hasRefreshCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|uploads).*)'],
};