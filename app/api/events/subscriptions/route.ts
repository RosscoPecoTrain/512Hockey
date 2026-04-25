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

    const { data: subscriptions, error } = await supabase
      .from('user_event_subscriptions')
      .select(
        `
        *,
        event_types (
          id,
          name,
          location,
          rink,
          source_url,
          last_detected_event_title,
          last_detected_event_date,
          last_check_status
        )
      `
      )
      .eq('user_id', user.id)
      .eq('active', true)

    if (error) {
      throw error
    }

    return NextResponse.json({ subscriptions }, { status: 200 })
  } catch (error) {
    console.error('GET subscriptions failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { event_type_id, notify_via = ['push'] } = body

    if (!event_type_id) {
      return NextResponse.json(
        { error: 'event_type_id required' },
        { status: 400 }
      )
    }

    const { data: subscription, error } = await supabase
      .from('user_event_subscriptions')
      .upsert(
        [
          {
            user_id: user.id,
            event_type_id,
            notify_via,
            active: true,
            updated_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'user_id,event_type_id',
        }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('POST subscription failed:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
