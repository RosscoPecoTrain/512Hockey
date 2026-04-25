import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Routes that don't need any session check
const publicRoutes = ['/auth/signin', '/auth/callback', '/agree', '/terms', '/privacy', '/guidelines', '/donate']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes and static assets
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Get session from cookie
  const accessToken = request.cookies.get('sb-access-token')?.value
    || request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value

  if (!accessToken) {
    return NextResponse.next()
  }

  // Check is_enabled using service role to bypass RLS
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return NextResponse.next()

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_enabled')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_enabled === false) {
      // Sign them out by clearing the session cookie and redirecting
      const response = NextResponse.redirect(new URL('/auth/signin?error=disabled', request.url))
      // Clear all supabase auth cookies
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
          response.cookies.delete(cookie.name)
        }
      })
      return response
    }
  } catch {
    // If check fails, let the request through (fail open)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
}
