import { createClient } from '@supabase/supabase-js'
import { checkForNewEventPostings } from './eventNotificationJob'
import { cleanupOldLogs } from './jobLogger'
import { scrapeDropInHockeyEvents } from './dropInScraper'
import { logJobRun } from './jobLogger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface JobConfig {
  id: string
  job_name: string
  job_type: string
  enabled: boolean
  config_data: Record<string, any>
}

/**
 * Execute a cron job based on its type
 */
export async function executeJob(jobConfig: JobConfig) {
  const startTime = new Date()

  console.log(`Executing job: ${jobConfig.job_name} (type: ${jobConfig.job_type})`)

  try {
    let result: any = null

    // Normalize job type for matching
    const jobType = (jobConfig.job_type || '').toLowerCase().trim()

    if (jobType === 'event_notification') {
      result = await checkForNewEventPostings()
    } else if (jobType === 'job_cleanup') {
      result = await cleanupOldLogs(90)
    } else if (jobType === 'drop_in_scraper') {
      result = await scrapeDropInHockeyEvents()
    } else {
      throw new Error(`Unknown job type '${jobConfig.job_type}' for job '${jobConfig.job_name}'`)
    }

    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    console.log(`✅ Job ${jobConfig.job_name} completed in ${durationMs}ms`)

    // Log success
    await logJobRun({
      jobName: jobConfig.job_name,
      jobType: jobConfig.job_type,
      status: 'success',
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      outputData: result || {},
    })

    return { success: true, result }
  } catch (error) {
    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`❌ Job ${jobConfig.job_name} failed: ${errorMessage}`)

    // Log failure
    await logJobRun({
      jobName: jobConfig.job_name,
      jobType: jobConfig.job_type,
      status: 'failed',
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      errorMessage,
    })

    throw error
  }
}

/**
 * Get a job config by name
 */
export async function getJobConfig(jobName: string): Promise<JobConfig | null> {
  try {
    const { data, error } = await supabase
      .from('cron_job_configs')
      .select('*')
      .eq('job_name', jobName)
      .single()

    if (error) {
      console.error(`Error fetching job config ${jobName}:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`Error in getJobConfig:`, error)
    return null
  }
}
