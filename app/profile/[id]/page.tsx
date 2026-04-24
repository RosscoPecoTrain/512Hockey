'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

interface ProfilePageProps {
  params: {
    id: string
  }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }

    getUser()
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2f4a] text-white p-8">
          <div className="flex items-start gap-8">
            <div className="w-24 h-24 bg-[#4fc3f7] rounded-full flex items-center justify-center text-4xl font-bold">
              {profile.full_name?.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
              {profile.position && (
                <p className="text-xl text-[#4fc3f7] font-semibold mb-2">
                  {profile.position}
                </p>
              )}
              {profile.skill_level && (
                <p className="text-gray-300">
                  Skill Level: <span className="font-semibold">{profile.skill_level}</span>
                </p>
              )}
            </div>
            {currentUser && currentUser.id !== params.id && (
              <Link
                href={`/messages?user=${params.id}`}
                className="bg-[#4fc3f7] text-[#0a1628] px-6 py-2 rounded font-semibold hover:bg-white transition h-fit"
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
              <h2 className="text-2xl font-bold text-[#0a1628] mb-4">About</h2>
              <p className="text-gray-700 text-lg">{profile.bio}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {profile.leagues && profile.leagues.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[#0a1628] mb-4">Leagues</h3>
                <div className="space-y-2">
                  {profile.leagues.map((league, idx) => (
                    <div key={idx} className="bg-[#4fc3f7] text-[#0a1628] px-4 py-2 rounded">
                      {league}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.preferred_rinks && profile.preferred_rinks.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[#0a1628] mb-4">Preferred Rinks</h3>
                <div className="space-y-2">
                  {profile.preferred_rinks.map((rink, idx) => (
                    <div key={idx} className="border border-[#4fc3f7] text-[#0a1628] px-4 py-2 rounded">
                      {rink}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p>Joined on {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
