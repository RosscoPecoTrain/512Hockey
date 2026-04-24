'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AuthButtonProps {
  user: User | null
}

export default function AuthButton({ user }: AuthButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setIsOpen(false)
  }

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] px-4 py-2 rounded font-semibold hover:bg-white transition"
      >
        Sign In
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:text-[#4fc3f7] transition"
      >
        <div className="w-8 h-8 bg-[#4fc3f7] rounded-full flex items-center justify-center text-[#0a1628] dark:text-[#e6edf3] font-semibold">
          {user.email?.charAt(0).toUpperCase()}
        </div>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#0a1628] border border-[#4fc3f7] rounded shadow-lg dark:shadow-none z-10">
          <Link
            href="/profile"
            className="block px-4 py-2 hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:text-[#e6edf3] transition"
            onClick={() => setIsOpen(false)}
          >
            My Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-[#4fc3f7] hover:text-[#0a1628] dark:text-[#e6edf3] transition"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
