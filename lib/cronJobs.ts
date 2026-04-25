import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { executeJob } from './cronJobExecutor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

let cronInitialized = false
const scheduledJobs = new Map<string, cron.ScheduledTask>()

export function initializeCronJobs() {
  if (cronInitialized) {
    console.log('⚠️  Cron jobs already initialized')
    return
  }

  cronInitialized = true
  loadAndScheduleJobs()
}

async function loadAndScheduleJobs() {
  try {
    console.log('📋 Loading cron job configs...')

    // Get all enabled jobs from the database
    const { data: jobs, error } = await supabase
      .from('cron_job_configs')
      .select('*')
      .eq('enabled', true)

    if (error) {
      console.error('Error loading cron jobs:', error)
      return
    }

    if (!jobs || jobs.length === 0) {
      console.log('No enabled cron jobs found')
      return
    }

    console.log(`Found ${jobs.length} enabled job(s)`)

    // Schedule each job
    for (const job of jobs) {
      scheduleJob(job)
    }
  } catch (error) {
    console.error('Error in loadAndScheduleJobs:', error)
  }
}

function scheduleJob(jobConfig: any) {
  try {
    // Clear any existing scheduled task for this job
    if (scheduledJobs.has(jobConfig.job_name)) {
      const existingTask = scheduledJobs.get(jobConfig.job_name)
      if (existingTask) {
        existingTask.stop()
      }
    }

    // Schedule the new job
    const task = cron.schedule(jobConfig.schedule_cron, async () => {
      console.log(`⏱️  Executing ${jobConfig.job_name}...`)
      try {
        await executeJob(jobConfig)
      } catch (error) {
        console.error(`Error executing ${jobConfig.job_name}:`, error)
      }
    })

    scheduledJobs.set(jobConfig.job_name, task)
    console.log(
      `✓ Scheduled ${jobConfig.job_name} with cron: ${jobConfig.schedule_cron}`
    )
  } catch (error) {
    console.error(`Error scheduling ${jobConfig.job_name}:`, error)
  }
}

/**
 * Reload all cron jobs from the database
 * Call this after updating job configs in the admin UI
 */
export async function reloadCronJobs() {
  console.log('🔄 Reloading cron jobs...')

  // Stop all existing jobs
  for (const [name, task] of scheduledJobs.entries()) {
    task.stop()
    scheduledJobs.delete(name)
    console.log(`Stopped ${name}`)
  }

  // Reload from database
  await loadAndScheduleJobs()
  console.log('✅ Cron jobs reloaded')
}
