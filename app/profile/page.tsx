'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export default function MyProfile() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    skill_level: '',
    bio: '',
    leagues: '',
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Fetch or create profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it using upsert
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert([{ id: user.id, email: user.email }], { onConflict: 'id' })
          .select()
          .single()

        if (insertError) console.error('Error creating profile:', insertError)
        setProfile(newProfile)
        setFormData({ full_name: '', position: '', skill_level: '', bio: '', leagues: '' })
      } else if (data) {
        setProfile(data)
        setFormData({
          full_name: data.full_name || '',
          position: data.position || '',
          skill_level: data.skill_level || '',
          bio: data.bio || '',
          leagues: data.leagues?.join(', ') || '',
        })
      }

      setIsLoading(false)
    }

    getUser()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({           id: user.id,
          email: user.email,
          full_name: formData.full_name,
          position: formData.position || null,
          skill_level: formData.skill_level || null,
          bio: formData.bio,
          leagues: formData.leagues ? formData.leagues.split(',').map(l => l.trim()) : [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628] dark:text-[#e6edf3]">My Profile</h1>

      {isLoading ? (
        <p className="text-gray-600 dark:text-[#8b949e]">Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#161b22] rounded-lg shadow-md dark:shadow-none p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
                Position
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
              >
                <option value="">Select position</option>
                <option value="Forward">Forward</option>
                <option value="Defense">Defense</option>
                <option value="Goalie">Goalie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
                Skill Level
              </label>
              <select
                name="skill_level"
                value={formData.skill_level}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
              >
                <option value="">Select skill level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Pro">Pro</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
              Leagues (comma-separated)
            </label>
            <input
              type="text"
              name="leagues"
              value={formData.leagues}
              onChange={handleChange}
              placeholder="e.g., Austin Hockey League, Beginner Division"
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] py-2 rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}
    </div>
  )
}
