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
  const [ageConfirmed, setAgeConfirmed] = useState(false)

  const handleGoogleSignIn = async () => {
    if (!ageConfirmed) {
      setError('You must confirm you are 18 or older to continue.')
      return
    }
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
            disabled={isLoading || !ageConfirmed}
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
            <span className="px-2 bg-white dark:bg-[#161b22] text-gray-500 dark:text-[#8b949e]">or continue with</span>
          </div>
        </div>

        {/* Google — always white background per Google brand guidelines */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading || !ageConfirmed}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#fff', border: '1px solid #dadce0', color: '#3c4043', fontFamily: 'Roboto, sans-serif' }}
        >
          {/* Official Google G logo */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Age confirmation checkbox */}
        <div className={`flex items-start gap-3 p-3 rounded-lg border mb-4 ${ageConfirmed ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-[#30363d]'}`}>
          <input
            type="checkbox"
            id="ageConfirm"
            checked={ageConfirmed}
            onChange={e => { setAgeConfirmed(e.target.checked); if (e.target.checked) setError('') }}
            className="mt-0.5 accent-[#4fc3f7] w-4 h-4 flex-shrink-0"
          />
          <label htmlFor="ageConfirm" className="text-sm text-gray-700 dark:text-[#e6edf3] cursor-pointer">
            I confirm I am <strong>18 years of age or older</strong> and agree to the{' '}
            <a href="/terms" className="text-[#4fc3f7] hover:underline">Terms of Service</a>,{' '}
            <a href="/privacy" className="text-[#4fc3f7] hover:underline">Privacy Policy</a>, and{' '}
            <a href="/guidelines" className="text-[#4fc3f7] hover:underline">Community Guidelines</a>.
          </label>
        </div>

        <p className="text-center text-gray-500 dark:text-[#8b949e] text-xs mt-6 hidden">
          By signing in, you confirm you are <strong>18 or older</strong> and agree to our{' '}
          <a href="/terms" className="text-[#4fc3f7] hover:underline">Terms of Service</a>,{' '}
          <a href="/privacy" className="text-[#4fc3f7] hover:underline">Privacy Policy</a>, and{' '}
          <a href="/guidelines" className="text-[#4fc3f7] hover:underline">Community Guidelines</a>.
        </p>
      </div>
    </div>
  )
}
