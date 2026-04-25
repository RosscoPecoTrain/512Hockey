import { createClient } from '@supabase/supabase-js'
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
 *
 * NOTE: Browser automation on Vercel is complex due to binary dependencies.
 * For production, use:
 * 1. ScrapingBee API ($39/mo) - handles browser automation
 * 2. External microservice - self-hosted scraper
 * 3. Direct API integration - if DaySmart has one
 *
 * For now: Add test events for demo purposes
 */
export async function scrapeDropInHockeyEvents() {
  console.log('🏒 Starting drop-in hockey scraper...')
  const startTime = new Date()
  let eventsCreated = 0
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
      return { eventsCreated, eventsUpdated: 0, locationsScraped, errors }
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

    // For now, add demo events so we can test the UI
    // TODO: Implement real scraping with external service
    const demoEvents = generateDemoEvents()

    for (const location of locations) {
      try {
        console.log(`Processing ${location.name}...`)

        // Insert demo events
        for (const event of demoEvents) {
          const { error: insertError } = await supabase
            .from('events')
            .insert({
              location_id: location.id,
              event_type_id: eventTypeId,
              title: event.title,
              start_time: event.startTime.toISOString(),
              end_time: event.endTime?.toISOString(),
              registration_url: event.registrationUrl,
              scraped_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error(`  Error: ${insertError.message}`)
            errors.push(`${location.name}: ${insertError.message}`)
          } else {
            eventsCreated++
          }
        }

        locationsScraped++
      } catch (locError) {
        const errorMsg = locError instanceof Error ? locError.message : String(locError)
        console.error(`Error processing ${location.name}: ${errorMsg}`)
        errors.push(`${location.name}: ${errorMsg}`)
      }
    }

    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    console.log(`✅ Scraper completed in ${durationMs}ms`)
    console.log(`  Created: ${eventsCreated}, Locations: ${locationsScraped}`)
    console.log(
      `ℹ️  Using demo events for testing. For production scraping, integrate external service.`
    )

    return { eventsCreated, eventsUpdated: 0, locationsScraped, errors }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Fatal scraper error:', errorMsg)
    throw error
  }
}

/**
 * Generate demo events for testing
 * TODO: Replace with real DaySmart scraper
 */
function generateDemoEvents(): ScrapedEvent[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const events: ScrapedEvent[] = []

  // Generate drop-in hockey events for the next 30 days
  // Typical drop-in times: 6am, 12pm, 6pm
  for (let day = 0; day < 30; day++) {
    const date = new Date(today)
    date.setDate(date.getDate() + day)

    // Skip Sundays
    if (date.getDay() === 0) continue

    // Morning slot: 6:00 AM
    const morning = new Date(date)
    morning.setHours(6, 0, 0, 0)
    events.push({
      title: 'Drop-In Hockey (6:00 AM)',
      startTime: morning,
      endTime: new Date(morning.getTime() + 60 * 60 * 1000), // 1 hour
      registrationUrl: 'https://apps.daysmartrecreation.com/register',
    })

    // Noon slot: 12:00 PM (Lunchtime 5v5)
    const noon = new Date(date)
    noon.setHours(12, 0, 0, 0)
    events.push({
      title: 'Lunchtime 5v5 (12:00 PM)',
      startTime: noon,
      endTime: new Date(noon.getTime() + 60 * 60 * 1000),
      registrationUrl: 'https://apps.daysmartrecreation.com/register',
    })

    // Evening slot: 6:00 PM
    const evening = new Date(date)
    evening.setHours(18, 0, 0, 0)
    events.push({
      title: 'Drop-In Hockey (6:00 PM)',
      startTime: evening,
      endTime: new Date(evening.getTime() + 75 * 60 * 1000), // 1.25 hours
      registrationUrl: 'https://apps.daysmartrecreation.com/register',
    })
  }

  return events
}
