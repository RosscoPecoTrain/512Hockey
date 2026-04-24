'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }

    getUser()
  }, [])

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0a1628] to-[#1a2f4a] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              🏒 512Hockey.com
            </h1>
            <p className="text-xl md:text-2xl text-[#4fc3f7] mb-8">
              Austin&apos;s Community Hockey Hub
            </p>
            <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
              Connect with fellow hockey enthusiasts in Austin. Find games, meet players, and discover the local rink scene.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {isLoading ? (
                <p>Loading...</p>
              ) : user ? (
                <>
                  <Link
                    href="/directory"
                    className="bg-[#4fc3f7] text-[#0a1628] px-8 py-3 rounded font-semibold hover:bg-white transition"
                  >
                    Find Players
                  </Link>
                  <Link
                    href="/forum"
                    className="bg-transparent border-2 border-[#4fc3f7] text-[#4fc3f7] px-8 py-3 rounded font-semibold hover:bg-[#4fc3f7] hover:text-[#0a1628] transition"
                  >
                    Join Forum
                  </Link>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-[#4fc3f7] text-[#0a1628] px-8 py-3 rounded font-semibold hover:bg-white transition"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-[#0a1628]">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Player Directory */}
            <div className="border border-[#4fc3f7] rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2 text-[#0a1628]">
                Player Directory
              </h3>
              <p className="text-gray-600">
                Browse hockey players in Austin. Find teammates, rivals, and connect with the community.
              </p>
            </div>

            {/* Community Forum */}
            <div className="border border-[#4fc3f7] rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2 text-[#0a1628]">
                Community Forum
              </h3>
              <p className="text-gray-600">
                Discuss games, share strategies, and organize pickup games with other players.
              </p>
            </div>

            {/* In-App Messaging */}
            <div className="border border-[#4fc3f7] rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-4">💌</div>
              <h3 className="text-xl font-semibold mb-2 text-[#0a1628]">
                Direct Messaging
              </h3>
              <p className="text-gray-600">
                Send private messages to other players. Coordinate games and build friendships.
              </p>
            </div>

            {/* Rink Finder */}
            <div className="border border-[#4fc3f7] rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-4">🏟️</div>
              <h3 className="text-xl font-semibold mb-2 text-[#0a1628]">
                Find Rinks
              </h3>
              <p className="text-gray-600">
                Discover Austin&apos;s best ice rinks, view hours, and book ice time online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#0a1628] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Join Austin&apos;s Hockey Community?
          </h2>
          <p className="text-gray-300 mb-6">
            Sign up today to create your player profile, connect with others, and never miss a game.
          </p>
          {!user && (
            <Link
              href="/auth/signin"
              className="inline-block bg-[#4fc3f7] text-[#0a1628] px-8 py-3 rounded font-semibold hover:bg-white transition"
            >
              Sign Up Now
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
