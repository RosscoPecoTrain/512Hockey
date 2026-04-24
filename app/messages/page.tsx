'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function Messages() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setIsLoading(false)
        return
      }

      // Fetch conversations (simplified - in production, would aggregate by conversation partners)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setConversations(data)
      }
      setIsLoading(false)
    }

    getUser()
  }, [])

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Sign in to View Messages</h1>
          <Link
            href="/auth/signin"
            className="inline-block bg-[#4fc3f7] text-[#0a1628] px-6 py-2 rounded font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628]">Messages</h1>

      {isLoading ? (
        <p className="text-gray-600">Loading messages...</p>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No messages yet</p>
          <Link
            href="/directory"
            className="inline-block bg-[#4fc3f7] text-[#0a1628] px-6 py-2 rounded font-semibold"
          >
            Find Players to Message
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((msg) => (
            <div
              key={msg.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#4fc3f7] transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#0a1628]">
                    {msg.sender_id === user.id ? `To: ${msg.recipient_id}` : `From: ${msg.sender_id}`}
                  </p>
                  <p className="text-gray-600 mt-2">{msg.content}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
