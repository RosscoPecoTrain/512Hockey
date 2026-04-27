'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  rate_limit_requests: number
  rate_limit_window_seconds: number
  ip_whitelist: string[] | null
  description: string | null
  last_used_at: string | null
  created_at: string
}

interface CreateKeyForm {
  name: string
  description: string
  scopes: string[]
  rate_limit_requests: number
  rate_limit_window_seconds: number
  ip_whitelist: string
}

export default function APIKeysPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKey, setNewKey] = useState<{ key: string; key_prefix: string } | null>(null)
  const [formData, setFormData] = useState<CreateKeyForm>({
    name: '',
    description: '',
    scopes: ['read:events'],
    rate_limit_requests: 100,
    rate_limit_window_seconds: 60,
    ip_whitelist: '',
  })

  useEffect(() => {
    checkAdminAndLoadKeys()
  }, [])

  const checkAdminAndLoadKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        setError('Admin access required')
        setLoading(false)
        return
      }

      await loadKeys()
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      if (!res.ok) throw new Error('Failed to fetch keys')
      const data = await res.json()
      setKeys(data.keys || [])
      setLoading(false)
    } catch (err) {
      console.error('Error loading keys:', err)
      setError('Failed to load API keys')
      setLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const ipWhitelist = formData.ip_whitelist
        .split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0)

      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          scopes: formData.scopes,
          rate_limit_requests: formData.rate_limit_requests,
          rate_limit_window_seconds: formData.rate_limit_window_seconds,
          ip_whitelist: ipWhitelist.length > 0 ? ipWhitelist : null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create key')
      }

      const data = await res.json()
      setNewKey({ key: data.key, key_prefix: data.key_prefix })
      setFormData({
        name: '',
        description: '',
        scopes: ['read:events'],
        rate_limit_requests: 100,
        rate_limit_window_seconds: 60,
        ip_whitelist: '',
      })
      await loadKeys()
    } catch (err) {
      console.error('Error creating key:', err)
      setError(err instanceof Error ? err.message : 'Failed to create key')
    }
  }

  const handleToggleKey = async (keyId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })

      if (!res.ok) throw new Error('Failed to update key')
      await loadKeys()
    } catch (err) {
      console.error('Error toggling key:', err)
      setError('Failed to update key')
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete key')
      await loadKeys()
    } catch (err) {
      console.error('Error deleting key:', err)
      setError('Failed to delete key')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔑 API Keys</h1>
          <p className="text-gray-400">Manage your API keys and access tokens</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* New key created */}
        {newKey && (
          <div className="mb-6 p-6 bg-green-500/10 border border-green-500/50 rounded-lg">
            <h3 className="text-green-400 font-bold mb-3">✅ API Key Created!</h3>
            <p className="text-gray-300 mb-4">
              Save this key now — you won't see it again:
            </p>
            <div className="bg-slate-900 p-4 rounded font-mono text-sm break-all text-cyan-400 mb-4">
              {newKey.key}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey.key)
                alert('Copied to clipboard!')
              }}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded transition"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="ml-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create key form */}
        {showCreateForm ? (
          <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New API Key</h2>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
                  placeholder="e.g., Mobile App, External Service"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
                  placeholder="What is this key for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scopes
                </label>
                <div className="space-y-2">
                  {[
                    'read:events',
                    'write:events',
                    'read:jobs',
                    'write:jobs',
                    'read:users',
                    'write:users',
                    'admin',
                  ].map((scope) => (
                    <label key={scope} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.scopes.includes(scope)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              scopes: [...formData.scopes, scope],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              scopes: formData.scopes.filter((s) => s !== scope),
                            })
                          }
                        }}
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="ml-2 text-gray-300">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Rate Limit (requests)
                  </label>
                  <input
                    type="number"
                    value={formData.rate_limit_requests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rate_limit_requests: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Time Window (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.rate_limit_window_seconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rate_limit_window_seconds: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IP Whitelist (optional, one per line)
                </label>
                <textarea
                  value={formData.ip_whitelist}
                  onChange={(e) => setFormData({ ...formData, ip_whitelist: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
                  placeholder="203.0.113.0&#10;203.0.113.1"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded transition"
                >
                  Create Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-8 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded transition"
          >
            + Create New Key
          </button>
        )}

        {/* Keys list */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Your API Keys</h2>
          {keys.length === 0 ? (
            <p className="text-gray-400">No API keys yet. Create one to get started!</p>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{key.name}</h3>
                    <p className="text-sm text-gray-400">{key.key_prefix}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      key.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {key.description && <p className="text-gray-400 text-sm mb-3">{key.description}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Scopes:</span>
                    <p className="text-gray-300">{key.scopes.join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Rate Limit:</span>
                    <p className="text-gray-300">
                      {key.rate_limit_requests}/{key.rate_limit_window_seconds}s
                    </p>
                  </div>
                  {key.ip_whitelist && (
                    <div>
                      <span className="text-gray-500">IP Whitelist:</span>
                      <p className="text-gray-300">{key.ip_whitelist.join(', ')}</p>
                    </div>
                  )}
                  {key.last_used_at && (
                    <div>
                      <span className="text-gray-500">Last Used:</span>
                      <p className="text-gray-300">
                        {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleKey(key.id, key.is_active)}
                    className={`px-3 py-1 rounded text-sm transition ${
                      key.is_active
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                  >
                    {key.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="px-3 py-1 rounded text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
