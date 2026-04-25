import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import DaySmartScraper, { RinkEvent } from '@/lib/scrapers/daysmart-scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface JobPayload {
  days_to_fetch?: number
  rink_ids?: string[] // If specified, only scrape these rinks
}

/**
 * POST /api/admin/jobs/scrape-rink-events
 * Scrapes DaySmart Recreation calendars for Hockey Drop In events
 * Can be called manually or via cron job
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const payload: JobPayload = await req.json().catch(() => ({}))
    const daysToFetch = payload.days_to_fetch || 30
    const filterRinkIds = payload.rink_ids

    console.log('[scrape-rink-events] Starting scrape job', {
      daysToFetch,
      filterRinkIds
    })

    // Fetch rinks with DaySmart company codes
    let query = supabase
      .from('rinks')
      .select('id, name, daysmart_company')
      .eq('is_active', true)

    if (filterRinkIds && filterRinkIds.length > 0) {
      query = query.in('id', filterRinkIds)
    }

    const { data: rinks, error: rinksError } = await query

    if (rinksError) {
      throw new Error(`Failed to fetch rinks: ${rinksError.message}`)
    }

    if (!rinks || rinks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No rinks configured for scraping',
        events_added: 0,
        duration_ms: Date.now() - startTime
      })
    }

    // Filter rinks that have DaySmart integration
    const daysmartRinks = rinks.filter(r => r.daysmart_company)

    if (daysmartRinks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No rinks with DaySmart integration configured',
        events_added: 0,
        duration_ms: Date.now() - startTime
      })
    }

    console.log(`[scrape-rink-events] Scraping ${daysmartRinks.length} rinks`)

    // Scrape events
    const scraper = new DaySmartScraper()
    const events = await scraper.scrapeMultiple(daysmartRinks, daysToFetch)
    await scraper.close()

    console.log(`[scrape-rink-events] Scraped ${events.length} total events`)

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Hockey Drop In events found',
        events_added: 0,
        duration_ms: Date.now() - startTime
      })
    }

    // Upsert events into database
    // Remove old events for these rinks (older than daysToFetch days)
    const cutoffDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000)
    const rinkIdsToUpdate = daysmartRinks.map(r => r.id)

    await supabase
      .from('rink_events')
      .delete()
      .in('rink_id', rinkIdsToUpdate)
      .lt('start_time', cutoffDate.toISOString())

    // Insert new events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('rink_events')
      .upsert(
        events.map(evt => ({
          rink_id: evt.rinkId,
          event_name: evt.eventName,
          event_type: evt.eventType,
          start_time: evt.startTime.toISOString(),
          end_time: evt.endTime.toISOString(),
          skill_level: evt.skill_level || null,
          capacity: evt.capacity || null,
          source_url: evt.source_url,
          scraped_at: new Date().toISOString()
        })),
        { onConflict: 'rink_id,event_name,start_time' }
      )

    if (insertError) {
      throw new Error(`Failed to insert events: ${insertError.message}`)
    }

    const duration = Date.now() - startTime

    console.log(`[scrape-rink-events] Successfully added ${events.length} events in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Scraped ${events.length} Hockey Drop In events from ${daysmartRinks.length} rinks`,
      events_added: events.length,
      rinks_scraped: daysmartRinks.length,
      duration_ms: duration
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)

    console.error('[scrape-rink-events] Error:', errorMsg)

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/jobs/scrape-rink-events
 * Returns the job status/info
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'scrape-rink-events',
    description: 'Scrapes DaySmart Recreation calendars for Hockey Drop In events',
    schedule: 'Every 6 hours',
    last_run: null,
    status: 'active'
  })
}
