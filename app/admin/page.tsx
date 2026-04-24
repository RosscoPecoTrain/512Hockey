'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  is_admin: boolean
  is_banned: boolean | null
  created_at: string
  position: string | null
}

interface ForumPost {
  id: string
  title: string
  content: string
  author_id: string
  approved: boolean
  created_at: string
  profiles?: { full_name: string | null; email: string | null }
}

interface Report {
  id: string
  target_id: string
  target_type: string
  reason: string
  status: string
  created_at: string
  reporter_id: string
  reporter?: { full_name: string | null; email: string | null }
}

type Tab = 'forum' | 'reports' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('forum')

  const [pendingPosts, setPendingPosts] = useState<ForumPost[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [actionMsg, setActionMsg] = useState('')

  // Auth + admin check
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) { router.push('/'); return }
      setIsAdmin(true)
      setIsLoading(false)
    }
    check()
  }, [router])

  // Load data for active tab
  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'forum') loadPendingPosts()
    if (tab === 'reports') loadReports()
    if (tab === 'users') loadUsers()
  }, [tab, isAdmin])

  const loadPendingPosts = async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, profiles(full_name, email)')
      .eq('approved', false)
      .order('created_at', { ascending: true })
    setPendingPosts(data || [])
  }

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) return

    // Fetch reporter profiles
    const reporterIds = [...new Set(data.map(r => r.reporter_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', reporterIds)

    const profileMap: Record<string, { full_name: string | null; email: string | null }> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    setReports(data.map(r => ({ ...r, reporter: profileMap[r.reporter_id] })))
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }

  const approvePost = async (id: string) => {
    await supabase.from('forum_posts').update({ approved: true }).eq('id', id)
    setPendingPosts(prev => prev.filter(p => p.id !== id))
    flash('Post approved ✓')
  }

  const rejectPost = async (id: string) => {
    await supabase.from('forum_posts').delete().eq('id', id)
    setPendingPosts(prev => prev.filter(p => p.id !== id))
    flash('Post rejected and deleted')
  }

  const updateReport = async (id: string, status: string) => {
    await supabase.from('reports').update({ status }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    flash(`Report marked as ${status}`)
  }

  const toggleBan = async (userId: string, isBanned: boolean) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u))
    flash(isBanned ? 'User unbanned' : 'User banned')
  }

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]">
      <p className="text-gray-500 dark:text-[#8b949e]">Checking permissions...</p>
    </div>
  )

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'forum', label: '🗂️ Forum Queue', count: pendingPosts.length },
    { key: 'reports', label: '🚩 Reports', count: reports.filter(r => r.status === 'pending').length },
    { key: 'users', label: '👥 Users', count: users.length },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#0a1628] dark:text-[#e6edf3]">Admin Panel</h1>
        {actionMsg && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium">
            {actionMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-[#30363d]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition flex items-center gap-2 ${
              tab === t.key
                ? 'bg-[#0a1628] text-white'
                : 'text-gray-600 dark:text-[#8b949e] hover:text-[#0a1628] dark:hover:text-[#e6edf3]'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-[#4fc3f7] text-[#0a1628]' : 'bg-red-500 text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Forum Queue */}
      {tab === 'forum' && (
        <div className="space-y-4">
          {pendingPosts.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-8 text-center text-gray-500 dark:text-[#8b949e]">
              ✅ No posts pending approval
            </div>
          ) : pendingPosts.map(post => (
            <div key={post.id} className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-[#0a1628] dark:text-[#e6edf3] text-lg mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-3">
                    by {post.profiles?.full_name || post.profiles?.email || 'Unknown'} · {new Date(post.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700 dark:text-[#e6edf3] text-sm line-clamp-3">{post.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approvePost(post.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-600 transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => rejectPost(post.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-8 text-center text-gray-500 dark:text-[#8b949e]">
              ✅ No reports yet
            </div>
          ) : reports.map(report => (
            <div key={report.id} className={`bg-white dark:bg-[#161b22] rounded-lg border p-6 ${
              report.status === 'pending' ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-[#30363d]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      report.status === 'pending' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      report.status === 'actioned' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-[#8b949e]">{report.target_type}</span>
                  </div>
                  <p className="font-semibold text-[#0a1628] dark:text-[#e6edf3] mb-1">{report.reason}</p>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                    Reported by {report.reporter?.full_name || report.reporter?.email || 'Unknown'} · {new Date(report.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                    Target ID: <a href={`/profile/${report.target_id}`} className="text-[#4fc3f7] hover:underline">{report.target_id.slice(0, 8)}...</a>
                  </p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateReport(report.id, 'actioned')}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition"
                    >
                      Take Action
                    </button>
                    <button
                      onClick={() => updateReport(report.id, 'dismissed')}
                      className="bg-gray-200 dark:bg-[#21262d] text-gray-700 dark:text-[#e6edf3] px-3 py-2 rounded-lg font-semibold text-sm hover:bg-gray-300 dark:hover:bg-[#30363d] transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0a1628] text-white">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Position</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={`border-t border-gray-100 dark:border-[#30363d] ${i % 2 === 0 ? 'bg-white dark:bg-[#161b22]' : 'bg-gray-50 dark:bg-[#0d1117]'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[#0a1628] dark:text-[#e6edf3]">{user.full_name || '(no name)'}</p>
                      <p className="text-xs text-gray-500 dark:text-[#8b949e]">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#8b949e] hidden md:table-cell">{user.position || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#8b949e] hidden md:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <span className="text-xs bg-[#4fc3f7]/20 text-[#4fc3f7] px-2 py-0.5 rounded-full font-semibold">Admin</span>
                    ) : user.is_banned ? (
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">Banned</span>
                    ) : (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!user.is_admin && (
                      <button
                        onClick={() => toggleBan(user.id, !!user.is_banned)}
                        className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                          user.is_banned
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
