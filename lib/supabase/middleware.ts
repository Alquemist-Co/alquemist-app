import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleRedirect } from '@/lib/auth/utils'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const authRoutes = ['/login', '/signup', '/forgot-password']
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoute = pathname.startsWith('/auth/confirm')
    || pathname.startsWith('/invite')
    || pathname.startsWith('/reset-password')
    || pathname.startsWith('/showcase')

  if (isPublicRoute) {
    // Auth callback and invite pages — pass through without redirects
    return supabaseResponse
  }

  if (user && isAuthRoute) {
    // Authenticated user on auth page → redirect to role-based default route
    const role = (user.app_metadata?.role as string) ?? 'viewer'
    const url = request.nextUrl.clone()
    url.pathname = getRoleRedirect(role)
    return NextResponse.redirect(url)
  }

  if (!user && !isAuthRoute) {
    // Unauthenticated user on protected route → redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'

    // PD-04: Detect expired session by checking for existing auth cookie
    const hadSession = request.cookies.getAll().some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )
    if (hadSession) {
      url.searchParams.set('expired', 'true')
    }

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
