import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * GET /api/admin/cron-jobs
 * Fetch all cron jobs from OpenClaw Gateway
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    // Get token from Authorization header (Bearer token)
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    // Fetch cron jobs from OpenClaw Gateway
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'https://api.openclaw.ai'
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''

    if (!gatewayToken) {
      // Mock data for development
      return NextResponse.json({
        jobs: [
          {
            id: 'mock-1',
            name: 'Event Notification Job',
            description: 'Check for new events and send notifications',
            enabled: true,
            schedule: { kind: 'cron', expr: '0 */6 * * *', tz: 'UTC' },
            payload: {
              kind: 'agentTurn',
              message: 'Run event notification check',
              model: 'openrouter/anthropic/claude-haiku-4-5',
            },
            sessionTarget: 'isolated',
            state: {
              nextRunAtMs: Date.now() + 6 * 60 * 60 * 1000,
              lastRunAtMs: Date.now() - 1 * 60 * 60 * 1000,
              lastRunStatus: 'ok',
              lastError: null,
            },
          },
          {
            id: 'mock-2',
            name: 'Job Log Cleanup',
            description: 'Delete logs older than 90 days',
            enabled: true,
            schedule: { kind: 'cron', expr: '0 2 * * *', tz: 'UTC' },
            payload: {
              kind: 'agentTurn',
              message: 'Cleanup old job logs',
              model: 'openrouter/anthropic/claude-haiku-4-5',
            },
            sessionTarget: 'isolated',
            state: {
              nextRunAtMs: Date.now() + 10 * 60 * 60 * 1000,
              lastRunAtMs: Date.now() - 24 * 60 * 60 * 1000,
              lastRunStatus: 'ok',
              lastError: null,
            },
          },
        ],
      })
    }

    const response = await fetch(`${gatewayUrl}/v1/cron/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${gatewayToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching cron jobs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
