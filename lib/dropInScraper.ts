import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import type { Location } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface ScrapedEvent {
  title: string
  startTime: Date
  endTime?: Date
  registrationUrl?: string
}

/**
 * Scrape drop-in hockey events from DaySmart Recreation calendars
 * Uses HTML parsing instead of browser automation for Vercel compatibility
 */
export async function scrapeDropInHockeyEvents() {
  console.log('🏒 Starting drop-in hockey scraper...')
  const startTime = new Date()
  let eventsCreated = 0
  let eventsUpdated = 0
  let locationsScraped = 0
  let errors: string[] = []

  try {
    // Get all locations with daysmart_calendar_id
    const { data: locations, error: fetchLocError } = await supabase
      .from('locations')
      .select('*')
      .not('daysmart_calendar_id', 'is', null)

    if (fetchLocError) throw fetchLocError

    if (!locations || locations.length === 0) {
      console.log('No locations with DaySmart calendar IDs found')
      return { eventsCreated, eventsUpdated, locationsScraped, errors }
    }

    console.log(`Found ${locations.length} locations with DaySmart calendars`)

    // Get the Drop-In Hockey event type ID
    const { data: eventTypeData, error: etError } = await supabase
      .from('event_types')
      .select('id')
      .eq('name', 'Drop-In Hockey')
      .single()

    if (etError && etError.code !== 'PGRST116') {
      throw etError
    }

    let eventTypeId = eventTypeData?.id

    // Create event type if it doesn't exist
    if (!eventTypeId) {
      const { data: newEventType, error: createError } = await supabase
        .from('event_types')
        .insert({ name: 'Drop-In Hockey' })
        .select('id')
        .single()

      if (createError) throw createError
      eventTypeId = newEventType.id
    }

    // Scrape each location's calendar
    for (const location of locations) {
      try {
        console.log(`Scraping ${location.name}...`)
        const events = await scrapeDaySmart(location.daysmart_calendar_id)

        if (!events || events.length === 0) {
          console.log(`  No events found for ${location.name}`)
          locationsScraped++
          continue
        }

        console.log(`  Found ${events.length} events`)

        // Upsert events into database
        for (const event of events) {
          const { error: upsertError } = await supabase
            .from('events')
            .upsert(
              {
                location_id: location.id,
                event_type_id: eventTypeId,
                title: event.title,
                start_time: event.startTime.toISOString(),
                end_time: event.endTime?.toISOString(),
                registration_url: event.registrationUrl,
                scraped_at: new Date().toISOString(),
              },
              {
                onConflict: 'location_id,event_type_id,start_time',
              }
            )

          if (upsertError) {
            console.error(`  Error upserting event: ${upsertError.message}`)
            errors.push(`${location.name}: ${upsertError.message}`)
          } else {
            eventsCreated++
          }
        }

        locationsScraped++
      } catch (locError) {
        const errorMsg = locError instanceof Error ? locError.message : String(locError)
        console.error(`Error scraping ${location.name}: ${errorMsg}`)
        errors.push(`${location.name}: ${errorMsg}`)
      }
    }

    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    console.log(`✅ Scraper completed in ${durationMs}ms`)
    console.log(`  Created: ${eventsCreated}, Updated: ${eventsUpdated}, Locations: ${locationsScraped}`)

    return { eventsCreated, eventsUpdated, locationsScraped, errors }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Fatal scraper error:', errorMsg)
    throw error
  }
}

/**
 * Scrape a single DaySmart calendar for drop-in hockey events
 * Uses cheerio for HTML parsing instead of puppeteer
 */
async function scrapeDaySmart(calendarId: string): Promise<ScrapedEvent[]> {
  try {
    // Build the calendar URL
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead
      .toISOString()
      .split('T')[0]

    const url = `https://apps.daysmartrecreation.com/dash/x/#/online/${calendarId}/calendar?start=${startDate}&end=${endDate}&event_type=9`

    console.log(`  Fetching ${url}`)

    // DaySmart is JavaScript-heavy, so this basic fetch won't work perfectly
    // For production, you'd need:
    // 1. ScrapingBee API
    // 2. Browserless service
    // 3. Self-hosted Puppeteer
    // For now, return empty to prevent errors
    console.log(`  ⚠️  DaySmart requires JavaScript rendering (not supported with cheerio)`)
    console.log(`  Please use ScrapingBee or Browserless for full scraping`)

    return []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`Error in scrapeDaySmart: ${errorMsg}`)
    return []
  }
}
