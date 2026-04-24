import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1628] to-[#1a2f4a]">
      <div className="text-center text-white">
        <div className="text-8xl mb-6">🏒</div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-8">This page went off-piste.</p>
        <Link
          href="/"
          className="bg-[#4fc3f7] text-[#0a1628] px-8 py-3 rounded-lg font-semibold hover:bg-white transition"
        >
          Back to 512Hockey.com
        </Link>
      </div>
    </div>
  )
}
