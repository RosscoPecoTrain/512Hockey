'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface Rink {
  id: string
  name: string
  location?: string
}

interface RinkEvent {
  id: string
  rink_id: string
  event_name: string
  event_type: string
  start_time: string
  end_time: string
  capacity?: number
  skill_level?: string
  rinks?: Rink
}

export default function EventsPage() {
  const [events, setEvents] = useState<RinkEvent[]>([])
  const [rinks, setRinks] = useState<Record<string, Rink>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    rinkId?: string
    eventType?: string
  }>({})

  useEffect(() => {
    loadEvents()
  }, [filter])

  const loadEvents = async () => {
    setLoading(true)
    try {
      // Fetch rinks
      const { data: rinksData } = await supabase
        .from('rinks')
        .select('id, name, location')

      if (rinksData) {
        const rinkMap = Object.fromEntries(rinksData.map(r => [r.id, r]))
        setRinks(rinkMap)
      }

      // Fetch events
      let query = supabase
        .from('rink_events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (filter.rinkId) {
        query = query.eq('rink_id', filter.rinkId)
      }

      if (filter.eventType) {
        query = query.eq('event_type', filter.eventType)
      }

      const { data } = await query

      setEvents(data || [])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const groupedByDate = events.reduce(
    (acc, evt) => {
      const date = new Date(evt.start_time).toLocaleDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(evt)
      return acc
    },
    {} as Record<string, RinkEvent[]>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading events...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏒 Hockey Drop-In Events</h1>
          <p className="text-gray-600">Find upcoming drop-in hockey sessions at Austin rinks</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rink</label>
              <select
                value={filter.rinkId || ''}
                onChange={(e) => setFilter({ ...filter, rinkId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Rinks</option>
                {Object.values(rinks).map((rink) => (
                  <option key={rink.id} value={rink.id}>
                    {rink.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={filter.eventType || ''}
                onChange={(e) => setFilter({ ...filter, eventType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="Hockey Drop In">Hockey Drop In</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events */}
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No events found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByDate).map(([date, dayEvents]) => (
              <div key={date}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{date}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayEvents.map((evt) => {
                    const rink = rinks[evt.rink_id]
                    return (
                      <div key={evt.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
                        <div className="mb-2">
                          <h3 className="font-bold text-gray-900">{evt.event_name}</h3>
                          {rink && (
                            <p className="text-sm text-gray-600">{rink.name}</p>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-semibold">Time:</span> {formatTime(evt.start_time)} -{' '}
                            {formatTime(evt.end_time)}
                          </div>
                          {evt.skill_level && (
                            <div>
                              <span className="font-semibold">Level:</span> {evt.skill_level}
                            </div>
                          )}
                          {evt.capacity && (
                            <div>
                              <span className="font-semibold">Capacity:</span> {evt.capacity}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition">
                            Register
                          </button>
                          {evt.rinks && (
                            <a
                              href={evt.rinks.location || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition"
                            >
                              Map
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
