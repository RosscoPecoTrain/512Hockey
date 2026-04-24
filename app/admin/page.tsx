'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { ForumPost } from '@/types'

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingPosts, setPendingPosts] = useState<ForumPost[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setIsLoading(false)
        return
      }

      // In a production app, you'd check user role from a profile table
      // For now, just load pending posts
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setPendingPosts(data)
      }

      setIsLoading(false)
    }

    checkUser()
  }, [])

  const handleApprove = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ approved: true })
        .eq('id', postId)

      if (error) throw error

      setPendingPosts(pendingPosts.filter(p => p.id !== postId))
    } catch (error) {
      console.error('Error approving post:', error)
    }
  }

  const handleReject = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setPendingPosts(pendingPosts.filter(p => p.id !== postId))
    } catch (error) {
      console.error('Error rejecting post:', error)
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            You need to sign in with an admin account to access this panel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628]">Admin Panel</h1>

      {/* Moderation Queue */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-[#0a1628]">
          Pending Posts ({pendingPosts.length})
        </h2>

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : pendingPosts.length === 0 ? (
          <p className="text-gray-600">No pending posts. All moderation is up to date!</p>
        ) : (
          <div className="space-y-6">
            {pendingPosts.map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-[#0a1628] mb-2">{post.title}</h3>
                <p className="text-gray-700 mb-4">{post.content}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(post.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded font-semibold hover:bg-green-600 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(post.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Admin Stats (placeholder) */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">TOTAL USERS</h3>
          <p className="text-4xl font-bold text-[#4fc3f7]">0</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">FORUM POSTS</h3>
          <p className="text-4xl font-bold text-[#4fc3f7]">0</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">PENDING MODERATION</h3>
          <p className="text-4xl font-bold text-[#4fc3f7]">{pendingPosts.length}</p>
        </div>
      </div>
    </div>
  )
}
