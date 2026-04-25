import puppeteer, { Browser, Page } from 'puppeteer'

export interface RinkEvent {
  rinkId: string
  rinkName: string
  eventName: string
  eventType: string
  startTime: Date
  endTime: Date
  capacity?: number
  skill_level?: string
  source_url: string
}

interface DaySmartRink {
  id: string
  name: string
  daysmart_company: string // e.g., "chaparralice"
}

const HOCKEY_DROP_IN_KEYWORDS = ['hockey drop', 'drop-in', 'drop in', 'hockey', 'stick and puck']

/**
 * Scrapes DaySmart Recreation calendar for Hockey Drop In events
 */
export class DaySmartScraper {
  private browser: Browser | null = null

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Scrape a single rink's hockey drop-in events
   */
  async scrapeRink(rink: DaySmartRink, daysToFetch: number = 30): Promise<RinkEvent[]> {
    if (!this.browser) await this.init()

    const page = await this.browser!.newPage()
    const events: RinkEvent[] = []

    try {
      // Navigate to the DaySmart calendar
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + daysToFetch * 24 * 60 * 60 * 1000)

      const url = `https://apps.daysmartrecreation.com/dash/x/#/online/${rink.daysmart_company}/calendar?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`

      console.log(`[${rink.name}] Navigating to: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

      // Wait for the calendar events to load
      console.log(`[${rink.name}] Waiting for events to load...`)
      await page.waitForSelector('[data-event], .event-item, .calendar-event', {
        timeout: 10000
      }).catch(() => {
        console.log(`[${rink.name}] Warning: Could not find event selectors, attempting fallback...`)
      })

      // Give extra time for dynamic content to render
      await page.waitForTimeout(2000)

      // Extract events from the rendered page
      console.log(`[${rink.name}] Extracting events...`)
      const pageEvents = await page.evaluate((keywords: string[]) => {
        const results: any[] = []

        // Look for event elements in various possible formats
        const eventSelectors = [
          '[data-event]',
          '.event-item',
          '.calendar-event',
          '[role="button"][data-testid*="event"]',
          '.fc-event',
          '[class*="event"]'
        ]

        let eventElements: Element[] = []
        for (const selector of eventSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            eventElements = Array.from(elements)
            break
          }
        }

        for (const el of eventElements) {
          const text = el.textContent || ''
          const title = el.getAttribute('data-title') || el.getAttribute('title') || ''
          const dataEvent = el.getAttribute('data-event') || ''
          const ariaLabel = el.getAttribute('aria-label') || ''

          // Check if this is a hockey drop-in event
          const fullText = `${text} ${title} ${dataEvent} ${ariaLabel}`.toLowerCase()
          const isHockeyDropIn = keywords.some(keyword => fullText.includes(keyword.toLowerCase()))

          if (isHockeyDropIn) {
            results.push({
              text,
              title,
              dataEvent,
              ariaLabel,
              className: el.className,
              innerHTML: el.innerHTML.substring(0, 500) // Limit HTML size
            })
          }
        }

        return results
      }, HOCKEY_DROP_IN_KEYWORDS)

      console.log(`[${rink.name}] Found ${pageEvents.length} potential hockey drop-in events`)

      // Parse the events
      for (const evt of pageEvents) {
        const parsed = this.parseEvent(rink, evt)
        if (parsed) {
          events.push(parsed)
        }
      }
    } catch (error) {
      console.error(`[${rink.name}] Scraping error:`, error)
    } finally {
      await page.close()
    }

    return events
  }

  /**
   * Parse an event element into a RinkEvent
   */
  private parseEvent(rink: DaySmartRink, eventData: any): RinkEvent | null {
    try {
      const text = eventData.text || eventData.title || eventData.ariaLabel || ''

      // Extract event name (usually the first line or before time)
      const eventName = text.split('\n')[0] || text.substring(0, 100)

      // Try to extract time from various formats
      // Common patterns: "HH:MM AM/PM", "HH:MM - HH:MM", etc.
      const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i)
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})/i)

      if (!timeMatch) {
        console.log(`[${rink.name}] Could not extract time from: ${text}`)
        return null
      }

      let startTime = new Date()
      let endTime = new Date(startTime.getTime() + 90 * 60 * 1000) // Default 90 min

      // Parse time
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const meridiem = timeMatch[3]?.toLowerCase()

      if (meridiem === 'pm' && hours !== 12) hours += 12
      if (meridiem === 'am' && hours === 12) hours = 0

      startTime.setHours(hours, minutes, 0)

      // Parse date if found
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1
        const day = parseInt(dateMatch[2])
        startTime.setMonth(month)
        startTime.setDate(day)
      }

      endTime = new Date(startTime.getTime() + 90 * 60 * 1000)

      return {
        rinkId: rink.id,
        rinkName: rink.name,
        eventName: eventName.trim(),
        eventType: 'Hockey Drop In',
        startTime,
        endTime,
        source_url: `https://apps.daysmartrecreation.com/dash/x/#/online/${rink.daysmart_company}/calendar`
      }
    } catch (error) {
      console.error('Error parsing event:', error)
      return null
    }
  }

  /**
   * Scrape multiple rinks
   */
  async scrapeMultiple(rinks: DaySmartRink[], daysToFetch: number = 30): Promise<RinkEvent[]> {
    await this.init()

    const allEvents: RinkEvent[] = []

    for (const rink of rinks) {
      try {
        const rinkEvents = await this.scrapeRink(rink, daysToFetch)
        allEvents.push(...rinkEvents)
        console.log(`[${rink.name}] Scraped ${rinkEvents.length} events`)
      } catch (error) {
        console.error(`[${rink.name}] Failed to scrape:`, error)
      }
    }

    return allEvents
  }
}

export default DaySmartScraper
