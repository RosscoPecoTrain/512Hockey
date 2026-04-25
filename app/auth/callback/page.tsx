'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase will handle the OAuth callback automatically
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check if account is enabled
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_enabled')
          .eq('id', session.user.id)
          .single()

        if (!profile || profile.is_enabled === false) {
          await supabase.auth.signOut()
          router.push('/auth/signin?error=disabled')
          return
        }

        // Check if user has signed all required agreements
        const { data: signed } = await supabase
          .from('user_agreements')
          .select('agreement_type, agreement_version')
          .eq('user_id', session.user.id)

        const { REQUIRED_AGREEMENTS } = await import('@/lib/agreements')
        const signedSet = new Set((signed || []).map((a: { agreement_type: string; agreement_version: string }) => `${a.agreement_type}:${a.agreement_version}`))
        const hasUnsigned = REQUIRED_AGREEMENTS.some(a => !signedSet.has(`${a.type}:${a.version}`))

        if (hasUnsigned) {
          router.push('/agree?redirect=/profile')
        } else {
          router.push('/profile')
        }
      } else {
        router.push('/auth/signin')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600 dark:text-[#8b949e]">Signing you in...</p>
      </div>
    </div>
  )
}
