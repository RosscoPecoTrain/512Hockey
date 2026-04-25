/**
 * Setup endpoint to initialize standard 512Hockey cron jobs
 * Call this once during deployment or manually when needed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const STANDARD_JOBS = [
  {
    job_name: 'scrape-rink-events',
    job_type: 'event-scraper',
    enabled: true,
    schedule_cron: '0 */6 * * *', // Every 6 hours
    schedule_tz: 'America/Chicago',
    description: 'Scrapes DaySmart Recreation calendars for Hockey Drop In events',
    config_data: {
      days_to_fetch: 30,
      source: 'daysmart'
    }
  },
  {
    job_name: 'cleanup-old-events',
    job_type: 'maintenance',
    enabled: true,
    schedule_cron: '0 0 * * 0', // Weekly on Sunday at midnight
    schedule_tz: 'America/Chicago',
    description: 'Removes events older than 60 days',
    config_data: {
      days_to_keep: 60
    }
  },
  {
    job_name: 'send-event-digest',
    job_type: 'notification',
    enabled: false,
    schedule_cron: '0 8 * * 1,3,5', // Monday, Wednesday, Friday at 8 AM
    schedule_tz: 'America/Chicago',
    description: 'Sends upcoming events digest to subscribed users',
    config_data: {
      days_ahead: 7,
      email_template: 'weekly-digest'
    }
  }
]

export async function POST(req: NextRequest) {
  try {
    const { reset = false } = await req.json().catch(() => ({ reset: false }))

    if (reset) {
      console.log('[setup-jobs] Deleting existing jobs...')
      await supabase
        .from('cron_job_configs')
        .delete()
        .in(
          'job_name',
          STANDARD_JOBS.map(j => j.job_name)
        )
    }

    console.log('[setup-jobs] Creating standard jobs...')

    const { data, error } = await supabase
      .from('cron_job_configs')
      .upsert(STANDARD_JOBS, { onConflict: 'job_name' })

    if (error) {
      throw new Error(`Failed to create jobs: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Standard jobs configured',
      jobs_created: data?.length || STANDARD_JOBS.length
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[setup-jobs] Error:', errorMsg)

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  }
}
