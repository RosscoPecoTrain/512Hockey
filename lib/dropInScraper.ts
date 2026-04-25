import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
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
 * Uses Playwright for better serverless compatibility
 */
export async function scrapeDropInHockeyEvents() {
  console.log('🏒 Starting drop-in hockey scraper...')
  const startTime = new Date()
  let eventsCreated = 0
  let eventsUpdated = 0
  let locationsScraped = 0
  let errors: string[] = []

  let browser: any = null

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

    // Launch browser
    console.log('Launching browser...')
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--single-process'],
    })

    // Scrape each location's calendar
    for (const location of locations) {
      try {
        console.log(`Scraping ${location.name}...`)
        const events = await scrapeDaySmart(browser, location.daysmart_calendar_id)

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
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Scrape a single DaySmart calendar for drop-in hockey events
 */
async function scrapeDaySmart(browser: any, calendarId: string): Promise<ScrapedEvent[]> {
  const page = await browser.newPage()

  try {
    // Build the calendar URL
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead
      .toISOString()
      .split('T')[0]

    const url = `https://apps.daysmartrecreation.com/dash/x/#/online/${calendarId}/calendar?start=${startDate}&end=${endDate}&event_type=9`

    console.log(`  Navigating to ${url}`)
    await page.goto(url, { waitUntil: 'networkidle' })

    // Wait for events to load
    await page.waitForTimeout(2000)

    // Extract event information from the calendar
    const events = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('[data-event-title]')
      const results: ScrapedEvent[] = []

      eventElements.forEach((el) => {
        const title = el.getAttribute('data-event-title')
        const startTimeStr = el.getAttribute('data-event-start')
        const registrationUrl = (el as any).href

        if (title && startTimeStr) {
          // Filter for "Drop in" events
          if (title.toLowerCase().includes('drop in') || title.toLowerCase().includes('drop-in')) {
            results.push({
              title,
              startTime: new Date(startTimeStr),
              registrationUrl,
            })
          }
        }
      })

      return results
    })

    console.log(`  Extracted ${events.length} events from page`)
    return events
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`Error in scrapeDaySmart: ${errorMsg}`)
    return []
  } finally {
    await page.close()
  }
}
