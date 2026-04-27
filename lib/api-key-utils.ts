import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const SCOPES = {
  'read:events': 'Read event data',
  'write:events': 'Create/modify event data',
  'read:jobs': 'Read job information',
  'write:jobs': 'Run/manage jobs',
  'read:users': 'Read user data',
  'write:users': 'Modify user data',
  'admin': 'Full admin access',
} as const

export type APIScope = keyof typeof SCOPES

/**
 * Hash an API key using SHA-256
 */
export function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a new API key
 * Format: sk_<random>
 */
export function generateAPIKey(): string {
  const randomBytes = crypto.randomBytes(24).toString('hex')
  return `sk_${randomBytes}`
}

/**
 * Extract prefix from API key (first 8 chars after sk_)
 */
export function getKeyPrefix(key: string): string {
  const withoutPrefix = key.replace('sk_', '')
  return `sk_${withoutPrefix.substring(0, 8)}...`
}

/**
 * Validate an API key and check scopes
 * Returns the key data and owner if valid, or null if invalid
 */
export async function validateAPIKey(
  apiKey: string,
  requiredScopes: APIScope[] = []
): Promise<{
  id: string
  created_by: string
  scopes: APIScope[]
  is_active: boolean
} | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const keyHash = hashAPIKey(apiKey)

    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('id, created_by, scopes, is_active, expires_at')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (error || !keyData) {
      return null
    }

    // Check if key is active
    if (!keyData.is_active) {
      return null
    }

    // Check if key has expired
    if (keyData.expires_at) {
      const expiresAt = new Date(keyData.expires_at)
      if (expiresAt < new Date()) {
        return null
      }
    }

    // Check required scopes
    const keyScopes = (keyData.scopes as APIScope[]) || []
    const hasAdminScope = keyScopes.includes('admin')
    const hasScopesRequired =
      requiredScopes.length === 0 ||
      hasAdminScope ||
      requiredScopes.every(scope => keyScopes.includes(scope))

    if (!hasScopesRequired) {
      return null
    }

    return {
      id: keyData.id,
      created_by: keyData.created_by,
      scopes: keyScopes,
      is_active: keyData.is_active,
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return null
  }
}

/**
 * Log API key usage
 */
export async function logAPIKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('api_key_usage')
      .insert({
        api_key_id: apiKeyId,
        endpoint,
        method,
        status_code: statusCode,
        ip_address: ipAddress,
        user_agent: userAgent,
        error_message: errorMessage,
      })

    // Update last_used_at on api_keys
    await supabase
      .from('api_keys')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', apiKeyId)
  } catch (error) {
    console.error('Error logging API key usage:', error)
    // Don't throw - logging shouldn't break the API
  }
}

/**
 * Extract API key from Authorization header
 * Format: Bearer sk_...
 */
export function extractAPIKeyFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null
  }

  return parts[1]
}
