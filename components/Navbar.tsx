'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import AuthButton from './AuthButton'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="bg-[#0a1628] text-white border-b border-[#4fc3f7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl hover:text-[#4fc3f7] transition">
              🏒 512 Hockey
            </Link>
            <div className="hidden md:flex gap-6">
              <Link href="/directory" className="hover:text-[#4fc3f7] transition">
                Players
              </Link>
              <Link href="/forum" className="hover:text-[#4fc3f7] transition">
                Forum
              </Link>
              <Link href="/rinks" className="hover:text-[#4fc3f7] transition">
                Rinks
              </Link>
              {user && (
                <>
                  <Link href="/messages" className="hover:text-[#4fc3f7] transition">
                    Messages
                  </Link>
                  {/* Admin link would go here based on admin status */}
                </>
              )}

            </div>
          </div>
          {!isLoading && <AuthButton user={user} />}
        </div>
      </div>
    </nav>
  )
}
