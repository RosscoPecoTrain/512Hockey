export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-2">Terms of Service</h1>
      <p className="text-gray-500 dark:text-[#8b949e] mb-8">Last updated: April 2026</p>

      <div className="prose max-w-none space-y-8 text-gray-700 dark:text-[#e6edf3]">
        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">1. Acceptance of Terms</h2>
          <p>By creating an account or using 512Hockey.com, you agree to these Terms of Service. If you do not agree, do not use the site.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">2. Eligibility</h2>
          <p>You must be at least 18 years old to use 512Hockey.com. By registering, you confirm that you are 18 or older.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">3. Prohibited Conduct</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Harass, threaten, or intimidate other users</li>
            <li>Post sexually explicit, violent, or otherwise inappropriate content</li>
            <li>Impersonate another person or create fake accounts</li>
            <li>Use the platform to solicit minors in any way</li>
            <li>Spam other users with unsolicited messages</li>
            <li>Share another user&apos;s private information without consent</li>
            <li>Use the platform for commercial solicitation without permission</li>
            <li>Attempt to hack, scrape, or disrupt the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">4. Reporting &amp; Enforcement</h2>
          <p>We take safety seriously. Users can report abusive profiles, posts, or messages using the Report button. Reported content is reviewed by administrators. Violations may result in content removal, account suspension, or permanent ban. Serious violations may be reported to law enforcement.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">5. Account Termination</h2>
          <p>We reserve the right to suspend or terminate any account at our discretion, with or without notice, for violations of these terms.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">6. Limitation of Liability</h2>
          <p>512Hockey.com is provided &quot;as is&quot;. We are not responsible for the conduct of users on the platform. Use the platform at your own risk.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-3">7. Contact</h2>
          <p>To report abuse or contact us: <a href="mailto:admin@512hockey.com" className="text-[#4fc3f7] hover:underline">admin@512hockey.com</a></p>
        </section>
      </div>
    </div>
  )
}
