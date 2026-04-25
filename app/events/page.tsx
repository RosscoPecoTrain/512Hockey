'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Event, Location } from '@/types'

interface EventWithLocation extends Event {
  locations: Location
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventWithLocation[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventWithLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [locations, setLocations] = useState<Location[]>([])

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }
    }
    checkAuth()
  }, [router])

  // Fetch events
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch locations for filter
        const { data: locData, error: locError } = await supabase
          .from('locations')
          .select('*')
          .eq('location_type', 'rink')
          .order('name')

        if (locError) throw locError
        setLocations(locData || [])

        // Fetch upcoming events
        const today = new Date().toISOString()
        const { data: evtData, error: evtError } = await supabase
          .from('events')
          .select('*, locations(*), event_types(*)')
          .gte('start_time', today)
          .order('start_time', { ascending: true })

        if (evtError) throw evtError
        
        // Filter for Drop-In Hockey events
        const dropInEvents = (evtData || []).filter(
          (evt: any) => evt.event_types?.name === 'Drop-In Hockey'
        )
        setEvents(dropInEvents as EventWithLocation[])
        setFilteredEvents(dropInEvents as EventWithLocation[])
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter events by location
  useEffect(() => {
    if (selectedLocation === 'all') {
      setFilteredEvents(events)
    } else {
      setFilteredEvents(
        events.filter((evt) => evt.location_id === selectedLocation)
      )
    }
  }, [selectedLocation, events])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#0a1628] dark:text-[#e6edf3]">
          🏒 Drop-In Hockey Games
        </h1>
        <p className="text-gray-600 dark:text-[#8b949e]">
          Upcoming drop-in hockey events at Austin rinks
        </p>
      </div>

      {/* Filter */}
      {locations.length > 0 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Filter by Rink
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedLocation === 'all'
                  ? 'bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3]'
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Rinks
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedLocation === loc.id
                    ? 'bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3]'
                    : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No upcoming drop-in hockey games found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const { date, time } = formatDateTime(event.start_time)
            return (
              <div
                key={event.id}
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-[#30363d] hover:border-[#4fc3f7] hover:shadow-lg transition p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-2">
                      {event.title}
                    </h3>
                    <div className="space-y-1 text-gray-600 dark:text-[#8b949e]">
                      <p>
                        <span className="font-medium">📍 Location:</span>{' '}
                        {event.locations?.name}
                      </p>
                      <p>
                        <span className="font-medium">📅 Date:</span> {date}
                      </p>
                      <p>
                        <span className="font-medium">🕒 Time:</span> {time}
                      </p>
                      {event.locations?.city && (
                        <p>
                          <span className="font-medium">🏙️ City:</span>{' '}
                          {event.locations.city}
                        </p>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-gray-700 dark:text-[#e6edf3] mt-3">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {event.registration_url && (
                      <a
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-6 py-2 rounded-lg font-semibold hover:bg-white transition whitespace-nowrap"
                      >
                        Register
                      </a>
                    )}
                    {event.locations?.website_url && (
                      <a
                        href={event.locations.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-[#4fc3f7] text-[#4fc3f7] px-6 py-2 rounded-lg font-semibold hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:text-[#e6edf3] transition whitespace-nowrap"
                      >
                        Rink Info
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
