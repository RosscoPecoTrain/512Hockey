'use client'

import { useState } from 'react'

interface SubscriptionModalProps {
  eventTypeName: string
  isOpen: boolean
  onClose: () => void
  onSubscribe: (channels: string[]) => Promise<void>
  isLoading: boolean
}

export default function SubscriptionModal({
  eventTypeName,
  isOpen,
  onClose,
  onSubscribe,
  isLoading,
}: SubscriptionModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['push'])

  const channels = [
    { id: 'push', label: '🔔 Push Notifications', description: 'Desktop & mobile notifications' },
    { id: 'email', label: '📧 Email', description: 'Notifications sent to your email' },
  ]

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    )
  }

  const handleSubscribe = async () => {
    if (selectedChannels.length === 0) return
    await onSubscribe(selectedChannels)
    setSelectedChannels(['push'])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-2">{eventTypeName}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose how you'd like to be notified
        </p>

        <div className="space-y-3 mb-8">
          {channels.map((channel) => (
            <label
              key={channel.id}
              className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <input
                type="checkbox"
                checked={selectedChannels.includes(channel.id)}
                onChange={() => toggleChannel(channel.id)}
                className="mt-1 w-4 h-4 rounded"
              />
              <div>
                <div className="font-medium">{channel.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {channel.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubscribe}
            disabled={isLoading || selectedChannels.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {isLoading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
      </div>
    </div>
  )
}
