export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-2">Privacy Policy</h1>
      <p className="text-gray-500 dark:text-[#8b949e] mb-8">Last updated: April 2026</p>

      <div className="prose max-w-none space-y-8 text-gray-700 dark:text-[#e6edf3]">
        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account info:</strong> Email address, name (via Google OAuth or email registration)</li>
            <li><strong>Profile info:</strong> Name, position, skill level, bio, leagues — only what you choose to share</li>
            <li><strong>Messages:</strong> Private messages between users, stored securely</li>
            <li><strong>Usage data:</strong> Standard server logs (IP address, browser type)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and operate the 512Hockey.com platform</li>
            <li>To enable communication between players</li>
            <li>To display your public profile in the player directory</li>
            <li>To investigate reports of abuse or policy violations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">3. What We Don&apos;t Share</h2>
          <p>We do not sell your data. Your phone number and email address are never shown to other users. Private messages are only accessible to the sender and recipient.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">4. Data Storage</h2>
          <p>Your data is stored securely via Supabase (PostgreSQL). Authentication is handled via Supabase Auth with Google OAuth. We use industry-standard security practices.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">5. Your Rights</h2>
          <p>You may request deletion of your account and associated data at any time by emailing <a href="mailto:admin@512hockey.com" className="text-[#4fc3f7] hover:underline">admin@512hockey.com</a>.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">6. Contact</h2>
          <p>Questions about privacy: <a href="mailto:admin@512hockey.com" className="text-[#4fc3f7] hover:underline">admin@512hockey.com</a></p>
        </section>
      </div>
    </div>
  )
}
