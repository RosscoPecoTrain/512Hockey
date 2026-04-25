import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export interface JobLogParams {
  jobName: string
  jobType: string
  status: 'success' | 'failed' | 'pending'
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  errorMessage?: string
  outputData?: Record<string, any>
}

/**
 * Log a job run to the job_logs table
 * Used to track cron job executions (event notifications, email sends, cleanups, etc.)
 */
export async function logJobRun({
  jobName,
  jobType,
  status,
  startedAt,
  completedAt,
  durationMs,
  errorMessage,
  outputData,
}: JobLogParams) {
  try {
    const { data, error } = await supabase
      .from('job_logs')
      .insert({
        job_name: jobName,
        job_type: jobType,
        status,
        started_at: startedAt.toISOString(),
        completed_at: completedAt?.toISOString() || null,
        duration_ms: durationMs || null,
        error_message: errorMessage || null,
        output_data: outputData || null,
      })
      .select()

    if (error) {
      console.error('❌ Failed to log job run:', error)
      return null
    }

    console.log(`✓ Job log recorded: ${jobType}/${jobName} - ${status}`)
    return data?.[0]
  } catch (error) {
    console.error('❌ Error logging job run:', error)
    return null
  }
}

/**
 * Get recent job logs with optional filters
 */
export async function getJobLogs(options?: {
  jobType?: string
  status?: string
  limit?: number
  offset?: number
  daysBack?: number
}) {
  try {
    let query = supabase.from('job_logs').select('*', { count: 'exact' })

    if (options?.jobType) {
      query = query.eq('job_type', options.jobType)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.daysBack) {
      const cutoffDate = new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoffDate)
    }

    query = query.order('created_at', { ascending: false })
    query = query.limit(options?.limit || 50)
    query = query.offset(options?.offset || 0)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Failed to fetch job logs:', error)
      return { logs: [], total: 0 }
    }

    return { logs: data || [], total: count || 0 }
  } catch (error) {
    console.error('❌ Error fetching job logs:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * Delete old job logs (retention policy)
 * Called daily to clean up logs older than specified days
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('job_logs')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id')

    if (error) {
      console.error('❌ Failed to cleanup old logs:', error)
      return 0
    }

    const deletedCount = data?.length || 0
    console.log(`✓ Cleaned up ${deletedCount} old job logs (older than ${daysToKeep} days)`)

    // Log the cleanup itself
    await logJobRun({
      jobName: 'cleanup-old-logs',
      jobType: 'system_maintenance',
      status: 'success',
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
      outputData: { deletedCount },
    })

    return deletedCount
  } catch (error) {
    console.error('❌ Error cleaning up job logs:', error)
    return 0
  }
}

/**
 * Get job statistics (useful for dashboard summaries)
 */
export async function getJobStats(jobType?: string) {
  try {
    let query = supabase
      .from('job_logs')
      .select('status, duration_ms', { count: 'exact' })

    if (jobType) {
      query = query.eq('job_type', jobType)
    }

    // Last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', thirtyDaysAgo)

    const { data, error } = await query

    if (error) {
      console.error('❌ Failed to fetch job stats:', error)
      return null
    }

    const stats = {
      total: data?.length || 0,
      success: data?.filter((d) => d.status === 'success').length || 0,
      failed: data?.filter((d) => d.status === 'failed').length || 0,
      avgDurationMs: data?.length
        ? Math.round(
            data.reduce((sum, d) => sum + (d.duration_ms || 0), 0) / data.length
          )
        : 0,
    }

    return stats
  } catch (error) {
    console.error('❌ Error fetching job stats:', error)
    return null
  }
}
