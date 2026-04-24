'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { REQUIRED_AGREEMENTS } from '@/lib/agreements'
import type { Agreement } from '@/lib/agreements'
import { Suspense } from 'react'

function AgreeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirect') ?? '/directory'

  const [userId, setUserId] = useState<string | null>(null)
  const [unsigned, setUnsigned] = useState<Agreement[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/signin'); return }

      setUserId(session.user.id)

      // Check which required agreements are unsigned
      const { data: signed } = await supabase
        .from('user_agreements')
        .select('agreement_type, agreement_version')
        .eq('user_id', session.user.id)

      const signedSet = new Set((signed || []).map(a => `${a.agreement_type}:${a.agreement_version}`))

      const missing = REQUIRED_AGREEMENTS.filter(
        a => !signedSet.has(`${a.type}:${a.version}`)
      )

      if (missing.length === 0) {
        // Already signed everything — redirect
        router.replace(redirectTo)
        return
      }

      setUnsigned(missing)
      setIsLoading(false)
    }
    load()
  }, [router, redirectTo])

  const allChecked = unsigned.length > 0 && unsigned.every(a => checked[a.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !allChecked) return
    setIsSubmitting(true)

    try {
      const rows = unsigned.map(a => ({
        user_id: userId,
        agreement_type: a.type,
        agreement_version: a.version,
        agreed_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('user_agreements').insert(rows)
      if (error) throw error

      router.replace(redirectTo)
    } catch (err) {
      console.error('Error saving agreements:', err)
      setIsSubmitting(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117]">
      <p className="text-gray-500 dark:text-[#8b949e]">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center px-4 py-12">
      <div className="bg-white dark:bg-[#161b22] rounded-xl shadow-xl dark:shadow-none border border-gray-200 dark:border-[#30363d] p-8 w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏒</div>
          <h1 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3]">Before you continue</h1>
          <p className="text-gray-500 dark:text-[#8b949e] text-sm mt-2">
            Please review and agree to the following to access 512Hockey.com
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {unsigned.map(agreement => (
            <div
              key={agreement.type}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition cursor-pointer ${
                checked[agreement.type]
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-[#30363d] hover:border-[#4fc3f7]'
              }`}
              onClick={() => setChecked(prev => ({ ...prev, [agreement.type]: !prev[agreement.type] }))}
            >
              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                checked[agreement.type]
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-400 dark:border-[#8b949e]'
              }`}>
                {checked[agreement.type] && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-[#0a1628] dark:text-[#e6edf3] text-sm">{agreement.title}</p>
                <p className="text-gray-600 dark:text-[#8b949e] text-sm mt-1">{agreement.description}</p>
                {agreement.href && (
                  <a
                    href={agreement.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[#4fc3f7] text-xs hover:underline mt-1 inline-block"
                  >
                    Read full terms →
                  </a>
                )}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={!allChecked || isSubmitting}
            className="w-full bg-[#0a1628] dark:bg-[#4fc3f7] text-white dark:text-[#0a1628] py-3 rounded-lg font-bold text-lg hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? 'Saving...' : 'I Agree — Continue to 512Hockey.com'}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-[#8b949e]">
            You will not be asked again unless our terms change.
          </p>
        </form>
      </div>
    </div>
  )
}

export default function AgreePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <AgreeContent />
    </Suspense>
  )
}
