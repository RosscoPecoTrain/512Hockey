import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateAPIKey,
  hashAPIKey,
  getKeyPrefix,
  APIScope,
} from '@/lib/api-key-utils'

export async function GET(request: NextRequest) {
  try {
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
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user's API keys (without key_hash for security)
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, description, is_active, expires_at, last_used_at, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, scopes = [], description, expires_at } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validate scopes
    const validScopes = [
      'read:events',
      'write:events',
      'read:jobs',
      'write:jobs',
      'read:users',
      'write:users',
      'admin',
    ]
    const invalidScopes = scopes.filter((s: string) => !validScopes.includes(s))
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate new API key
    const newKey = generateAPIKey()
    const keyHash = hashAPIKey(newKey)
    const keyPrefix = getKeyPrefix(newKey)

    // Store key hash in database
    const { error: insertError } = await supabase
      .from('api_keys')
      .insert({
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_by: user.id,
        scopes,
        description,
        expires_at,
      })

    if (insertError) {
      throw insertError
    }

    // Return the key (only time user will see it - can't be retrieved later)
    return NextResponse.json(
      {
        message: 'API key created. Save it now - you won\'t see it again!',
        key: newKey,
        key_prefix: keyPrefix,
        scopes,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
