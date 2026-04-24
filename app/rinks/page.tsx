'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Rink } from '@/types'

export default function Rinks() {
  const [rinks, setRinks] = useState<Rink[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRinks = async () => {
      try {
        const { data, error } = await supabase.from('rinks').select('*')

        if (error) throw error
        setRinks(data || [])
      } catch (error) {
        console.error('Error fetching rinks:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRinks()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628]">Austin Ice Rinks</h1>
      <p className="text-gray-600 mb-12 text-lg">
        Discover the best ice rinks in Austin. Click on a rink to visit their website and book ice time.
      </p>

      {isLoading ? (
        <p className="text-gray-600">Loading rinks...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rinks.map((rink) => (
            <div
              key={rink.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 hover:border-[#4fc3f7] hover:shadow-lg transition overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2f4a] text-white p-6">
                <h3 className="text-2xl font-bold">{rink.name}</h3>
              </div>
              <div className="p-6">
                {rink.address && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium text-[#0a1628]">Location:</span> {rink.address}
                  </p>
                )}
                {rink.city && (
                  <p className="text-gray-600 mb-4">
                    <span className="font-medium text-[#0a1628]">City:</span> {rink.city}
                  </p>
                )}
                {rink.description && (
                  <p className="text-gray-700 mb-4">{rink.description}</p>
                )}
                <div className="flex gap-3 mt-6">
                  {rink.website_url && (
                    <a
                      href={rink.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#4fc3f7] text-[#0a1628] px-4 py-2 rounded font-semibold text-center hover:bg-white transition"
                    >
                      Visit Website
                    </a>
                  )}
                  {rink.booking_url && rink.booking_url !== rink.website_url && (
                    <a
                      href={rink.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 border-2 border-[#4fc3f7] text-[#4fc3f7] px-4 py-2 rounded font-semibold text-center hover:bg-[#4fc3f7] hover:text-[#0a1628] transition"
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
