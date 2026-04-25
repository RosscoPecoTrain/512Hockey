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

interface JobLog {
  id: string
  job_name: string
  job_type: string
  status: 'success' | 'failed' | 'pending'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  error_message: string | null
  output_data: Record<string, any> | null
  created_at: string
}

type Tab = 'config' | 'logs'
type SortKey = 'job_name' | 'schedule_cron' | 'lastRun' | 'nextRun' | 'job_name_logs' | 'started_at' | 'completed_at' | 'duration_ms' | 'status'

export default function JobsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('config')
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('nextRun')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [logSortKey, setLogSortKey] = useState<SortKey>('started_at')
  const [logSortDir, setLogSortDir] = useState<'asc' | 'desc'>('desc')

  // Config state
  const [jobs, setJobs] = useState<JobConfig[]>([])
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null)
  const [editingJob, setEditingJob] = useState<JobConfig | null>(null)
  const [jobLogsForSelected, setJobLogsForSelected] = useState<JobLog[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [runningJobName, setRunningJobName] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<any>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Logs state
  const [logs, setLogs] = useState<JobLog[]>([])
  const [selectedLog, setSelectedLog] = useState<JobLog | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logPage, setLogPage] = useState(0)
  const [logTotal, setLogTotal] = useState(0)
  const [jobNameFilter, setJobNameFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [jobTypes, setJobTypes] = useState<string[]>([])

  const pageSize = 25

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
    if (!isAdmin || tab !== 'config') return

    const fetchJobs = async () => {
      setLoadingJobs(true)
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
        setLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [isAdmin, tab])

  // Fetch job logs
  useEffect(() => {
    if (!isAdmin || tab !== 'logs') return

    const fetchLogs = async () => {
      setLoadingLogs(true)
      try {
        let query = supabase
          .from('job_logs')
          .select('*', { count: 'exact' })

        if (jobNameFilter) {
          query = query.eq('job_name', jobNameFilter)
        }

        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(logPage * pageSize, logPage * pageSize + pageSize - 1)

        if (error) throw error

        setLogs(data || [])
        setLogTotal(count || 0)
      } catch (error) {
        console.error('Failed to fetch logs:', error)
      } finally {
        setLoadingLogs(false)
      }
    }

    fetchLogs()
  }, [isAdmin, tab, logPage, jobNameFilter, statusFilter])

  // Fetch unique job names for logs filter
  useEffect(() => {
    if (!isAdmin || tab !== 'logs') return

    const fetchJobNames = async () => {
      try {
        const { data, error } = await supabase
          .from('job_logs')
          .select('job_name', { count: 'exact' })
          .distinct()

        if (error) throw error

        const names = data?.map((d) => d.job_name) || []
        setJobTypes(names.sort())
      } catch (error) {
        console.error('Failed to fetch job names:', error)
      }
    }

    fetchJobNames()
  }, [isAdmin, tab])

  // Load logs for selected job
  const loadJobLogs = async (jobName: string) => {
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('*')
        .eq('job_name', jobName)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setJobLogsForSelected(data || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setJobLogsForSelected([])
    }
  }

  // Get last run for a job
  const getLastRun = (jobName: string): JobLog | undefined => {
    return jobLogsForSelected.find(log => log.job_name === jobName && log.status !== 'pending')
  }

  // Parse cron to estimate next run (simplified)
  const estimateNextRun = (cronStr: string): Date => {
    const now = new Date()
    // Simple approximation: add some hours based on cron pattern
    // For production, use a proper cron parser library
    if (cronStr.includes('*/6')) return new Date(now.getTime() + 6 * 60 * 60 * 1000)
    if (cronStr.includes('*/3')) return new Date(now.getTime() + 3 * 60 * 60 * 1000)
    if (cronStr.includes('0 0')) return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return new Date(now.getTime() + 60 * 60 * 1000)
  }

  // Sort jobs
  const sortedJobs = [...jobs].sort((a, b) => {
    let aVal: any, bVal: any

    if (sortKey === 'job_name') {
      aVal = a.job_name.toLowerCase()
      bVal = b.job_name.toLowerCase()
    } else if (sortKey === 'schedule_cron') {
      aVal = a.schedule_cron
      bVal = b.schedule_cron
    } else if (sortKey === 'lastRun') {
      const aLog = jobLogsForSelected.find(l => l.job_name === a.job_name)
      const bLog = jobLogsForSelected.find(l => l.job_name === b.job_name)
      aVal = aLog ? new Date(aLog.created_at).getTime() : 0
      bVal = bLog ? new Date(bLog.created_at).getTime() : 0
    } else if (sortKey === 'nextRun') {
      aVal = estimateNextRun(a.schedule_cron).getTime()
      bVal = estimateNextRun(b.schedule_cron).getTime()
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-gray-300 text-xs">⇅</span>
    return sortDir === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
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
            <h1 className="text-2xl font-bold text-gray-900">🏒 Jobs Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              Configure and monitor 512Hockey cron jobs
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                setTab('config')
                setLogPage(0)
              }}
              className={`px-4 py-2 font-semibold rounded-lg transition ${
                tab === 'config'
                  ? 'bg-[#0a1628] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Configuration
            </button>
            <button
              onClick={() => {
                setTab('logs')
                setLogPage(0)
              }}
              className={`px-4 py-2 font-semibold rounded-lg transition ${
                tab === 'logs'
                  ? 'bg-[#0a1628] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Logs
            </button>
          </div>

          {/* Configuration Tab */}
          {tab === 'config' && (
            <div>
              {/* Loading state */}
              {loadingJobs && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Loading jobs...
                </div>
              )}

              {/* Jobs list */}
              {!loadingJobs && jobs.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No jobs configured
                </div>
              )}

              {!loadingJobs && jobs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('job_name')}
                            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
                          >
                            Job Name <SortIndicator column="job_name" />
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('schedule_cron')}
                            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
                          >
                            Schedule <SortIndicator column="schedule_cron" />
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('lastRun')}
                            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
                          >
                            Last Run <SortIndicator column="lastRun" />
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('nextRun')}
                            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
                          >
                            Next Start Date <SortIndicator column="nextRun" />
                          </button>
                        </th>
                        <th className="px-6 py-3 text-right font-medium text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedJobs.map((job) => {
                        const lastRun = jobLogsForSelected.find(l => l.job_name === job.job_name)
                        const nextRun = estimateNextRun(job.schedule_cron)
                        return (
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
                            <td className="px-6 py-3 text-gray-600 text-xs">
                              {lastRun ? (
                                <div>
                                  <div className="font-mono">{new Date(lastRun.created_at).toLocaleDateString()} {new Date(lastRun.created_at).toLocaleTimeString()}</div>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-1 font-semibold ${
                                    lastRun.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {lastRun.status}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-gray-900">
                              <div className="font-medium">in ~{Math.floor((nextRun.getTime() - new Date().getTime()) / 3600000)}h</div>
                              <div className="text-xs text-gray-500 font-mono">{nextRun.toLocaleDateString()} {nextRun.toLocaleTimeString()}</div>
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {tab === 'logs' && (
            <div>
              {/* Filters */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Name
                    </label>
                    <select
                      value={jobNameFilter}
                      onChange={(e) => {
                        setJobNameFilter(e.target.value)
                        setLogPage(0)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Jobs</option>
                      {jobTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setLogPage(0)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Results
                    </label>
                    <div className="flex items-center h-10 bg-white px-3 border border-gray-300 rounded-md text-sm text-gray-700">
                      {loadingLogs ? 'Loading...' : `${logTotal} entries`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs table */}
              {loadingLogs && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Loading logs...
                </div>
              )}

              {!loadingLogs && logs.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No logs found
                </div>
              )}

              {!loadingLogs && logs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setLogSortKey('job_name_logs'); setLogSortDir(logSortDir === 'asc' ? 'desc' : 'asc'); }}>Job {logSortKey === 'job_name_logs' && (logSortDir === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setLogSortKey('status'); setLogSortDir(logSortDir === 'asc' ? 'desc' : 'asc'); }}>Status {logSortKey === 'status' && (logSortDir === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setLogSortKey('started_at'); setLogSortDir(logSortDir === 'asc' ? 'desc' : 'asc'); }}>Start Date {logSortKey === 'started_at' && (logSortDir === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setLogSortKey('completed_at'); setLogSortDir(logSortDir === 'asc' ? 'desc' : 'asc'); }}>End Date {logSortKey === 'completed_at' && (logSortDir === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setLogSortKey('duration_ms'); setLogSortDir(logSortDir === 'asc' ? 'desc' : 'asc'); }}>Duration {logSortKey === 'duration_ms' && (logSortDir === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logs.sort((a, b) => {
                        let aVal: any = a[logSortKey as keyof JobLog] || ''
                        let bVal: any = b[logSortKey as keyof JobLog] || ''
                        if (logSortKey === 'job_name_logs') {
                          aVal = a.job_name
                          bVal = b.job_name
                        }
                        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
                        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
                        if (aVal < bVal) return logSortDir === 'asc' ? -1 : 1
                        if (aVal > bVal) return logSortDir === 'asc' ? 1 : -1
                        return 0
                      }).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-3 font-medium text-gray-900">{log.job_name}</td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                log.status === 'success'
                                  ? 'bg-green-50 text-green-700'
                                  : log.status === 'failed'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-yellow-50 text-yellow-700'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-600 text-xs">
                            {new Date(log.started_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-gray-600 text-xs">
                            {log.completed_at ? new Date(log.completed_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
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

              {/* Pagination */}
              {logTotal > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {logPage + 1} of {Math.ceil(logTotal / pageSize)}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => setLogPage(Math.max(0, logPage - 1))}
                      disabled={logPage === 0}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setLogPage(logPage + 1)}
                      disabled={logPage >= Math.ceil(logTotal / pageSize) - 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Job details panel (Config tab) */}
        {tab === 'config' && selectedJob && editingJob && (
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

            {saveMessage && (
              <div
                className={`mb-4 p-3 rounded ${
                  saveMessage.startsWith('✓')
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p
                  className={saveMessage.startsWith('✓') ? 'text-green-900' : 'text-red-900'}
                >
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
            {jobLogsForSelected.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Runs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {jobLogsForSelected.map((log) => (
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
                        <p className="text-gray-500">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</p>
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

        {/* Log details panel (Logs tab) */}
        {tab === 'logs' && selectedLog && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedLog.job_name}</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Status</label>
                <p className="text-sm mt-1">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedLog.status === 'success'
                        ? 'bg-green-50 text-green-700'
                        : selectedLog.status === 'failed'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Duration</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Started</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(selectedLog.started_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Completed</label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedLog.completed_at
                    ? new Date(selectedLog.completed_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {selectedLog.error_message && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  Error Message
                </label>
                <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-900 font-mono break-words">
                    {selectedLog.error_message}
                  </p>
                </div>
              </div>
            )}

            {selectedLog.output_data && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  Output Data
                </label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md overflow-x-auto">
                  <pre className="text-xs text-gray-900">
                    {JSON.stringify(selectedLog.output_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
