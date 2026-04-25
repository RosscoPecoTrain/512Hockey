import { createClient } from '@supabase/supabase-js'
import { EventType, UserEventSubscription, DetectedEvent } from '@/types'
import { detectNewEvents } from './eventScraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Main job: Check all active event types for new postings
 * Call this periodically (e.g., every 6 hours via cron)
 */
export async function checkForNewEventPostings() {
  console.log('🏒 Starting event notification job...')

  const client = supabase

  try {
    // Get all active event types
    const { data: eventTypes, error: fetchError } = await client
      .from('event_types')
      .select('*')
      .eq('active', true)

    if (fetchError) {
      throw fetchError
    }

    if (!eventTypes || eventTypes.length === 0) {
      console.log('No active event types to check')
      return
    }

    console.log(`Found ${eventTypes.length} active event type(s) to monitor`)

    for (const eventType of eventTypes as EventType[]) {
      await processEventType(eventType)
    }

    console.log('✅ Event notification job completed')
  } catch (error) {
    console.error('❌ Job failed:', error)
    throw error
  }
}

/**
 * Process a single event type
 */
async function processEventType(eventType: EventType) {
  const client = supabase

  console.log(`\n🔍 Checking ${eventType.name}...`)

  try {
    // Detect new events
    const detectedEvents = await detectNewEvents(eventType)

    if (detectedEvents.length === 0) {
      console.log(`No events found for ${eventType.name}`)

      await client
        .from('event_types')
        .update({
          last_check_at: new Date().toISOString(),
          last_check_status: 'no_new_events',
          last_check_error: null,
        })
        .eq('id', eventType.id)

      return
    }

    // Get the latest event (already sorted by date)
    const latestEvent = detectedEvents[0]

    // Check if this is newer than what we've already detected
    const lastDetectedDate = eventType.last_detected_event_date
      ? new Date(eventType.last_detected_event_date)
      : null
    const newEventDate = new Date(latestEvent.date)

    if (lastDetectedDate && newEventDate <= lastDetectedDate) {
      console.log(`No new events since ${lastDetectedDate.toDateString()}`)

      await client
        .from('event_types')
        .update({
          last_check_at: new Date().toISOString(),
          last_check_status: 'no_new_events',
          last_check_error: null,
        })
        .eq('id', eventType.id)

      return
    }

    // NEW EVENT DETECTED
    console.log(`✨ New event detected: ${latestEvent.title}`)

    // Get all active subscribers for this event type
    const { data: subscribers, error: subError } = await client
      .from('user_event_subscriptions')
      .select('*')
      .eq('event_type_id', eventType.id)
      .eq('active', true)

    if (subError) {
      throw subError
    }

    console.log(`Found ${subscribers?.length || 0} subscriber(s)`)

    // Notify each subscriber
    if (subscribers) {
      for (const subscription of subscribers as UserEventSubscription[]) {
        await notifySubscriber(
          subscription,
          eventType,
          latestEvent
        )
      }
    }

    // Update event type with latest detected
    const { error: updateError } = await client
      .from('event_types')
      .update({
        last_detected_event_id: latestEvent.id,
        last_detected_event_title: latestEvent.title,
        last_detected_event_date: latestEvent.date,
        last_detected_at: new Date().toISOString(),
        last_check_at: new Date().toISOString(),
        last_check_status: 'success',
        last_check_error: null,
      })
      .eq('id', eventType.id)

    if (updateError) {
      throw updateError
    }

    console.log(`✅ Completed ${eventType.name}`)
  } catch (error) {
    console.error(`Error processing ${eventType.name}:`, error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    await supabase
      .from('event_types')
      .update({
        last_check_at: new Date().toISOString(),
        last_check_status: 'error',
        last_check_error: errorMessage,
      })
      .eq('id', eventType.id)
  }
}

/**
 * Notify a subscriber about a new event
 */
async function notifySubscriber(
  subscription: UserEventSubscription,
  eventType: EventType,
  event: DetectedEvent
) {
  const client = supabase

  try {
    // Check if user was already notified about this event
    const { data: existing, error: checkError } = await client
      .from('event_notifications')
      .select('id')
      .eq('user_id', subscription.user_id)
      .eq('detected_event_id', event.id)

    if (checkError) {
      throw checkError
    }

    if (existing && existing.length > 0) {
      console.log(
        `User ${subscription.user_id} already notified about ${event.id}`
      )
      return
    }

    // Insert notification record
    const { error: insertError } = await client
      .from('event_notifications')
      .insert([
        {
          user_id: subscription.user_id,
          event_type_id: eventType.id,
          detected_event_id: event.id,
          detected_event_title: event.title,
          detected_event_date: event.date,
          registration_url: event.registration_url,
          notify_channels: subscription.notify_via,
          delivery_status: {},
        },
      ])

    if (insertError) {
      throw insertError
    }

    console.log(`📬 Notification recorded for ${subscription.user_id}`)

    // Send actual notifications (placeholder for now)
    await sendNotifications(
      subscription.user_id,
      subscription.notify_via,
      {
        title: `🏒 ${eventType.name}`,
        subtitle: event.date_display,
        body: 'New event posted on The Pond Hockey Club',
        url: event.registration_url,
      }
    )
  } catch (error) {
    console.error(`Failed to notify subscriber ${subscription.user_id}:`, error)
  }
}

/**
 * Send notifications via configured channels
 * Currently a placeholder - integrate with your notification service
 */
async function sendNotifications(
  userId: string,
  channels: string[],
  message: {
    title: string
    subtitle: string
    body: string
    url: string
  }
) {
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          console.log(`[PUSH] ${message.title} - ${message.body}`)
          // TODO: Integrate with your push notification service
          // await sendPushNotification(userId, message)
          break

        case 'email':
          console.log(`[EMAIL] ${message.title} - ${message.body}`)
          // TODO: Integrate with your email service
          // await sendEmailNotification(userId, message)
          break

        case 'sms':
          console.log(`[SMS] ${message.title} - ${message.body}`)
          // TODO: Integrate with your SMS service
          // await sendSMSNotification(userId, message)
          break

        default:
          console.warn(`Unknown notification channel: ${channel}`)
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error)
    }
  }
}

export { checkForNewEventPostings as default }
