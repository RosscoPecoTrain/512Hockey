'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { User } from '@supabase/supabase-js'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface Conversation {
  userId: string
  name: string
  lastMessage: string
  lastAt: string
  unread: number
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
}

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams?.get('user') ?? null

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(targetUserId)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(targetUserId ? 'chat' : 'list')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/signin'); return }
      setCurrentUser(session.user)
    })
  }, [router])

  // Load conversations
  useEffect(() => {
    if (!currentUser) return
    const loadConversations = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (!data) return

      const partnerIds = [...new Set(data.map(m =>
        m.sender_id === currentUser.id ? m.recipient_id : m.sender_id
      ))]

      if (partnerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', partnerIds)

        const profileMap: Record<string, Profile> = {}
        profileData?.forEach(p => { profileMap[p.id] = p })
        setProfiles(profileMap)

        const convos: Conversation[] = partnerIds.map(pid => {
          const msgs = data.filter(m =>
            (m.sender_id === currentUser.id && m.recipient_id === pid) ||
            (m.sender_id === pid && m.recipient_id === currentUser.id)
          )
          const last = msgs[0]
          const unread = msgs.filter(m => m.sender_id === pid && !m.read_at).length
          return {
            userId: pid,
            name: profileMap[pid]?.full_name || profileMap[pid]?.email || 'Unknown',
            lastMessage: last?.content || '',
            lastAt: last?.created_at || '',
            unread,
          }
        })
        setConversations(convos)
      }

      if (targetUserId && partnerIds.length === 0) {
        const { data: p } = await supabase
          .from('profiles').select('id, full_name, email').eq('id', targetUserId).single()
        if (p) { setProfiles({ [p.id]: p }); setActiveProfile(p) }
      }
    }
    loadConversations()
  }, [currentUser, targetUserId])

  // Load messages for active conversation
  useEffect(() => {
    if (!currentUser || !activeUserId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages').select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      await supabase.from('messages').update({ read_at: new Date().toISOString() })
        .eq('sender_id', activeUserId).eq('recipient_id', currentUser.id).is('read_at', null)
    }
    loadMessages()

    if (!profiles[activeUserId]) {
      supabase.from('profiles').select('id, full_name, email').eq('id', activeUserId).single()
        .then(({ data }) => {
          if (data) { setProfiles(prev => ({ ...prev, [data.id]: data })); setActiveProfile(data) }
        })
    } else {
      setActiveProfile(profiles[activeUserId])
    }

    const channel = supabase
      .channel(`messages-${currentUser.id}-${activeUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${currentUser.id}` },
        (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === activeUserId) setMessages(prev => [...prev, msg])
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser, activeUserId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when switching to chat on mobile
  useEffect(() => {
    if (mobileView === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [mobileView])

  const selectConversation = (userId: string) => {
    setActiveUserId(userId)
    setMobileView('chat')
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !activeUserId || !newMessage.trim()) return
    setIsSending(true)
    try {
      const { data, error } = await supabase.from('messages')
        .insert([{ sender_id: currentUser.id, recipient_id: activeUserId, content: newMessage.trim() }])
        .select().single()
      if (error) throw error
      setMessages(prev => [...prev, data])
      setNewMessage('')
      setConversations(prev => {
        const existing = prev.find(c => c.userId === activeUserId)
        if (existing) {
          return prev.map(c => c.userId === activeUserId
            ? { ...c, lastMessage: newMessage.trim(), lastAt: new Date().toISOString() }
            : c)
        }
        return [{ userId: activeUserId, name: activeProfile?.full_name || activeProfile?.email || 'Unknown', lastMessage: newMessage.trim(), lastAt: new Date().toISOString(), unread: 0 }, ...prev]
      })
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  if (!currentUser) return null

  // Conversation list panel
  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-[#0a1628] flex-shrink-0">
        <h2 className="text-white font-semibold text-lg">Messages</h2>
      </div>
      <div className="overflow-y-auto flex-1">
        {conversations.length === 0 && !activeUserId ? (
          <div className="p-6 text-center text-gray-500 dark:text-[#8b949e] text-sm">
            <p className="text-3xl mb-3">💬</p>
            <p>No conversations yet.</p>
            <a href="/directory" className="text-[#4fc3f7] hover:underline mt-2 inline-block">Find players to message →</a>
          </div>
        ) : (
          <>
            {conversations.map(convo => (
              <button
                key={convo.userId}
                onClick={() => selectConversation(convo.userId)}
                className={`w-full text-left p-4 border-b border-gray-100 dark:border-[#30363d] transition ${
                  activeUserId === convo.userId
                    ? 'bg-[#4fc3f7]/10 border-l-4 border-l-[#4fc3f7]'
                    : 'bg-white dark:bg-[#161b22] hover:bg-gray-50 dark:hover:bg-[#21262d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar userId={convo.userId} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-[#0a1628] dark:text-[#e6edf3] truncate">{convo.name}</p>
                      {convo.unread > 0 && (
                        <span className="bg-[#4fc3f7] text-[#0a1628] text-xs rounded-full px-2 py-0.5 font-bold ml-2 flex-shrink-0">
                          {convo.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e] truncate mt-0.5">{convo.lastMessage}</p>
                  </div>
                  <span className="text-[#4fc3f7] text-lg flex-shrink-0">›</span>
                </div>
              </button>
            ))}
            {activeUserId && !conversations.find(c => c.userId === activeUserId) && activeProfile && (
              <button
                onClick={() => selectConversation(activeUserId)}
                className="w-full text-left p-4 border-b border-gray-100 dark:border-[#30363d] bg-[#4fc3f7]/10 border-l-4 border-l-[#4fc3f7]"
              >
                <div className="flex items-center gap-3">
                  <Avatar userId={activeProfile.id} size={44} />
                  <div>
                    <p className="font-semibold text-[#0a1628] dark:text-[#e6edf3]">{activeProfile.full_name || activeProfile.email}</p>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">New conversation</p>
                  </div>
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )

  // Chat panel
  const ChatPanel = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-[#30363d] bg-[#0a1628] flex items-center gap-3 flex-shrink-0">
        {/* Back button — mobile only */}
        <button
          onClick={() => setMobileView('list')}
          className="md:hidden text-white text-2xl leading-none pr-2 hover:text-[#4fc3f7] transition"
          aria-label="Back to conversations"
        >
          ‹
        </button>
        <Avatar userId={activeProfile?.id ?? activeUserId ?? ''} size={36} />
        <p className="font-semibold text-white">
          {activeProfile?.full_name || activeProfile?.email || 'Loading...'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-[#8b949e] mt-8">
            <p className="text-3xl mb-2">🏒</p>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === currentUser.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-[#4fc3f7] text-[#0a1628] rounded-br-sm'
                  : 'bg-gray-100 dark:bg-[#21262d] text-gray-800 dark:text-[#e6edf3] rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-[#0a1628]/60' : 'text-gray-400 dark:text-[#8b949e]'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — pinned to bottom */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-[#30363d] rounded-full text-sm bg-gray-50 dark:bg-[#21262d] text-gray-900 dark:text-[#e6edf3] placeholder-gray-400 dark:placeholder-[#8b949e] focus:ring-[#4fc3f7] focus:border-[#4fc3f7] outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="bg-[#4fc3f7] text-[#0a1628] px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50 flex-shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Desktop: side-by-side. Mobile: show one panel at a time */}
      <div className="flex flex-1 overflow-hidden">

        {/* Conversation list — full width mobile (when list view), 1/3 desktop */}
        <div className={`
          w-full md:w-80 md:flex-shrink-0
          border-r border-gray-200 dark:border-[#30363d]
          bg-white dark:bg-[#161b22]
          ${mobileView === 'list' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
        `}>
          <ConversationList />
        </div>

        {/* Chat area — full width mobile (when chat view), flex-1 desktop */}
        <div className={`
          flex-1 bg-gray-50 dark:bg-[#0d1117]
          ${mobileView === 'chat' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
        `}>
          {activeUserId ? (
            <ChatPanel />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-[#8b949e]">
              <div className="text-center">
                <p className="text-5xl mb-4">💬</p>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">or <a href="/directory" className="text-[#4fc3f7] hover:underline">find a player</a> to message</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-gray-500 dark:text-[#8b949e]">Loading messages...</p>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
