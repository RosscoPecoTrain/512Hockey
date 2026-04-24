import { type NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/messages', '/admin', '/profile']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // For now, we'll let the client-side handle auth checks
  // In production, you'd want to verify the session from Supabase here
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
}
