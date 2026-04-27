import { createClient } from '@supabase/supabase-js'

interface RateLimitConfig {
  requests: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

/**
 * Check if a request is within rate limits
 * Returns allowed status and remaining requests in current window
 */
export async function checkRateLimit(
  apiKeyId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    // Get or create rate limit tracker for this window
    const { data: tracker, error: getError } = await supabase
      .from('api_rate_limit_tracker')
      .select('request_count')
      .eq('api_key_id', apiKeyId)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (getError && getError.code !== 'PGRST116') {
      throw getError
    }

    const currentCount = tracker?.request_count || 0
    const allowed = currentCount < config.requests

    // Calculate reset time (end of current window)
    const resetAt = new Date(windowStart.getTime() + config.windowSeconds * 1000)

    if (!allowed) {
      // Increment counter in database
      if (tracker) {
        await supabase
          .from('api_rate_limit_tracker')
          .update({
            request_count: currentCount + 1,
            updated_at: now.toISOString(),
          })
          .eq('api_key_id', apiKeyId)
          .gte('window_start', windowStart.toISOString())
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
      }
    }

    // Update or create the tracking record
    if (tracker) {
      await supabase
        .from('api_rate_limit_tracker')
        .update({
          request_count: currentCount + 1,
          updated_at: now.toISOString(),
        })
        .eq('api_key_id', apiKeyId)
        .gte('window_start', windowStart.toISOString())
    } else {
      // Create new window entry
      await supabase
        .from('api_rate_limit_tracker')
        .insert({
          api_key_id: apiKeyId,
          window_start: windowStart.toISOString(),
          request_count: 1,
        })
    }

    return {
      allowed: true,
      remaining: config.requests - (currentCount + 1),
      resetAt,
    }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    // Fail open - if rate limit check fails, allow the request
    // Better to let a request through than block legitimate traffic
    return {
      allowed: true,
      remaining: -1, // Unknown
      resetAt: new Date(),
    }
  }
}

/**
 * Check if IP address is in whitelist
 * Supports single IPs (CIDR support can be added with ipaddr.js if needed)
 */
export function isIPWhitelisted(
  ip: string,
  whitelist: string[] | null
): boolean {
  if (!whitelist || whitelist.length === 0) {
    return true // No whitelist = all IPs allowed
  }

  try {
    for (const entry of whitelist) {
      // Simple exact IP match (CIDR support can be added later with ipaddr.js)
      if (ip === entry) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error checking IP whitelist:', error)
    // Fail secure - if we can't parse, reject the request
    return false
  }
}

/**
 * Log a blocked API request
 */
export async function logBlockedRequest(
  apiKeyId: string,
  endpoint: string,
  ip: string | undefined,
  reason: string
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('api_key_blocked_events')
      .insert({
        api_key_id: apiKeyId,
        endpoint,
        ip_address: ip,
        reason,
      })
  } catch (error) {
    console.error('Error logging blocked request:', error)
  }
}
