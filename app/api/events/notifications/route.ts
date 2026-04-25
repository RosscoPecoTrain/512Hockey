import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = request.nextUrl.searchParams.get('limit') || '20'
    const offset = request.nextUrl.searchParams.get('offset') || '0'

    const { data: notifications, count, error } = await supabase
      .from('event_notifications')
      .select(
        `
        *,
        event_types (
          id,
          name,
          location,
          rink
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .range(
        parseInt(offset),
        parseInt(offset) + parseInt(limit) - 1
      )

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        notifications,
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET notifications failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
