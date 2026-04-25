import { createClient } from '@supabase/supabase-js'
import type { Location } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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

    // Scrape each location
    for (const location of locations as Location[]) {
      try {
        const result = await scrapeLocationEvents(
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

    console.log('✅ Drop-in hockey scraper completed')

    return { eventsCreated, eventsUpdated, locationsScraped, errors }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Scraper failed:', errorMsg)
    throw error
  }
}

/**
 * Scrape events from a single DaySmart calendar
 */
async function scrapeLocationEvents(
  location: Location,
  eventTypeId: string
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  if (!location.daysmart_calendar_id) {
    throw new Error('No DaySmart calendar ID')
  }

  // Build URL for DaySmart API
  // Format: https://apps.daysmartrecreation.com/dash/x/#/online/{calendar_id}/calendar?start={date}&end={date}&event_type=9
  // We'll scrape a 30-day window
  const today = new Date()
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const startDateStr = formatDateForDaySmart(today)
  const endDateStr = formatDateForDaySmart(endDate)

  // Note: DaySmart is a JavaScript-heavy SPA, so we may need to use a headless browser or API
  // For now, we'll attempt to fetch the page and parse it
  // In production, you might want to use Puppeteer or a DaySmart API if available

  try {
    // Attempt to fetch the calendar page
    const url = `https://apps.daysmartrecreation.com/dash/x/#/online/${location.daysmart_calendar_id}/calendar?start=${startDateStr}&end=${endDateStr}&event_type=9`
    
    console.log(`Scraping ${location.name} from ${url}`)

    // This is a placeholder - DaySmart pages are JavaScript-rendered
    // Real implementation would need Puppeteer or similar
    // For now, we'll log what we'd do

    console.log(`Would scrape ${location.name} events from ${startDateStr} to ${endDateStr}`)

    // TODO: Implement actual scraping logic
    // This would involve:
    // 1. Using Puppeteer/Playwright to load the page
    // 2. Waiting for JavaScript to render
    // 3. Extracting event data from the DOM
    // 4. Parsing event titles, times, registration URLs
    // 5. Filtering for "Drop in" events
    // 6. Upserting to events table

    return { created, updated }
  } catch (error) {
    throw new Error(`Failed to scrape ${location.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Format date for DaySmart URL (YYYY-MM-DD)
 */
function formatDateForDaySmart(date: Date): string {
  return date.toISOString().split('T')[0]
}
