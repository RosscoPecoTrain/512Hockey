'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://512-hockey.vercel.app'

type Mode = 'signin' | 'signup'

export default function SignIn() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${siteUrl}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${siteUrl}/auth/callback` },
        })
        if (error) throw error
        setSuccess('Check your email for a confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1628] to-[#1a2f4a]">
      <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-[#0a1628] dark:text-[#e6edf3]">
          Welcome to 512Hockey.com
        </h1>
        <p className="text-center text-gray-600 dark:text-[#8b949e] mb-6">
          {mode === 'signin' ? "Sign in to connect with Austin's hockey community" : "Create your account"}
        </p>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-[#30363d] mb-6 overflow-hidden">
          <button
            onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
            className={`flex-1 py-2 font-semibold text-sm transition ${mode === 'signin' ? 'bg-[#0a1628] text-white' : 'bg-white text-gray-600 dark:text-[#8b949e] hover:bg-gray-50 dark:bg-[#0d1117]'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
            className={`flex-1 py-2 font-semibold text-sm transition ${mode === 'signup' ? 'bg-[#0a1628] text-white' : 'bg-white text-gray-600 dark:text-[#8b949e] hover:bg-gray-50 dark:bg-[#0d1117]'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded-lg focus:ring-[#4fc3f7] focus:border-[#4fc3f7] dark:bg-[#21262d] dark:text-[#e6edf3] dark:border-[#30363d]"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#4fc3f7] text-[#0a1628] dark:text-[#e6edf3] py-3 rounded-lg font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50"
          >
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-[#30363d]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 dark:text-[#8b949e]">or continue with</span>
          </div>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#161b22] border-2 border-gray-300 dark:border-[#30363d] text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:bg-[#0d1117] transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-center text-gray-500 dark:text-[#8b949e] text-xs mt-6">
          By signing in, you confirm you are <strong>18 or older</strong> and agree to our{' '}
          <a href="/terms" className="text-[#4fc3f7] hover:underline">Terms of Service</a>,{' '}
          <a href="/privacy" className="text-[#4fc3f7] hover:underline">Privacy Policy</a>, and{' '}
          <a href="/guidelines" className="text-[#4fc3f7] hover:underline">Community Guidelines</a>.
        </p>
      </div>
    </div>
  )
}
