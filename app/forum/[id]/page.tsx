'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Post {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  created_at: string
  view_count: number
  pinned: boolean
}

interface Reply {
  id: string
  content: string
  author_id: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null }
}

export default function ForumPostPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [author, setAuthor] = useState<{ full_name: string | null; email: string | null } | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      // Fetch post
      const { data: postData } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (!postData) { router.push('/forum'); return }
      setPost(postData)

      // Fetch author profile
      const { data: authorData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', postData.author_id)
        .single()
      setAuthor(authorData)

      // Fetch replies with author profiles
      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select('*, profiles(full_name, email)')
        .eq('post_id', id)
        .eq('approved', true)
        .order('created_at', { ascending: true })
      setReplies(repliesData || [])

      // Increment view count
      await supabase
        .from('forum_posts')
        .update({ view_count: (postData.view_count || 0) + 1 })
        .eq('id', id)

      setIsLoading(false)
    }
    if (id) load()
  }, [id, router])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !replyContent.trim()) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .insert([{
          post_id: id,
          author_id: user.id,
          content: replyContent,
          approved: true,
        }])
        .select('*, profiles(full_name, email)')
        .single()

      if (error) throw error
      setReplies(prev => [...prev, data])
      setReplyContent('')
    } catch (error) {
      console.error('Error posting reply:', error)
      alert('Error posting reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12"><p className="text-gray-600 dark:text-[#8b949e]">Loading...</p></div>
  if (!post) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/forum" className="text-[#4fc3f7] hover:underline mb-6 inline-block">← Back to Forum</Link>

      {/* Post */}
      <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-lg dark:shadow-none p-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] text-xs px-2 py-1 rounded font-medium">{post.category}</span>
          {post.pinned && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Pinned</span>}
        </div>
        <h1 className="text-3xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">{post.title}</h1>
        <p className="text-gray-600 dark:text-[#8b949e] text-sm mb-6">
          Posted by <span className="font-medium">{author?.full_name || author?.email || 'Unknown'}</span>
          {' · '}{new Date(post.created_at).toLocaleDateString()}
        </p>
        <div className="prose max-w-none text-gray-700 dark:text-[#e6edf3] whitespace-pre-wrap">{post.content}</div>
      </div>

      {/* Replies */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-6">
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>
        <div className="space-y-4">
          {replies.map(reply => (
            <div key={reply.id} className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-6">
              <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-3">
                <span className="font-medium text-[#0a1628] dark:text-[#e6edf3]">
                  {reply.profiles?.full_name || reply.profiles?.email || 'Unknown'}
                </span>
                {' · '}{new Date(reply.created_at).toLocaleDateString()}
              </p>
              <p className="text-gray-700 dark:text-[#e6edf3] whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Form */}
      {user ? (
        <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-md dark:shadow-none p-6">
          <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">Leave a Reply</h3>
          <form onSubmit={handleReply}>
            <textarea
              required
              rows={4}
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] mb-4"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-6 py-2 rounded-lg font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-[#0d1117] rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-[#8b949e] mb-4">Sign in to reply to this post</p>
          <Link href="/auth/signin" className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-6 py-2 rounded font-semibold">
            Sign In
          </Link>
        </div>
      )}
    </div>
  )
}
