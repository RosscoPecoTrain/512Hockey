import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-[#0a1628] text-white border-t border-[#4fc3f7] mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.jpg" alt="512Hockey.com" width={40} height={40} className="rounded-full" />
              <h3 className="text-lg font-bold">512Hockey.com</h3>
            </div>
            <p className="text-gray-300">
              Austin&apos;s community hockey hub. Connect with players, find games, and discover local rinks.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/directory" className="hover:text-[#4fc3f7] transition">Player Directory</Link></li>
              <li><Link href="/forum" className="hover:text-[#4fc3f7] transition">Community Forum</Link></li>
              <li><Link href="/rinks" className="hover:text-[#4fc3f7] transition">Find Rinks</Link></li>
              <li><Link href="/guidelines" className="hover:text-[#4fc3f7] transition">Community Guidelines</Link></li>
              <li><Link href="/terms" className="hover:text-[#4fc3f7] transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[#4fc3f7] transition">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Stay Connected</h4>
            <p className="text-gray-300 mb-4">
              Follow us on social media for updates on games and community events.
            </p>
          </div>
        </div>
        <div className="border-t border-[#4fc3f7] mt-8 pt-8 text-center text-gray-400 dark:text-[#8b949e]">
          <p>&copy; {new Date().getFullYear()} 512Hockey.com. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
