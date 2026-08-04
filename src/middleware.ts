import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';


export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Resolve tenant subdomain or custom domain from host header
  const rawHost = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  let tenantDomain = '';
  
  const hostParts = rawHost.split('.');
  if (hostParts.length > 2) {
    tenantDomain = hostParts[0];
  } else if (hostParts.length === 2 && hostParts[1].includes('localhost')) {
    tenantDomain = hostParts[0];
  }

  // Normalize root domain prefixes
  if (['www', 'admin', 'app', 'api'].includes(tenantDomain)) {
    tenantDomain = '';
  }

  // Clone headers to pass tenant details to downstream requests
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-domain', tenantDomain);
  requestHeaders.set('x-tenant-custom-domain', rawHost);

  // 2. Fetch authenticated user session token
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'secret',
  });

  const isAuthenticated = !!session;

  // RLS context is set in API routes and server components, not edge middleware.

  // 3. Define route classification
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register');
  const isApiRoute = path.startsWith('/api');
  const isGuestExamRoute = /^\/student\/exams\/[^/]+\/(invite|instructions|take)(\/|$)/.test(path) || /^\/exam\/complete\/[^/]+$/.test(path);
  const isDashboardRoute = 
    path.startsWith('/super') || 
    path.startsWith('/admin') || 
    path.startsWith('/teacher') || 
    path.startsWith('/student') ||
    path.startsWith('/exam');

  // Allow API routes to resolve without redirects
  if (isApiRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. Handle redirects for unauthenticated users
  if (!isAuthenticated && isDashboardRoute && !isGuestExamRoute) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Handle redirects for authenticated users
  if (isAuthenticated) {
    const userRole = session.role;
    const isValidRole = ['student', 'teacher', 'admin', 'super_admin'].includes(userRole);

    // Prevent logged-in users from accessing login/register screens
    if (isAuthRoute) {
      if (!isValidRole) {
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
      let targetDashboard = '/student';
      if (userRole === 'super_admin') targetDashboard = '/super';
      else if (userRole === 'admin') targetDashboard = '/admin';
      else if (userRole === 'teacher') targetDashboard = '/teacher';

      return NextResponse.redirect(new URL(targetDashboard, req.url));
    }

    // Role-based directory authorization guard
    if (!isValidRole) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (path.startsWith('/super') && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL(getRoleDashboard(userRole), req.url));
    }
    if (path.startsWith('/admin') && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL(getRoleDashboard(userRole), req.url));
    }
    if (path.startsWith('/teacher') && userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL(getRoleDashboard(userRole), req.url));
    }
    if (path.startsWith('/student') && userRole !== 'student' && userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL(getRoleDashboard(userRole), req.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case 'super_admin': return '/super';
    case 'admin': return '/admin';
    case 'teacher': return '/teacher';
    case 'student': return '/student';
    default: return '/login';
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset extensions (.svg, .png, .jpg, .jpeg, .webp, .ico, .css, .js, .woff2)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
