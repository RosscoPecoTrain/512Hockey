'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { formatDistanceToNow } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface CronJob {
  id: string
  name: string
  description?: string
  enabled: boolean
  schedule: {
    kind: string
    expr?: string
    everyMs?: number
    at?: string
    tz?: string
  }
  payload: {
    kind: string
    text?: string
    message?: string
    model?: string
    timeoutSeconds?: number
  }
  sessionTarget?: string
  state: {
    nextRunAtMs: number
    lastRunAtMs: number
    lastRunStatus: string
    lastError?: string
  }
}

interface JobLogStats {
  jobId: string
  lastRun: string
  lastStatus: string
  runCount: number
}

export default function JobConfigPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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

  // Fetch cron jobs from OpenClaw
  useEffect(() => {
    if (!isAdmin) return

    const fetchJobs = async () => {
      setLoading(true)
      try {
        // This would call OpenClaw API in production
        // For now, we'll fetch from a hypothetical endpoint
        const response = await fetch('/api/admin/cron-jobs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) throw new Error('Failed to fetch jobs')
        const data = await response.json()
        setJobs(data.jobs || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs')
        setJobs([])
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [isAdmin])

  const formatSchedule = (job: CronJob): string => {
    const sched = job.schedule
    if (sched.kind === 'cron') return sched.expr || 'N/A'
    if (sched.kind === 'every') return `Every ${sched.everyMs}ms`
    if (sched.kind === 'at') return `At ${new Date(sched.at || '').toLocaleString()}`
    return 'Unknown'
  }

  const formatLastRun = (job: CronJob): string => {
    if (!job.state.lastRunAtMs) return 'Never'
    return formatDistanceToNow(new Date(job.state.lastRunAtMs), { addSuffix: true })
  }

  const formatNextRun = (job: CronJob): string => {
    if (!job.state.nextRunAtMs) return 'Unknown'
    return formatDistanceToNow(new Date(job.state.nextRunAtMs), { addSuffix: true })
  }

  const handleRunNow = async (job: CronJob) => {
    setRunningJobId(job.id)
    setRunResult(null)

    try {
      const response = await fetch('/api/admin/cron-jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to run job')

      setRunResult({
        status: 'success',
        message: data.message,
        runId: data.runId,
      })
    } catch (err) {
      setRunResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setRunningJobId(null)
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
              View and manage OpenClaw cron jobs
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading jobs...
            </div>
          )}

          {/* Jobs list */}
          {!loading && jobs.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No jobs found. Make sure OpenClaw is configured.
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
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Last Run</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700">Next Run</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="text-[#4fc3f7] hover:underline font-medium"
                        >
                          {job.name}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                        {formatSchedule(job)}
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
                      <td className="px-6 py-3 text-gray-600">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            job.state.lastRunStatus === 'ok'
                              ? 'bg-green-100 text-green-700'
                              : job.state.lastRunStatus === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {formatLastRun(job)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {formatNextRun(job)}
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleRunNow(job)}
                          disabled={runningJobId === job.id}
                          className="px-3 py-1 bg-[#4fc3f7] text-white rounded text-xs font-semibold hover:bg-[#0288d1] disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {runningJobId === job.id ? 'Running...' : 'Run Now'}
                        </button>
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-3 py-1 bg-gray-300 text-gray-900 rounded text-xs font-semibold hover:bg-gray-400 transition"
                        >
                          Details
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
        {selectedJob && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.name}</h2>
                <p className="text-gray-600 text-sm mt-1">{selectedJob.description}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Schedule</label>
                <p className="text-sm text-gray-900 mt-1 font-mono">{formatSchedule(selectedJob)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Status</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedJob.enabled ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Last Run</label>
                <p className="text-sm text-gray-900 mt-1">
                  {formatLastRun(selectedJob)}
                  {selectedJob.state.lastRunStatus && (
                    <span className="ml-2">
                      ({selectedJob.state.lastRunStatus})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Next Run</label>
                <p className="text-sm text-gray-900 mt-1">
                  {formatNextRun(selectedJob)}
                </p>
              </div>
            </div>

            {selectedJob.state.lastError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded">
                <label className="text-xs font-semibold text-gray-600 uppercase block mb-1">
                  Last Error
                </label>
                <p className="text-sm text-red-900 font-mono">{selectedJob.state.lastError}</p>
              </div>
            )}

            {/* Payload config */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-600 uppercase">Payload</label>
              <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded overflow-x-auto">
                <pre className="text-xs text-gray-900">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
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
                {runResult.runId && (
                  <p className="text-xs text-gray-600 mt-1">Run ID: {runResult.runId}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleRunNow(selectedJob)}
                disabled={runningJobId === selectedJob.id}
                className="px-4 py-2 bg-[#4fc3f7] text-white font-semibold rounded-lg hover:bg-[#0288d1] disabled:opacity-50 transition"
              >
                {runningJobId === selectedJob.id ? 'Running...' : '⚡ Run Now'}
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
