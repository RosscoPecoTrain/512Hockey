export default function GuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-2">Community Guidelines</h1>
      <p className="text-gray-500 dark:text-[#8b949e] mb-8">512Hockey.com is a community for Austin hockey players. Keep it that way.</p>

      <div className="space-y-6">
        {[
          { emoji: '🏒', title: 'Be a good teammate', body: 'Treat everyone with respect — on and off the ice. Disagreements happen, but personal attacks, insults, and harassment have no place here.' },
          { emoji: '🛡️', title: 'Keep it safe', body: 'No threatening messages, no stalking, no sharing someone\'s personal info without their consent. Any behavior that makes another player feel unsafe will result in immediate account suspension.' },
          { emoji: '🔞', title: 'Adults only', body: 'This platform is for players 18 and older. Do not attempt to contact or solicit minors. Violations will be reported to law enforcement.' },
          { emoji: '📣', title: 'Keep it hockey', body: 'This is a hockey community. Keep posts and messages relevant. No spam, no unsolicited promotions, no off-topic political content.' },
          { emoji: '🚩', title: 'Report don\'t retaliate', body: 'If someone is breaking the rules, use the Report button. Don\'t respond with more bad behavior. Admins review all reports.' },
          { emoji: '✅', title: 'Be who you say you are', body: 'Use your real name and accurate profile info. Fake accounts and impersonation are grounds for permanent ban.' },
        ].map(({ emoji, title, body }) => (
          <div key={title} className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-6">
            <h2 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-2">{emoji} {title}</h2>
            <p className="text-gray-700 dark:text-[#8b949e]">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-[#0a1628] text-white rounded-lg p-6 text-center">
        <p className="text-lg font-semibold mb-2">See something wrong?</p>
        <p className="text-gray-300 mb-4">Use the Report button on any profile or post, or email us directly.</p>
        <a href="mailto:admin@512hockey.com" className="bg-[#4fc3f7] text-[#0a1628] px-6 py-2 rounded font-semibold hover:bg-white transition inline-block">
          Contact Admin
        </a>
      </div>
    </div>
  )
}
