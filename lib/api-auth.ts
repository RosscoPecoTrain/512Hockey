import { NextRequest, NextResponse } from 'next/server'
import {
  validateAPIKey,
  extractAPIKeyFromHeader,
  logAPIKeyUsage,
  APIScope,
} from './api-key-utils'
import { createClient } from '@supabase/supabase-js'

export interface AuthContext {
  type: 'user' | 'api_key'
  userId?: string
  apiKeyId?: string
  scopes: APIScope[]
}

/**
 * Authenticate request via API key or user session
 * Returns auth context if valid, or a Response (error) if invalid
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredScopes: APIScope[] = []
): Promise<AuthContext | Response> {
  // Check for API key first
  const authHeader = request.headers.get('authorization')
  const apiKey = extractAPIKeyFromHeader(authHeader)

  if (apiKey) {
    const keyData = await validateAPIKey(apiKey, requiredScopes)
    if (!keyData) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      )
    }

    return {
      type: 'api_key',
      apiKeyId: keyData.id,
      userId: keyData.created_by,
      scopes: keyData.scopes,
    }
  }

  // Fall back to session-based auth (cookies)
  const accessToken = request.cookies.get('sb-access-token')?.value
    || request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser(accessToken)
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    )
  }

  // Optionally check if user is admin
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('is_admin')
  //   .eq('id', user.id)
  //   .single()

  return {
    type: 'user',
    userId: user.id,
    scopes: ['admin'], // Session users get all scopes (can restrict further if needed)
  }
}

/**
 * Wrapper for API endpoints that require authentication
 * Usage:
 *   const auth = await protectedAPI(request, ['read:events']);
 *   if (auth instanceof Response) return auth; // error response
 *   // use auth.userId, auth.apiKeyId, auth.scopes
 */
export async function protectedAPI(
  request: NextRequest,
  requiredScopes: APIScope[] = []
): Promise<AuthContext | Response> {
  return authenticateRequest(request, requiredScopes)
}

/**
 * Helper to log API usage after request completes
 */
export async function logUsage(
  auth: AuthContext,
  endpoint: string,
  method: string,
  statusCode: number,
  request: NextRequest,
  error?: string
) {
  if (auth.type === 'api_key' && auth.apiKeyId) {
    const userAgent = request.headers.get('user-agent') || undefined
    // Note: IP extraction depends on deployment environment
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || undefined

    await logAPIKeyUsage(
      auth.apiKeyId,
      endpoint,
      method,
      statusCode,
      ip,
      userAgent,
      error
    )
  }
}
