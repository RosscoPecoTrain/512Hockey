'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const params = useParams()
  const id = params?.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        setCurrentUser(session?.user ?? null)

        // Fetch profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          console.error('Profile fetch error:', error)
          setError(error.message)
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) load()
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-gray-600 dark:text-[#8b949e]">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-gray-600 dark:text-[#8b949e]">Profile not found</p>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-lg dark:shadow-none overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2f4a] text-white p-8">
          <div className="flex items-start gap-8 flex-wrap">
            <div className="w-24 h-24 bg-[#4fc3f7] rounded-full flex items-center justify-center text-4xl font-bold text-[#0a1628] dark:text-[#e6edf3]">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{profile.full_name ?? 'Anonymous'}</h1>
              {profile.position && (
                <p className="text-xl text-[#4fc3f7] font-semibold mb-2">{profile.position}</p>
              )}
              {profile.skill_level && (
                <p className="text-gray-300">
                  Skill Level: <span className="font-semibold">{profile.skill_level}</span>
                </p>
              )}
            </div>
            {currentUser && currentUser.id === id && (
              <Link
                href="/profile"
                className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-6 py-2 rounded font-semibold hover:bg-white transition"
              >
                ✏️ Edit Profile
              </Link>
            )}
            {currentUser && currentUser.id !== id && (
              <Link
                href={`/messages?user=${id}`}
                className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-6 py-2 rounded font-semibold hover:bg-white transition"
              >
                Send Message
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {profile.bio && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">About</h2>
              <p className="text-gray-700 dark:text-[#e6edf3] text-lg">{profile.bio}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {profile.leagues && profile.leagues.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">Leagues</h3>
                <div className="space-y-2">
                  {profile.leagues.map((league: string, idx: number) => (
                    <div key={idx} className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-4 py-2 rounded font-medium">
                      {league}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.preferred_rinks && profile.preferred_rinks.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">Preferred Rinks</h3>
                <div className="space-y-2">
                  {profile.preferred_rinks.map((rink: string, idx: number) => (
                    <div key={idx} className="border border-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-4 py-2 rounded">
                      {rink}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-sm text-gray-400 dark:text-[#8b949e]">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
