// ============================================================
// Path: apps/web/src/middleware.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// Protected routes (require authentication)
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

// Auth routes
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasRefreshCookie = req.cookies.has('sb_refresh');

  // ----------------------------------------------------------
  // PROTECTED ROUTES
  // ----------------------------------------------------------
  if (
    PROTECTED.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    if (!hasRefreshCookie) {
      const url = req.nextUrl.clone();

      url.pathname = '/login';
      url.searchParams.set('next', pathname);

      return NextResponse.redirect(url);
    }
  }

  // ----------------------------------------------------------
  // NORMAL AUTH ROUTES
  // ----------------------------------------------------------
  if (
    AUTH_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    if (hasRefreshCookie) {
      const url = req.nextUrl.clone();

      url.pathname = '/dashboard';

      return NextResponse.redirect(url);
    }
  }

  // ----------------------------------------------------------
  // VERIFY EMAIL
  //
  // Do NOT redirect based on cookie here.
  // A newly registered user must be able to access this page
  // before having a refresh cookie.
  // ----------------------------------------------------------

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|static|favicon.ico|uploads).*)',
  ],
};