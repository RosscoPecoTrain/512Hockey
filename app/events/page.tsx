'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Event, Location } from '@/types'

interface EventWithLocation extends Event {
  locations: Location
  event_types: { id: string; name: string }
}

type SortField = 'start_time' | 'title' | 'locations.name'
type SortDirection = 'asc' | 'desc'

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventWithLocation[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventWithLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [locations, setLocations] = useState<Location[]>([])
  const [sortField, setSortField] = useState<SortField>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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
    let filtered = events
    
    if (selectedLocation !== 'all') {
      filtered = events.filter((evt) => evt.location_id === selectedLocation)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'locations.name') {
        aVal = a.locations?.name
        bVal = b.locations?.name
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredEvents(sorted)
  }, [selectedLocation, events, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

      {/* Events Table */}
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
        <div className="overflow-x-auto border border-gray-200 dark:border-[#30363d] rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-[#30363d]">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#e6edf3] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#161b22]" onClick={() => handleSort('title')}>
                  Event <SortIndicator field="title" />
                </th>
                <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#e6edf3] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#161b22]" onClick={() => handleSort('locations.name')}>
                  Rink <SortIndicator field="locations.name" />
                </th>
                <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#e6edf3] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#161b22]" onClick={() => handleSort('start_time')}>
                  Date & Time <SortIndicator field="start_time" />
                </th>
                <th className="px-6 py-3 font-semibold text-gray-900 dark:text-[#e6edf3] text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
              {filteredEvents.map((event) => {
                const { date, time } = formatDateTime(event.start_time)
                return (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-[#161b22] transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-[#e6edf3]">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-1">
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-[#e6edf3]">
                        {event.locations?.name}
                      </p>
                      {event.locations?.city && (
                        <p className="text-xs text-gray-500 dark:text-[#8b949e]">
                          {event.locations.city}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-[#e6edf3]">
                        {date}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-[#8b949e]">
                        {time}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        {event.registration_url && (
                          <a
                            href={event.registration_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-4 py-1 rounded font-medium hover:bg-white transition text-xs"
                          >
                            Register
                          </a>
                        )}
                        {event.locations?.website_url && (
                          <a
                            href={event.locations.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-[#4fc3f7] text-[#4fc3f7] px-4 py-1 rounded font-medium hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:text-[#e6edf3] transition text-xs"
                          >
                            Rink Info
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
