'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/types'

export default function Rinks() {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('location_type', 'rink')
          .order('name', { ascending: true })

        if (error) throw error
        setLocations(data || [])
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628] dark:text-[#e6edf3]">Austin Ice Rinks</h1>
      <p className="text-gray-600 dark:text-[#8b949e] mb-12 text-lg">
        Discover the best ice rinks in Austin. Click on a rink to visit their website and book ice time.
      </p>

      {isLoading ? (
        <p className="text-gray-600 dark:text-[#8b949e]">Loading rinks...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white dark:bg-[#161b22] rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-[#30363d] hover:border-[#4fc3f7] hover:shadow-lg dark:shadow-none transition overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2f4a] text-white p-6">
                <h3 className="text-2xl font-bold">{location.name}</h3>
              </div>
              <div className="p-6">
                {location.address && (
                  <p className="text-gray-600 dark:text-[#8b949e] mb-2">
                    <span className="font-medium text-[#0a1628] dark:text-[#e6edf3]">Location:</span> {location.address}
                  </p>
                )}
                {location.city && (
                  <p className="text-gray-600 dark:text-[#8b949e] mb-4">
                    <span className="font-medium text-[#0a1628] dark:text-[#e6edf3]">City:</span> {location.city}
                  </p>
                )}
                {location.description && (
                  <p className="text-gray-700 dark:text-[#e6edf3] mb-4">{location.description}</p>
                )}
                <div className="flex gap-3 mt-6">
                  {location.website_url && (
                    <a
                      href={location.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-4 py-2 rounded font-semibold text-center hover:bg-white transition"
                    >
                      Visit Website
                    </a>
                  )}
                  {location.booking_url && location.booking_url !== location.website_url && (
                    <a
                      href={location.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 border-2 border-[#4fc3f7] text-[#4fc3f7] px-4 py-2 rounded font-semibold text-center hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:text-[#e6edf3] transition"
                    >
                      Book Ice
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
