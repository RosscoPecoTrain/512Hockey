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
  const pathname = usePathname()

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
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
      setIsLoading(false)
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setUser(session?.user ?? null) }
    )
    return () => subscription.unsubscribe()
  }, [])

  const navLinks = [
    { href: '/directory', label: 'Players' },
    { href: '/forum', label: 'Forum' },
    { href: '/rinks', label: 'Rinks' },
    ...(user ? [{ href: '/messages', label: 'Messages' }] : []),
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
