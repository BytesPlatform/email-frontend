import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the auth token from cookies
  const token = request.cookies.get('auth_token')?.value

  // Public routes that don't require authentication
  // const publicRoutes = [
  //   '/',
  //   '/auth/login',
  //   '/auth/register',
  //   '/auth/forgot-password',
  //   '/api/auth/login',
  //   '/api/auth/register',
  //   '/api/auth/forgot-password',
  // ]

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/csv-ingestion',
    '/dashboard/contacts',
    '/dashboard/scraping',
    '/dashboard/email-generation',
    '/dashboard/draft',
    '/dashboard/analytics',
    '/dashboard/history',
    '/dashboard/profile',
  ]

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // For protected routes, let the client-side AuthGuard handle the redirect
  // This prevents server-side redirects that can cause hydration issues
  if (isProtectedRoute) {
    // Let the page load and let AuthGuard handle the redirect
    return NextResponse.next()
  }

  // If user has token and trying to access auth pages, redirect to dashboard
  if (token && (pathname === '/auth/login' || pathname === '/auth/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user has token and on home page, redirect to dashboard
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
