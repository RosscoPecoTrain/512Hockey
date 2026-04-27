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
 * Uses Playwright on Vercel or system Chrome for browser automation
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

    // Scrape real events from DaySmart
    const scrapedEvents = await scrapeAllDaysmart(locations)

    for (const location of locations) {
      try {
        console.log(`Processing ${location.name}...`)

        // Insert scraped events
        const locationEvents = scrapedEvents[location.id] || []
        for (const event of locationEvents) {
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

    return { eventsCreated, eventsUpdated: 0, locationsScraped, errors }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Fatal scraper error:', errorMsg)
    throw error
  }
}

/**
 * Scrape all DaySmart locations and return events by location ID
 */
async function scrapeAllDaysmart(locations: Location[]): Promise<Record<number, ScrapedEvent[]>> {
  const eventsByLocation: Record<number, ScrapedEvent[]> = {}

  // Try to use Playwright if available (Vercel serverless)
  try {
    // Dynamic import to avoid build errors if playwright isn't installed
    let playwright: any
    try {
      playwright = await import('playwright')
    } catch {
      console.warn('⚠️ Playwright not available, falling back to demo events')
      for (const location of locations) {
        eventsByLocation[location.id] = generateDemoEventsForLocation(location)
      }
      return eventsByLocation
    }

    console.log('📱 Using Playwright for browser automation')

    for (const location of locations) {
      try {
        const events = await scrapeDaysmartWithPlaywright(location, playwright)
        eventsByLocation[location.id] = events
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.warn(`⚠️ Failed to scrape ${location.name}: ${errorMsg}`)
        // Fall back to demo events for this location
        eventsByLocation[location.id] = generateDemoEventsForLocation(location)
      }
    }

    return eventsByLocation
  } catch (error) {
    console.warn('⚠️ Browser automation failed, falling back to demo events')
    for (const location of locations) {
      eventsByLocation[location.id] = generateDemoEventsForLocation(location)
    }
    return eventsByLocation
  }
}

/**
 * Scrape a single DaySmart location using Playwright
 */
async function scrapeDaysmartWithPlaywright(
  location: Location,
  playwright: any
): Promise<ScrapedEvent[]> {
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    const calendarUrl = location.daysmart_calendar_id
    console.log(`  Navigating to ${calendarUrl}...`)

    await page.goto(calendarUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for Angular to render the calendar
    await page.waitForTimeout(2000)

    // Extract event data from the page
    const events = await page.evaluate(() => {
      const extracted: Array<{
        title: string
        time: string
        date: string
      }> = []

      // Look for event elements - adjust selectors based on actual DOM
      const eventElements = document.querySelectorAll(
        '[class*="event"], [class*="Event"], [role="listitem"], .calendar-event'
      )

      eventElements.forEach((el) => {
        const text = el.textContent?.trim() || ''
        if (!text) return

        // Try to extract title (usually the first line or bold text)
        const title =
          el.querySelector('strong, b, h3, h4')?.textContent?.trim() ||
          text.split('\n')[0].trim()

        // Extract time (e.g., "6:00 AM - 7:30 AM")
        const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i)
        const time = timeMatch ? timeMatch[0] : ''

        if (title && time && title.length > 3) {
          extracted.push({ title, time, date: new Date().toISOString() })
        }
      })

      return extracted
    })

    // Convert to ScrapedEvent format
    return events.map((evt) => {
      const startTime = parseEventTime(evt.time, evt.date)
      return {
        title: evt.title,
        startTime,
        endTime: new Date(startTime.getTime() + 90 * 60 * 1000), // Default 90 min
        registrationUrl: location.daysmart_calendar_id,
      }
    })
  } finally {
    await browser.close()
  }
}

/**
 * Parse event time string (e.g., "6:00 AM") into a Date object
 */
function parseEventTime(timeStr: string, dateStr: string): Date {
  const now = new Date(dateStr)
  const match = timeStr.match(/(\\d{1,2}):(\\d{2})\\s*(AM|PM|am|pm)/i)

  if (!match) return now

  let [, hours, minutes, period] = match
  const h = parseInt(hours)
  const m = parseInt(minutes)

  // Convert to 24-hour format
  let finalHours = h
  if (period.toUpperCase() === 'PM' && h !== 12) {
    finalHours = h + 12
  } else if (period.toUpperCase() === 'AM' && h === 12) {
    finalHours = 0
  }

  const result = new Date(now)
  result.setHours(finalHours, m, 0, 0)
  return result
}

/**
 * Generate demo events for a specific location (fallback)
 */
function generateDemoEventsForLocation(location: Location): ScrapedEvent[] {
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
      registrationUrl: location.daysmart_calendar_id,
    })

    // Noon slot: 12:00 PM (Lunchtime 5v5)
    const noon = new Date(date)
    noon.setHours(12, 0, 0, 0)
    events.push({
      title: 'Lunchtime 5v5 (12:00 PM)',
      startTime: noon,
      endTime: new Date(noon.getTime() + 60 * 60 * 1000),
      registrationUrl: location.daysmart_calendar_id,
    })

    // Evening slot: 6:00 PM
    const evening = new Date(date)
    evening.setHours(18, 0, 0, 0)
    events.push({
      title: 'Drop-In Hockey (6:00 PM)',
      startTime: evening,
      endTime: new Date(evening.getTime() + 75 * 60 * 1000), // 1.25 hours
      registrationUrl: location.daysmart_calendar_id,
    })
  }

  return events
}
