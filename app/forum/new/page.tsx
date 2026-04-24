'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const categories = ['General', 'Games', 'Looking for Players', 'Advice']

export default function NewPost() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }
      setUser(session.user)
    }
    getUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert([{
          author_id: user.id,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          approved: false, // requires mod approval
        }])
        .select()
        .single()

      if (error) throw error

      // Redirect to forum with pending message
      router.push('/forum?pending=1')
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error creating post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-[#0a1628] mb-8">Start a Discussion</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            placeholder="What's your post about?"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            required
            rows={8}
            value={formData.content}
            onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
            placeholder="Write your post here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#4fc3f7] text-[#0a1628] py-3 rounded-lg font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Post'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          ℹ️ First-time posts are reviewed before publishing. Usually approved within a few hours.
        </p>
      </form>
    </div>
  )
}
