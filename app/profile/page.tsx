'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export default function MyProfile() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
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
      if (!user) { router.push('/auth/signin'); return }

      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (error && error.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert([{ id: user.id, email: user.email }], { onConflict: 'id' })
          .select().single()
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoMsg('❌ Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoMsg('❌ Image must be under 2MB.')
      return
    }

    setIsUploadingPhoto(true)
    setPhotoMsg('')

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      // Save as pending — not shown publicly until admin approves
      await supabase.from('profiles').update({
        avatar_url: publicUrl,
        avatar_status: 'pending',
      }).eq('id', user.id)

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl, avatar_status: 'pending' } : prev)
      setPhotoMsg('✅ Photo uploaded! It will appear publicly after admin review (usually within 24h).')
    } catch (err) {
      console.error('Upload error:', err)
      setPhotoMsg('❌ Upload failed. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!user) return
    await supabase.from('profiles').update({ avatar_url: null, avatar_status: 'none' }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, avatar_url: null, avatar_status: 'none' } : prev)
    setPhotoMsg('Photo removed.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: formData.full_name,
        position: formData.position || null,
        skill_level: formData.skill_level || null,
        bio: formData.bio,
        leagues: formData.leagues ? formData.leagues.split(',').map(l => l.trim()) : [],
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (error) throw error
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  const avatarStatus = (profile as Profile & { avatar_status?: string })?.avatar_status

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628] dark:text-[#e6edf3]">My Profile</h1>

      {isLoading ? (
        <p className="text-gray-600 dark:text-[#8b949e]">Loading profile...</p>
      ) : (
        <>
          {/* Avatar Section */}
          <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#0a1628] dark:text-[#e6edf3] mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar userId={user.id} photoUrl={avatarStatus === 'approved' ? profile?.avatar_url : null} size={80} />
                {avatarStatus === 'pending' && (
                  <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full font-semibold">Pending</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-[#8b949e] mb-3">
                  {avatarStatus === 'pending'
                    ? '⏳ Your photo is awaiting admin approval. Your identicon shows to others in the meantime.'
                    : avatarStatus === 'approved'
                    ? '✅ Your photo is live.'
                    : 'Upload a profile photo. It will be reviewed before going public.'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 text-sm bg-[#4fc3f7] text-[#0a1628] rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Uploading...' : '📷 Upload Photo'}
                  </button>
                  {profile?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-4 py-2 text-sm border border-red-300 dark:border-red-800 text-red-500 rounded font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-400 dark:text-[#8b949e] mt-2">JPG, PNG, or WebP · Max 2MB</p>
                {photoMsg && <p className="text-sm mt-2 font-medium">{photoMsg}</p>}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Email</label>
              <input type="email" value={user.email || ''} disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Full Name</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3]" />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Position</label>
                <select name="position" value={formData.position} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3]">
                  <option value="">Select position</option>
                  <option value="Forward">Forward</option>
                  <option value="Defense">Defense</option>
                  <option value="Goalie">Goalie</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Skill Level</label>
                <select name="skill_level" value={formData.skill_level} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3]">
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Recreational">Recreational</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange}
                placeholder="Tell us about yourself..." rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3]" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">Leagues (comma-separated)</label>
              <input type="text" name="leagues" value={formData.leagues} onChange={handleChange}
                placeholder="e.g., Austin Hockey League, Beginner Division"
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3]" />
            </div>

            <button type="submit" disabled={isSaving}
              className="w-full bg-[#4fc3f7] text-[#0a1628] py-2 rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
