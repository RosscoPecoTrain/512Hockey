'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import AuthButton from './AuthButton'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  // Close menu on route change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    // Read dark mode preference from DOM on mount (set by inline script)
    const dark = document.documentElement.classList.contains('dark')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(dark)
  }, [])

  const toggleDark = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(!!data?.is_admin)
      }
      setIsLoading(false)
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
          setIsAdmin(!!data?.is_admin)
        } else {
          setIsAdmin(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const navLinks = [
    { href: '/forum', label: 'Forum' },
    ...(user ? [{ href: '/directory', label: 'Players' }] : []),
    ...(user ? [{ href: '/rinks', label: 'Rinks' }] : []),
    ...(user ? [{ href: '/notifications', label: 'Notifications' }] : []),
    ...(user ? [{ href: '/messages', label: 'Messages' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
  ]

  return (
    <nav className="bg-[#0a1628] text-white border-b border-[#4fc3f7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition flex-shrink-0">
            <Image src="/logo.jpg" alt="512Hockey.com" width={44} height={44} className="rounded-full" />
            <span className="font-bold text-xl hidden sm:block">512Hockey.com</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="hover:text-[#4fc3f7] transition">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDark}
              className="text-xl hover:text-[#4fc3f7] transition"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <div className="hidden md:block">
              {!isLoading && <AuthButton user={user} />}
            </div>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a1628] border-t border-[#4fc3f7]/30 px-4 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 px-4 rounded-lg hover:bg-[#4fc3f7]/10 hover:text-[#4fc3f7] transition text-lg"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#4fc3f7]/30 mt-3">
            {!isLoading && <AuthButton user={user} />}
          </div>
        </div>
      )}
    </nav>
  )
}
