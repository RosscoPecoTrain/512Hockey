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
        router.push('/profile')
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
