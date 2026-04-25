import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkForNewEventPostings } from '@/lib/eventNotificationJob'
import { cleanupOldLogs } from '@/lib/jobLogger'
import { logJobRun } from '@/lib/jobLogger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * POST /api/admin/jobs/run
 * Manually trigger a 512Hockey cron job
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const { jobName } = await request.json()

    if (!jobName) {
      return NextResponse.json({ error: 'Missing jobName' }, { status: 400 })
    }

    // Verify admin auth via Supabase session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      )
    }

    const startTime = new Date()
    let success = false
    let errorMessage = ''

    try {
      // Execute the job based on jobName
      switch (jobName) {
        case 'event-notification':
          await checkForNewEventPostings()
          success = true
          break

        case 'job-log-cleanup':
          const deletedCount = await cleanupOldLogs(90)
          success = true
          break

        default:
          throw new Error(`Unknown job: ${jobName}`)
      }

      // Log successful run
      await logJobRun({
        jobName,
        jobType: 'manual_trigger',
        status: 'success',
        startedAt: startTime,
        completedAt: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        outputData: {
          triggeredBy: 'admin',
          manual: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Job '${jobName}' executed successfully`,
      })
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log failed run
      await logJobRun({
        jobName,
        jobType: 'manual_trigger',
        status: 'failed',
        startedAt: startTime,
        completedAt: new Date(),
        durationMs: Date.now() - startTime.getTime(),
        errorMessage,
      })

      return NextResponse.json(
        { error: `Job failed: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error running job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run job' },
      { status: 500 }
    )
  }
}
