import { DetectedEvent, EventType } from '@/types'

/**
 * Scrape The Pond's Shopify products page for events
 */
export async function scrapeShopifyProducts(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    return await response.text()
  } catch (error) {
    console.error('Scrape error:', error)
    throw error
  }
}

/**
 * Extract event titles from HTML content
 * Looks for product links and titles on Shopify
 */
export function extractEventTitles(html: string): string[] {
  const titles: string[] = []

  // Match various Shopify product title patterns
  // Pattern 1: <h2 ...>Event Title</h2> or similar
  const h2Pattern = /<h2[^>]*>([^<]+)<\/h2>/gi
  let match
  while ((match = h2Pattern.exec(html)) !== null) {
    titles.push(match[1].trim())
  }

  // Pattern 2: aria-label or data-product-title attributes
  const ariaPattern = /aria-label="([^"]*(?:Friday|Saturday|Sunday)[^"]*)"/gi
  while ((match = ariaPattern.exec(html)) !== null) {
    titles.push(match[1].trim())
  }

  // Pattern 3: Look for common product link structures
  const linkPattern = /href="\/products\/([^"]+)"[^>]*>([^<]+)<\/a>/gi
  while ((match = linkPattern.exec(html)) !== null) {
    titles.push(match[2].trim())
  }

  // Deduplicate and filter
  return Array.from(new Set(titles)).filter((t) => t.length > 0)
}

/**
 * Parse event title to extract date and details
 * Expected format: "May 29th, Friday 2026 - Friday Afternoon Lunch 5v5 Shinny"
 */
export function parseEventFromTitle(
  title: string
): { date: string; dateDisplay: string; id: string } | null {
  // Match date pattern: "May 29th" or "29th"
  const dateMatch = title.match(
    /([A-Z][a-z]+)\s+(\d+)(?:st|nd|rd|th)?(?:,?\s+([A-Za-z]+))?\s+(\d{4})/
  )

  if (!dateMatch) {
    return null
  }

  const month = dateMatch[1]
  const day = dateMatch[2]
  const dayOfWeek = dateMatch[3] || ''
  const year = dateMatch[4]

  // Convert to ISO date (YYYY-MM-DD)
  const dateObj = new Date(`${month} ${day}, ${year}`)
  if (isNaN(dateObj.getTime())) {
    return null
  }

  const isoDate = dateObj.toISOString().split('T')[0]

  // Create a readable display date
  const dateDisplay = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Generate event ID from date + hash of title
  const eventId = `pond_${isoDate}_${hashString(title).slice(0, 8)}`

  return {
    date: isoDate,
    dateDisplay,
    id: eventId,
  }
}

/**
 * Filter events matching a regex pattern
 */
export function filterEventsByPattern(
  titles: string[],
  pattern: string
): string[] {
  try {
    const regex = new RegExp(pattern, 'i')
    return titles.filter((title) => regex.test(title))
  } catch (error) {
    console.error('Invalid regex pattern:', pattern, error)
    return []
  }
}

/**
 * Extract date from title and generate Shopify product URL
 */
export function generateShopifyUrl(title: string, baseUrl: string): string {
  // Extract date components from title
  const dateMatch = title.match(
    /([A-Z][a-z]+)\s+(\d+)(?:st|nd|rd|th)?.*?(\d{4})/
  )

  if (!dateMatch) {
    return ''
  }

  // Convert to URL slug: "may-29th-friday-2026"
  const month = dateMatch[1].toLowerCase()
  const day = dateMatch[2]
  const year = dateMatch[3]

  const slug = `${month}-${day}th-friday-${year}`.replace(/\s+/g, '-')

  // Ensure base URL doesn't have trailing slash
  const cleanBase = baseUrl.replace(/\/$/, '')

  return `${cleanBase}/products/${slug}`
}

/**
 * Simple hash function for generating IDs
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Main scraper function: detect new events for an event type
 */
export async function detectNewEvents(
  eventType: EventType
): Promise<DetectedEvent[]> {
  try {
    // Scrape the source URL
    const html = await scrapeShopifyProducts(eventType.source_url)

    // Extract all event titles
    const allTitles = extractEventTitles(html)

    // Filter by pattern
    const matchedTitles = filterEventsByPattern(allTitles, eventType.source_pattern)

    if (matchedTitles.length === 0) {
      console.log(`No events found for ${eventType.name}`)
      return []
    }

    // Parse titles into structured events
    const events: DetectedEvent[] = []

    for (const title of matchedTitles) {
      const parsed = parseEventFromTitle(title)
      if (parsed) {
        events.push({
          id: parsed.id,
          title,
          date: parsed.date,
          date_display: parsed.dateDisplay,
          registration_url: generateShopifyUrl(title, eventType.source_url),
        })
      }
    }

    // Sort by date (newest first)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`Found ${events.length} events for ${eventType.name}`)
    return events
  } catch (error) {
    console.error(`Error detecting events for ${eventType.name}:`, error)
    throw error
  }
}
