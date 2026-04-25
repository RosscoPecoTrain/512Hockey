'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

const SKILL_COLORS: Record<string, string> = {
  'Beginner':     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'Recreational': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'Intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  'Advanced':     'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'Elite':        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

export default function Directory() {
  const router = useRouter()
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [perPage, setPerPage] = useState(25)
  const [page, setPage] = useState(1)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }
      setCurrentUser(session.user)
    })
  }, [router])

  // Load all profiles once
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
        if (error) throw error
        setAllProfiles(data || [])
      } catch (error) {
        console.error('Error fetching profiles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfiles()
  }, [])

  // Compute filtered inline — no separate state, no race condition
  const filtered = allProfiles.filter(p => {
    const q = searchTerm.trim().toLowerCase()
    const matchesSearch = !q ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.bio ?? '').toLowerCase().includes(q) ||
      (p.position ?? '').toLowerCase().includes(q) ||
      (p.leagues ?? []).some((l: string) => l.toLowerCase().includes(q))
    const matchesPosition = !positionFilter || p.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-4xl font-bold mb-6 text-[#0a1628] dark:text-[#e6edf3]">Player Directory</h1>

      {/* Filters bar */}
      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-500 dark:text-[#8b949e] mb-1 uppercase tracking-wide">Search</label>
            <input
              type="text"
              placeholder="Name, bio, position..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#21262d] text-gray-900 dark:text-[#e6edf3] placeholder-gray-400 dark:placeholder-[#8b949e] focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 dark:text-[#8b949e] mb-1 uppercase tracking-wide">Position</label>
            <select
              value={positionFilter}
              onChange={e => { setPositionFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#21262d] text-gray-900 dark:text-[#e6edf3] focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
            >
              <option value="">All Positions</option>
              <option value="Forward">Forward</option>
              <option value="Defense">Defense</option>
              <option value="Goalie">Goalie</option>
            </select>
          </div>
          <div className="min-w-[110px]">
            <label className="block text-xs font-semibold text-gray-500 dark:text-[#8b949e] mb-1 uppercase tracking-wide">Per Page</label>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg bg-white dark:bg-[#21262d] text-gray-900 dark:text-[#e6edf3] focus:ring-[#4fc3f7] focus:border-[#4fc3f7]"
            >
              {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} players</option>)}
            </select>
          </div>
          {(searchTerm || positionFilter) && (
            <button
              onClick={() => { setSearchTerm(''); setPositionFilter('') }}
              className="px-3 py-2 text-sm text-gray-500 dark:text-[#8b949e] hover:text-red-500 transition"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-gray-500 dark:text-[#8b949e] mb-4">
          Showing {paginated.length} of {filtered.length} player{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== allProfiles.length && ` (filtered from ${allProfiles.length})`}
        </p>
      )}

      {/* Player List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-[#8b949e]">Loading players...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-[#8b949e]">
          <p className="text-4xl mb-3">🏒</p>
          <p>No players found. Try a different search.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden divide-y divide-gray-100 dark:divide-[#30363d]">
          {paginated.map(profile => (
            <div key={profile.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#21262d] transition">
              {/* Avatar */}
              <Avatar userId={profile.id} photoUrl={profile.avatar_url} size={40} />

              {/* Name + details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${profile.id}`} className="font-semibold text-[#0a1628] dark:text-[#e6edf3] hover:text-[#4fc3f7] transition truncate">
                    {profile.full_name || 'Unknown Player'}
                  </Link>
                  {profile.position && (
                    <span className="text-xs text-[#4fc3f7] font-medium">{profile.position}</span>
                  )}
                  {profile.skill_level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SKILL_COLORS[profile.skill_level] || 'bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]'}`}>
                      {profile.skill_level}
                    </span>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mt-0.5">{profile.bio}</p>
                )}
                {profile.leagues && profile.leagues.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-[#8b949e] mt-0.5">
                    {profile.leagues.slice(0, 3).join(' · ')}
                    {profile.leagues.length > 3 && ` +${profile.leagues.length - 3}`}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/profile/${profile.id}`}
                  className="text-xs px-3 py-1.5 border border-gray-300 dark:border-[#30363d] rounded text-gray-600 dark:text-[#8b949e] hover:border-[#4fc3f7] hover:text-[#4fc3f7] transition"
                >
                  View
                </Link>
                {currentUser && currentUser.id !== profile.id && (
                  <button
                    onClick={() => router.push(`/messages?user=${profile.id}`)}
                    className="text-xs px-3 py-1.5 bg-[#4fc3f7] text-[#0a1628] rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition"
                  >
                    💬 Message
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-600 dark:text-[#8b949e] hover:border-[#4fc3f7] hover:text-[#4fc3f7] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number
              if (totalPages <= 7) p = i + 1
              else if (page <= 4) p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else p = page - 3 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm rounded-lg font-medium transition ${
                    page === p
                      ? 'bg-[#0a1628] text-white dark:bg-[#4fc3f7] dark:text-[#0a1628]'
                      : 'border border-gray-300 dark:border-[#30363d] text-gray-600 dark:text-[#8b949e] hover:border-[#4fc3f7] hover:text-[#4fc3f7]'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-600 dark:text-[#8b949e] hover:border-[#4fc3f7] hover:text-[#4fc3f7] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
