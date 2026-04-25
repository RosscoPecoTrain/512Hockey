export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { initializeCronJobs } from '@/lib/cronJobs'

// Initialize cron jobs on server startup
if (typeof window === 'undefined') {
  initializeCronJobs()
}

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '512Hockey.com - Austin Hockey Community',
  description: 'Connect with hockey players in Austin, find games, and discover local rinks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} bg-gray-100 dark:bg-[#0d1117] text-gray-900 dark:text-[#e6edf3] transition-colors`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
