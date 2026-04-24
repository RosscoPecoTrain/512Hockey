'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ReportButtonProps {
  targetId: string
  targetType: 'profile' | 'forum_post' | 'message'
  currentUserId: string
}

export default function ReportButton({ targetId, targetType, currentUserId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reasons = [
    'Harassment or threatening behavior',
    'Inappropriate or explicit content',
    'Spam or solicitation',
    'Fake account or impersonation',
    'Suspected predatory behavior',
    'Other',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return
    setIsSubmitting(true)
    try {
      await supabase.from('reports').insert([{
        reporter_id: currentUserId,
        target_id: targetId,
        target_type: targetType,
        reason,
        status: 'pending',
      }])
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting report:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
        ✓ Report submitted — thank you
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-gray-400 dark:text-[#8b949e] hover:text-red-500 transition"
      >
        🚩 Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf3] mb-4">Report Content</h3>
            <p className="text-gray-600 dark:text-[#8b949e] text-sm mb-4">
              Reports are reviewed by admins within 24 hours. Thank you for helping keep 512Hockey.com safe.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="space-y-2 mb-6">
                {reasons.map(r => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      onChange={() => setReason(r)}
                      className="accent-[#4fc3f7]"
                    />
                    <span className="text-gray-700 dark:text-[#e6edf3] text-sm">{r}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!reason || isSubmitting}
                  className="flex-1 bg-red-500 text-white py-2 rounded font-semibold hover:bg-red-600 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-[#30363d] rounded font-semibold hover:bg-gray-50 dark:hover:bg-[#21262d] transition text-gray-700 dark:text-[#e6edf3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
