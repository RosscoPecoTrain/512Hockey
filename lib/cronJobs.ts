import cron from 'node-cron'
import { checkForNewEventPostings } from './eventNotificationJob'

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
}
