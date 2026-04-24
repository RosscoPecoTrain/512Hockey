'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

export default function Directory() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null)
    })
  }, [])

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        let query = supabase.from('profiles').select('*')

        if (searchTerm) {
          query = query.or(`full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        }

        if (positionFilter) {
          query = query.eq('position', positionFilter)
        }

        const { data, error } = await query

        if (error) throw error
        setProfiles(data || [])
      } catch (error) {
        console.error('Error fetching profiles:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchProfiles, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, positionFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628]">Player Directory</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Players
            </label>
            <input
              type="text"
              placeholder="Name, bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
            >
              <option value="">All Positions</option>
              <option value="Forward">Forward</option>
              <option value="Defense">Defense</option>
              <option value="Goalie">Goalie</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      {isLoading ? (
        <p className="text-center text-gray-600">Loading players...</p>
      ) : profiles.length === 0 ? (
        <p className="text-center text-gray-600">No players found. Be the first to join!</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border border-gray-200 hover:border-[#4fc3f7]">
                <Link href={`/profile/${profile.id}`}>
                  <div className="flex items-start justify-between mb-4 cursor-pointer">
                    <div>
                      <h3 className="text-xl font-semibold text-[#0a1628] hover:text-[#4fc3f7] transition">
                        {profile.full_name}
                      </h3>
                      {profile.position && (
                        <p className="text-[#4fc3f7] font-medium">{profile.position}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-[#4fc3f7] rounded-full flex items-center justify-center text-[#0a1628] font-bold">
                      {profile.full_name?.charAt(0)}
                    </div>
                  </div>
                  {profile.skill_level && (
                    <p className="text-sm text-gray-600 mb-2">
                      Skill: <span className="font-medium">{profile.skill_level}</span>
                    </p>
                  )}
                  {profile.bio && (
                    <p className="text-sm text-gray-700 line-clamp-2">{profile.bio}</p>
                  )}
                  {profile.leagues && profile.leagues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {profile.leagues.slice(0, 2).map((league, idx) => (
                        <span key={idx} className="inline-block bg-[#4fc3f7] text-[#0a1628] text-xs px-2 py-1 rounded">
                          {league}
                        </span>
                      ))}
                      {profile.leagues.length > 2 && (
                        <span className="inline-block text-xs text-gray-600 px-2 py-1">+{profile.leagues.length - 2} more</span>
                      )}
                    </div>
                  )}
                </Link>
                {currentUser && currentUser.id !== profile.id && (
                  <button
                    onClick={() => router.push(`/messages?user=${profile.id}`)}
                    className="mt-4 w-full border border-[#4fc3f7] text-[#4fc3f7] py-1.5 rounded font-medium text-sm hover:bg-[#4fc3f7] hover:text-[#0a1628] transition"
                  >
                    💬 Message
                  </button>
                )}
              </div>
          ))}
        </div>
      )}
    </div>
  )
}
