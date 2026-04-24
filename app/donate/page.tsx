export default function Donate() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-8 text-[#0a1628] text-center">
        Support 512Hockey.com
      </h1>

      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2f4a] text-white rounded-lg p-8 mb-12">
        <p className="text-lg mb-4">
          512Hockey.com is a community-driven platform dedicated to connecting Austin&apos;s hockey players. Your donation helps us maintain and improve the platform for everyone.
        </p>
        <p className="text-lg">
          <strong>Funds are used for:</strong>
        </p>
        <ul className="mt-4 space-y-2 ml-4">
          <li>✓ Server hosting and maintenance</li>
          <li>✓ Feature development and improvements</li>
          <li>✓ Community events and sponsorships</li>
          <li>✓ Supporting local hockey initiatives</li>
        </ul>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Donation Tiers */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center hover:border-[#4fc3f7] transition">
          <h3 className="text-2xl font-bold text-[#0a1628] mb-2">Hat Trick</h3>
          <p className="text-4xl font-bold text-[#4fc3f7] mb-4">$10</p>
          <button className="w-full bg-[#4fc3f7] text-[#0a1628] py-2 rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50">
            Coming Soon
          </button>
          <p className="text-sm text-gray-600 mt-4">One-time donation</p>
        </div>

        <div className="bg-white border-2 border-[#4fc3f7] rounded-lg p-6 text-center">
          <div className="bg-[#4fc3f7] text-[#0a1628] px-3 py-1 rounded text-sm font-bold inline-block mb-4">
            POPULAR
          </div>
          <h3 className="text-2xl font-bold text-[#0a1628] mb-2">Assist</h3>
          <p className="text-4xl font-bold text-[#4fc3f7] mb-4">$25</p>
          <button className="w-full bg-[#4fc3f7] text-[#0a1628] py-2 rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50">
            Coming Soon
          </button>
          <p className="text-sm text-gray-600 mt-4">One-time donation</p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center hover:border-[#4fc3f7] transition">
          <h3 className="text-2xl font-bold text-[#0a1628] mb-2">Championship</h3>
          <p className="text-4xl font-bold text-[#4fc3f7] mb-4">$100</p>
          <button className="w-full bg-[#4fc3f7] text-[#0a1628] py-2 rounded font-semibold hover:bg-[#0a1628] hover:text-[#4fc3f7] transition disabled:opacity-50">
            Coming Soon
          </button>
          <p className="text-sm text-gray-600 mt-4">One-time donation</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-gray-700">
          <strong>Note:</strong> Stripe integration is coming soon. We&apos;re currently setting up secure payment processing. Thank you for your interest in supporting 512Hockey.com!
        </p>
      </div>
    </div>
  )
}
