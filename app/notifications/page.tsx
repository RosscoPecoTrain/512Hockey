'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { EventType, UserEventSubscription } from '@/types'
import SubscriptionModal from './subscription-modal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function NotificationsPage() {
  const router = useRouter()
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [subscriptions, setSubscriptions] = useState<UserEventSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/auth/signin')
        return
      }

      setUser(authUser)
      await loadData(authUser)
    }

    checkAuth()
  }, [router])

  async function loadData(authUser: any) {
    try {
      // Get all event types
      const eventTypesRes = await fetch('/api/notifications/types')
      const { event_types } = await eventTypesRes.json()
      setEventTypes(event_types || [])

      // Get user's subscriptions
      const { data: session } = await supabase.auth.getSession()
      if (session?.session) {
        const subsRes = await fetch('/api/notifications/subscriptions', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        })
        const { subscriptions: userSubs } = await subsRes.json()
        setSubscriptions(userSubs || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openSubscriptionModal(eventType: EventType) {
    setSelectedEventType(eventType)
    setModalOpen(true)
  }

  async function handleSubscribeWithChannels(channels: string[]) {
    if (!user || !selectedEventType) return

    setUpdating(selectedEventType.id)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) return

      const res = await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type_id: selectedEventType.id,
          notify_via: channels,
        }),
      })

      if (res.ok) {
        const { subscription } = await res.json()
        setSubscriptions([...subscriptions, subscription])
      }
    } catch (error) {
      console.error('Error subscribing:', error)
    } finally {
      setUpdating(null)
    }
  }

  async function unsubscribe(subscriptionId: string, eventTypeId: string) {
    setUpdating(eventTypeId)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) return

      const res = await fetch(`/api/notifications/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      })

      if (res.ok) {
        setSubscriptions(
          subscriptions.filter((s) => s.id !== subscriptionId)
        )
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏒 Event Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Subscribe to be notified when new events are posted.
        </p>
      </div>

      {/* Event Types Grid */}
      {eventTypes.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No event types available yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {eventTypes.map((eventType) => {
            const isSubscribed = subscriptions.some(
              (s) => s.event_type_id === eventType.id
            )
            const isUpdating = updating === eventType.id

            return (
              <div
                key={eventType.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {eventType.name}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>📍 {eventType.location}</span>
                      {eventType.rink && <span>🏟️ {eventType.rink}</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You'll be notified when new dates are posted.
                    </p>

                    {/* Last Check Status */}
                    {eventType.last_check_at && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="inline-block">
                          ✓ Last checked:{' '}
                          {new Date(eventType.last_check_at).toLocaleString()}
                        </span>
                        {eventType.last_detected_event_title && (
                          <span className="inline-block ml-3">
                            Latest: {eventType.last_detected_event_title}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subscribe/Unsubscribe Button */}
                  {isSubscribed ? (
                    <button
                      onClick={() => {
                        const sub = subscriptions.find(
                          (s) => s.event_type_id === eventType.id
                        )
                        if (sub) unsubscribe(sub.id, eventType.id)
                      }}
                      disabled={isUpdating}
                      className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-colors bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUpdating ? '...' : '✓ Subscribed'}
                    </button>
                  ) : (
                    <button
                      onClick={() => openSubscriptionModal(eventType)}
                      disabled={isUpdating}
                      className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-colors bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Your Subscriptions Summary */}
      {subscriptions.length > 0 && (
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Your Subscriptions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            You're subscribed to {subscriptions.length} event type
            {subscriptions.length !== 1 ? 's' : ''}.
          </p>
          <ul className="space-y-2">
            {subscriptions.map((sub) => {
              const eventType = eventTypes.find((et) => et.id === sub.event_type_id)
              return (
                <li key={sub.id} className="text-sm">
                  <span className="inline-block">🔔 {eventType?.name}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Subscription Modal */}
      {selectedEventType && (
        <SubscriptionModal
          eventTypeName={selectedEventType.name}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubscribe={handleSubscribeWithChannels}
          isLoading={updating === selectedEventType.id}
        />
      )}

      {/* Info Box */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-2">
          <strong>How it works:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Subscribe to event types you're interested in</li>
          <li>Choose your notification channels (push, email)</li>
          <li>We check for new events every 6 hours</li>
          <li>You'll be notified when new dates are posted</li>
          <li>Notifications include a direct link to register</li>
        </ul>
      </div>
    </div>
  )
}
