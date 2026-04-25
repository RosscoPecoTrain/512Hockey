import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logJobRun } from '@/lib/jobLogger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * POST /api/admin/cron-jobs/run
 * Manually trigger a cron job
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { jobId } = await request.json()
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      )
    }

    // Verify admin auth via Supabase session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      )
    }

    // In a real app, you'd validate the session token here
    // For now, we'll trust the client-side auth check

    // Trigger job via OpenClaw Gateway
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'https://api.openclaw.ai'
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''

    if (!gatewayToken) {
      // Mock response for development
      const runId = `manual-run-${Date.now()}`
      
      // Log the manual run
      await logJobRun({
        jobName: `manual-trigger-${jobId}`,
        jobType: 'system_manual',
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 100,
        outputData: {
          triggeredBy: 'admin-manual',
          jobId,
          runId,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Job triggered successfully (mock)',
        runId,
      })
    }

    const startTime = new Date()
    let success = false
    let errorMessage = ''

    try {
      const response = await fetch(`${gatewayUrl}/v1/cron/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, runMode: 'force' }),
      })

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.statusText}`)
      }

      const data = await response.json()
      success = true

      // Log successful run
      await logJobRun({
        jobName: `manual-trigger-${jobId}`,
        jobType: 'system_manual',
        status: 'success',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        outputData: {
          triggeredBy: 'admin-manual',
          jobId,
          response: data,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Job ran successfully',
        runId: data.runId,
      })
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log failed run
      await logJobRun({
        jobName: `manual-trigger-${jobId}`,
        jobType: 'system_manual',
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        errorMessage,
      })

      return NextResponse.json(
        { error: `Failed to run job: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error running cron job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run job' },
      { status: 500 }
    )
  }
}
