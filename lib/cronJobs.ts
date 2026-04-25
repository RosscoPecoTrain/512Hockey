import cron from 'node-cron'
import { checkForNewEventPostings } from './eventNotificationJob'
import { cleanupOldLogs } from './jobLogger'
import { scrapeDropInHockeyEvents } from './dropInScraper'

let cronInitialized = false

export function initializeCronJobs() {
  if (cronInitialized) {
    console.log('⚠️  Cron jobs already initialized')
    return
  }

  cronInitialized = true

  // Run every 6 hours: 0 AM, 6 AM, 12 PM, 6 PM
  cron.schedule('0 */6 * * *', async () => {
    console.log('🏒 Running event notification job...')
    try {
      await checkForNewEventPostings()
      console.log('✅ Event notification job completed')
    } catch (error) {
      console.error('❌ Event notification job failed:', error)
    }
  })

  console.log('✓ Event notification cron job initialized (every 6 hours)')

  // Run daily at 2 AM: cleanup old job logs (older than 90 days)
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running job log cleanup...')
    try {
      const deletedCount = await cleanupOldLogs(90)
      console.log(`✅ Cleaned up ${deletedCount} old job logs`)
    } catch (error) {
      console.error('❌ Job log cleanup failed:', error)
    }
  })

  console.log('✓ Job log cleanup cron job initialized (daily at 2 AM)')

  // Run every 6 hours: scrape drop-in hockey events
  cron.schedule('0 */6 * * *', async () => {
    console.log('🏒 Running drop-in hockey scraper...')
    try {
      const result = await scrapeDropInHockeyEvents()
      console.log(
        `✅ Drop-in hockey scraper completed: Created ${result.eventsCreated}, Updated ${result.eventsUpdated}, Locations ${result.locationsScraped}`
      )
      if (result.errors.length > 0) {
        console.warn('⚠️  Scraper errors:', result.errors)
      }
    } catch (error) {
      console.error('❌ Drop-in hockey scraper failed:', error)
    }
  })

  console.log('✓ Drop-in hockey scraper cron job initialized (every 6 hours)')
}
