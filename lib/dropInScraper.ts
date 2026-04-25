import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'
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
 * DaySmart uses event_type=9 for hockey, and we filter for "Drop in" events
 */
export async function scrapeDropInHockeyEvents() {
  console.log('🏒 Starting drop-in hockey scraper...')
  const startTime = new Date()
  let eventsCreated = 0
  let eventsUpdated = 0
  let locationsScraped = 0
  let errors: string[] = []

  let browser: puppeteer.Browser | null = null

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

    if (etError || !eventTypeData) {
      throw new Error('Drop-In Hockey event type not found')
    }

    const dropInEventTypeId = eventTypeData.id

    // Launch browser once for all locations
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    // Scrape each location
    for (const location of locations as Location[]) {
      try {
        const result = await scrapeLocationEvents(
          browser,
          location,
          dropInEventTypeId
        )
        eventsCreated += result.created
        eventsUpdated += result.updated
        locationsScraped++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`Error scraping ${location.name}:`, errorMsg)
        errors.push(`${location.name}: ${errorMsg}`)
      }
    }

    console.log(`✅ Drop-in hockey scraper completed. Created: ${eventsCreated}, Updated: ${eventsUpdated}, Locations: ${locationsScraped}`)

    return { eventsCreated, eventsUpdated, locationsScraped, errors }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Scraper failed:', errorMsg)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Scrape events from a single DaySmart calendar using Puppeteer
 */
async function scrapeLocationEvents(
  browser: puppeteer.Browser,
  location: Location,
  eventTypeId: string
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  if (!location.daysmart_calendar_id) {
    throw new Error('No DaySmart calendar ID')
  }

  const page = await browser.newPage()

  try {
    // Set user agent to avoid blocking
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    )

    // Build URL for 30-day window
    const today = new Date()
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    const startDateStr = formatDateForDaySmart(today)
    const endDateStr = formatDateForDaySmart(endDate)

    const url = `https://apps.daysmartrecreation.com/dash/x/#/online/${location.daysmart_calendar_id}/calendar?start=${startDateStr}&end=${endDateStr}&event_type=9`

    console.log(`Scraping ${location.name}...`)

    // Navigate to the page with longer timeout for SPA
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

    // Wait for events to load
    await page.waitForSelector('[class*="event"]', { timeout: 5000 }).catch(() => {
      console.log(`No events found for ${location.name}`)
    })

    // Extract event data from the page
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('[class*="event-item"], [class*="calendar-event"]')
      const scrapedEvents: ScrapedEvent[] = []

      eventElements.forEach((el) => {
        const titleEl = el.querySelector('[class*="title"], [class*="name"], h3, h4')
        const timeEl = el.querySelector('[class*="time"], [class*="start"]')
        const linkEl = el.querySelector('a[href*="register"], a[href*="signup"]')

        if (titleEl) {
          const title = titleEl.textContent?.trim() || ''
          
          // Only include "Drop in" events
          if (title.toLowerCase().includes('drop in')) {
            scrapedEvents.push({
              title,
              startTime: new Date(), // Placeholder - would need to parse from timeEl
              registrationUrl: linkEl?.getAttribute('href') || undefined,
            })
          }
        }
      })

      return scrapedEvents
    })

    console.log(`Found ${events.length} drop-in events at ${location.name}`)

    // Upsert events to database
    for (const event of events) {
      try {
        const { error: upsertError } = await supabase
          .from('events')
          .upsert(
            {
              location_id: location.id,
              event_type_id: eventTypeId,
              title: event.title,
              start_time: event.startTime.toISOString(),
              end_time: event.endTime?.toISOString() || null,
              registration_url: event.registrationUrl || null,
              source_url: page.url(),
              external_event_id: `${location.id}-${event.title}-${event.startTime.getTime()}`,
              scraped_at: new Date().toISOString(),
            },
            {
              onConflict: 'external_event_id',
            }
          )

        if (upsertError) {
          console.error(`Error upserting event ${event.title}:`, upsertError)
        } else {
          created++
        }
      } catch (err) {
        console.error(`Error processing event:`, err)
      }
    }

    return { created, updated }
  } catch (error) {
    throw new Error(
      `Failed to scrape ${location.name}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  } finally {
    await page.close()
  }
}

/**
 * Format date for DaySmart URL (YYYY-MM-DD)
 */
function formatDateForDaySmart(date: Date): string {
  return date.toISOString().split('T')[0]
}
