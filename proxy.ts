import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAuthorizedAdminIdentity } from '@/lib/auth/admin-config';

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  // If Supabase is not configured yet (local offline demo), allow offline development
  if (!url || !anonKey || url.includes('your-project-id')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify session with Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  // Helper to ensure refreshed auth cookies are always carried over on redirects
  function redirectWithCookies(targetUrl: URL | string): NextResponse {
    const redirectResponse = NextResponse.redirect(new URL(targetUrl, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // 1. ADMIN ROUTES PROTECTION (/admin, /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Verify Admin Status
    const isConfiguredAdmin = isAuthorizedAdminIdentity(user);

    // Also check profiles table role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, status')
      .eq('id', user.id)
      .single();

    const isDatabaseAdmin = profile?.role === 'admin';
    const isActive = profile?.is_active !== false && profile?.status !== 'suspended';

    if (!isActive || !isDatabaseAdmin || !isConfiguredAdmin) {
      // User is authenticated but NOT authorized as Admin
      const unauthorizedUrl = new URL('/student', request.url);
      unauthorizedUrl.searchParams.set('error', 'unauthorized_admin');
      return redirectWithCookies(unauthorizedUrl);
    }
  }

  // 2. STUDENT ROUTES PROTECTION (/student, /student/*)
  if (pathname.startsWith('/student')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Check if account is suspended
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active, status')
      .eq('id', user.id)
      .single();

    if (profile && (profile.is_active === false || profile.status === 'suspended')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'account_suspended');
      return redirectWithCookies(loginUrl);
    }
  }

  // 3. ADMIN API ROUTES PROTECTION (/api/admin, /api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const isConfiguredAdmin = isAuthorizedAdminIdentity(user);
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, status')
      .eq('id', user.id)
      .single();

    const isDatabaseAdmin = profile?.role === 'admin';
    const isActive = profile?.is_active !== false && profile?.status !== 'suspended';

    if (!isActive || !isDatabaseAdmin || !isConfiguredAdmin) {
      return NextResponse.json(
        { error: 'Accès interdit. Seul l\'administrateur autorisé peut accéder à ces ressources.' },
        { status: 403 }
      );
    }
  }

  // 4. AUTH PAGES REDIRECT IF ALREADY LOGGED IN
  if ((pathname === '/auth/login' || pathname === '/auth/register') && user) {
    const isConfiguredAdmin = isAuthorizedAdminIdentity(user);
    return redirectWithCookies(isConfiguredAdmin ? '/admin' : '/student');
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/api/admin/:path*', '/auth/login', '/auth/register'],
};
