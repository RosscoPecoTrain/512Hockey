'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ForumPost } from '@/types'
import type { User } from '@supabase/supabase-js'

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        let query = supabase.from('forum_posts').select('*').eq('approved', true)

        if (categoryFilter) {
          query = query.eq('category', categoryFilter)
        }

        const { data, error } = await query.order('pinned', { ascending: false }).order('created_at', { ascending: false })

        if (error) throw error
        setPosts(data || [])
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [categoryFilter])

  const categories = ['General', 'Games', 'Looking for Players', 'Advice']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-[#0a1628]">Community Forum</h1>
        {user && (
          <Link
            href="/forum/new"
            className="bg-[#4fc3f7] text-[#0a1628] px-4 py-2 rounded font-semibold hover:bg-white transition"
          >
            New Post
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-8 flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-4 py-2 rounded font-medium transition ${
            categoryFilter === ''
              ? 'bg-[#4fc3f7] text-[#0a1628]'
              : 'border border-[#4fc3f7] text-[#0a1628] hover:bg-[#4fc3f7] hover:text-white'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded font-medium transition ${
              categoryFilter === cat
                ? 'bg-[#4fc3f7] text-[#0a1628]'
                : 'border border-[#4fc3f7] text-[#0a1628] hover:bg-[#4fc3f7] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {isLoading ? (
        <p className="text-gray-600">Loading posts...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No posts yet in this category</p>
          {user && (
            <Link
              href="/forum/new"
              className="inline-block bg-[#4fc3f7] text-[#0a1628] px-6 py-2 rounded font-semibold"
            >
              Start a Discussion
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link key={post.id} href={`/forum/${post.id}`}>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition hover:border-[#4fc3f7]">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.pinned && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Pinned
                        </span>
                      )}
                      <span className="bg-[#4fc3f7] text-[#0a1628] text-xs px-2 py-1 rounded">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#0a1628] hover:text-[#4fc3f7]">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500 ml-4">
                    <p>{post.view_count} views</p>
                    <p>{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
