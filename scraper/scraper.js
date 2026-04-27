import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DAYSMART_URL = process.env.DAYSMART_URL || 'https://apps.daysmartrecreation.com/dash/x/#/online/chaparralice/calendar?start=2026-04-27&end=2026-05-04&event_type=9&location=1';
const SCRAPE_SCHEDULE = process.env.SCRAPE_SCHEDULE || '0 */6 * * *'; // Every 6 hours

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Scrape DaySmart calendar and extract events
 */
async function scrapeDaySmart() {
  console.log(`[${new Date().toISOString()}] Starting DaySmart scrape...`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Navigate to DaySmart calendar
    console.log(`[${new Date().toISOString()}] Navigating to ${DAYSMART_URL}...`);
    await page.goto(DAYSMART_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for events to load - try multiple selectors
    console.log(`[${new Date().toISOString()}] Waiting for events to render...`);
    try {
      await page.waitForSelector('[class*="event-item"], [class*="EventItem"], [class*="eventCard"]', { timeout: 10000 });
    } catch (e) {
      console.warn('Primary event selector not found, waiting 3 seconds for dynamic content...');
      await page.waitForTimeout(3000);
    }

    // Extract events from the page
    const events = await page.evaluate(() => {
      const extracted = [];
      
      // Look for event containers - DaySmart uses various class structures
      const eventElements = document.querySelectorAll(
        '[class*="event"], [class*="Event"], [role="listitem"], .calendar-event, .drop-in-event'
      );

      console.log(`Found ${eventElements.length} potential event elements`);

      eventElements.forEach((el) => {
        // Extract text content
        const fullText = el.textContent?.trim() || '';
        if (!fullText) return; // Skip empty elements

        // Try to find title (usually bold or heading-like)
        const title = el.querySelector('strong, b, h3, h4, [class*="title"], [class*="name"]')?.textContent?.trim() || 
                     fullText.split('\n')[0].trim();
        
        // Try to find time
        const time = el.querySelector('[class*="time"], [class*="Time"]')?.textContent?.trim() ||
                    fullText.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)/i)?.[0] || '';
        
        // Try to find location
        const location = el.querySelector('[class*="location"], [class*="Location"]')?.textContent?.trim() ||
                        fullText.match(/(?:at|@)\s*([A-Za-z\s]+(?:Rink|Ice|Arena|Center))/i)?.[1]?.trim() || '';

        // Only add if we have at least title and time
        if (title && time && title.length > 3) {
          extracted.push({
            title: title,
            time: time,
            location: location || 'TBD',
            fullText: fullText,
          });
        }
      });

      return extracted;
    });

    // Log page HTML for debugging
    const pageHTML = await page.content();
    console.log(`[${new Date().toISOString()}] Page length: ${pageHTML.length} chars`);

    console.log(`[${new Date().toISOString()}] Found ${events.length} events`);

    // Parse and insert events into Supabase
    if (events.length > 0) {
      await insertEventsToSupabase(events);
    } else {
      console.warn('No events found on page. Check DaySmart page structure.');
    }

    await browser.close();
    console.log(`[${new Date().toISOString()}] Scrape completed successfully`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during scrape:`, error.message);
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Insert or update events in Supabase
 */
async function insertEventsToSupabase(events) {
  try {
    // Transform events into database format
    const formattedEvents = events.map((event) => {
      const eventDate = parseEventDateTime(event.time);
      
      return {
        title: event.title,
        description: event.location,
        start_time: eventDate.start,
        end_time: eventDate.end,
        location: event.location,
        source: 'daysmart',
        external_url: DAYSMART_URL,
        created_at: new Date().toISOString(),
      };
    });

    // Delete old events (older than 30 days) to avoid duplicates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('source', 'daysmart')
      .lt('start_time', thirtyDaysAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old events:', deleteError);
    }

    // Insert new events
    const { data, error } = await supabase
      .from('events')
      .upsert(formattedEvents, { onConflict: 'title,start_time' });

    if (error) {
      console.error('Error inserting events:', error);
      throw error;
    }

    console.log(`[${new Date().toISOString()}] Successfully inserted ${formattedEvents.length} events`);
    return data;

  } catch (error) {
    console.error('Error in insertEventsToSupabase:', error.message);
    throw error;
  }
}

/**
 * Parse event time string and return ISO datetime objects
 * This is a placeholder - adjust based on actual DaySmart time format
 */
function parseEventDateTime(timeStr) {
  try {
    // Example: "6:00 AM - 7:30 AM" or "12:00 PM"
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Parse start time (simplified - adjust regex based on actual format)
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    
    if (timeMatch) {
      let [, hours, minutes, period] = timeMatch;
      hours = parseInt(hours);
      minutes = parseInt(minutes);

      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }

      const startTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); // Default 90 min duration

      return {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      };
    }

    // Fallback: return current time + 1 hour
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };

  } catch (error) {
    console.error('Error parsing event datetime:', error);
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
}

/**
 * Initialize cron job
 */
function startScheduler() {
  console.log(`[${new Date().toISOString()}] Scheduler initialized with cron: "${SCRAPE_SCHEDULE}"`);

  // Run immediately on startup
  scrapeDaySmart().catch((err) => {
    console.error('Initial scrape failed:', err);
  });

  // Schedule recurring scrapes
  cron.schedule(SCRAPE_SCHEDULE, () => {
    scrapeDaySmart().catch((err) => {
      console.error('Scheduled scrape failed:', err);
    });
  });

  console.log('Scraper is running. Waiting for next scheduled run...');
}

// Start the scheduler
startScheduler();
