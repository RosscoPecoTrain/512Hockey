import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const { data: key, error: getError } = await supabase
      .from('api_keys')
      .select('created_by')
      .eq('id', params.id)
      .single()

    if (getError || !key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    if (key.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, is_active } = body

    const { error: updateError } = await supabase
      .from('api_keys')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ message: 'API key updated' })
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const { data: key, error: getError } = await supabase
      .from('api_keys')
      .select('created_by')
      .eq('id', params.id)
      .single()

    if (getError || !key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    if (key.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: 'API key deleted' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
