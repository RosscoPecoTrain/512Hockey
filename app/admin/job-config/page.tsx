'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { formatDistanceToNow } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface JobConfig {
  id: string
  job_name: string
  job_type: string
  enabled: boolean
  schedule_cron: string
  schedule_tz: string
  description: string | null
  config_data: Record<string, any> | null
  created_at: string
  updated_at: string
}

interface JobLogEntry {
  id: string
  job_name: string
  status: 'success' | 'failed' | 'pending'
  started_at: string
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

export default function JobConfigPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [jobs, setJobs] = useState<JobConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null)
  const [jobLogs, setJobLogs] = useState<JobLogEntry[]>([])
  const [runningJobName, setRunningJobName] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<any>(null)
  const [editingJob, setEditingJob] = useState<JobConfig | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
      setAuthChecking(false)
    }

    checkAuth()
  }, [router])

  // Fetch job configs
  useEffect(() => {
    if (!isAdmin) return

    const fetchJobs = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('cron_job_configs')
          .select('*')
          .order('job_name')

        if (error) throw error
        setJobs(data || [])
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [isAdmin])

  // Fetch job logs when job is selected
  const loadJobLogs = async (jobName: string) => {
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('id, job_name, status, started_at, duration_ms, error_message, created_at')
        .eq('job_name', jobName)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setJobLogs(data || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setJobLogs([])
    }
  }

  const handleSelectJob = (job: JobConfig) => {
    setSelectedJob(job)
    setEditingJob({ ...job })
    setRunResult(null)
    loadJobLogs(job.job_name)
  }

  const handleRunNow = async (job: JobConfig) => {
    setRunningJobName(job.job_name)
    setRunResult(null)

    try {
      const response = await fetch('/api/admin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName: job.job_name }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to run job')

      setRunResult({
        status: 'success',
        message: data.message,
      })

      // Reload logs
      loadJobLogs(job.job_name)
    } catch (err) {
      setRunResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setRunningJobName(null)
    }
  }

  const handleSaveConfig = async () => {
    if (!editingJob) return

    try {
      const { error } = await supabase
        .from('cron_job_configs')
        .update({
          schedule_cron: editingJob.schedule_cron,
          schedule_tz: editingJob.schedule_tz,
          enabled: editingJob.enabled,
          description: editingJob.description,
          config_data: editingJob.config_data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingJob.id)

      if (error) throw error

      setSaveMessage('✓ Job config saved successfully')
      setJobs(jobs.map(j => j.id === editingJob.id ? editingJob : j))
      setSelectedJob(editingJob)

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Checking permissions...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Access denied</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">📋 Job Configuration</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage 512Hockey cron jobs and schedules
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading jobs...
            </div>
          )}

          {/* Jobs list */}
          {!loading && jobs.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No jobs configured
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Job Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Schedule</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleSelectJob(job)}
                          className="text-[#4fc3f7] hover:underline font-medium"
                        >
                          {job.job_name}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                        {job.schedule_cron}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            job.enabled
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {job.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleRunNow(job)}
                          disabled={runningJobName === job.job_name}
                          className="px-3 py-1 bg-[#4fc3f7] text-white rounded text-xs font-semibold hover:bg-[#0288d1] disabled:opacity-50 transition"
                        >
                          {runningJobName === job.job_name ? 'Running...' : 'Run'}
                        </button>
                        <button
                          onClick={() => handleSelectJob(job)}
                          className="px-3 py-1 bg-gray-300 text-gray-900 rounded text-xs font-semibold hover:bg-gray-400 transition"
                        >
                          Config
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Job details panel */}
        {selectedJob && editingJob && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.job_name}</h2>
                <p className="text-gray-600 text-sm mt-1">{selectedJob.description}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Save message */}
            {saveMessage && (
              <div
                className={`mb-4 p-3 rounded ${
                  saveMessage.startsWith('✓')
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p className={saveMessage.startsWith('✓') ? 'text-green-900' : 'text-red-900'}>
                  {saveMessage}
                </p>
              </div>
            )}

            {/* Configuration form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cron Schedule
                </label>
                <input
                  type="text"
                  value={editingJob.schedule_cron}
                  onChange={(e) =>
                    setEditingJob({ ...editingJob, schedule_cron: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="0 */6 * * *"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use standard cron format (min hour day month weekday)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={editingJob.schedule_tz}
                  onChange={(e) => setEditingJob({ ...editingJob, schedule_tz: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="UTC"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingJob.enabled}
                    onChange={(e) =>
                      setEditingJob({ ...editingJob, enabled: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enabled</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingJob.description || ''}
                  onChange={(e) =>
                    setEditingJob({ ...editingJob, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
              </div>
            </div>

            {/* Run result */}
            {runResult && (
              <div
                className={`mb-6 p-3 rounded border ${
                  runResult.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    runResult.status === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {runResult.status === 'success' ? '✓' : '✗'} {runResult.message}
                </p>
              </div>
            )}

            {/* Recent runs */}
            {jobLogs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Runs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {jobLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {log.status}
                          </span>
                          <p className="text-gray-600 mt-1">
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <p className="text-gray-500">
                          {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                        </p>
                      </div>
                      {log.error_message && (
                        <p className="text-red-700 mt-1 font-mono">{log.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                💾 Save Config
              </button>
              <button
                onClick={() => handleRunNow(selectedJob)}
                disabled={runningJobName === selectedJob.job_name}
                className="px-4 py-2 bg-[#4fc3f7] text-white font-semibold rounded-lg hover:bg-[#0288d1] disabled:opacity-50 transition"
              >
                {runningJobName === selectedJob.job_name ? 'Running...' : '⚡ Run Now'}
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
