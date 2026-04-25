import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    const { data: eventTypes, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('active', true)
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ event_types: eventTypes }, { status: 200 })
  } catch (error) {
    console.error('GET event types failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      location,
      rink,
      source_type,
      source_url,
      source_pattern,
    } = body

    if (!name || !location || !rink || !source_type || !source_url || !source_pattern) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: eventType, error } = await supabase
      .from('event_types')
      .insert([
        {
          name,
          location,
          rink,
          source_type,
          source_url,
          source_pattern,
          active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ event_type: eventType }, { status: 201 })
  } catch (error) {
    console.error('POST event type failed:', error)
    return NextResponse.json(
      { error: 'Failed to create event type' },
      { status: 500 }
    )
  }
}
