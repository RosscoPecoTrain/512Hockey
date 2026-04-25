'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { formatDistanceToNow } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

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

export default function AdminJobsTab() {
  const [logs, setLogs] = useState<JobLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<JobLog | null>(null)
  const [jobTypes, setJobTypes] = useState<string[]>([])

  const pageSize = 25

  // Fetch job logs
  async function fetchLogs() {
    setLoading(true)
    try {
      let query = supabase
        .from('job_logs')
        .select('*', { count: 'exact' })

      if (jobTypeFilter) {
        query = query.eq('job_type', jobTypeFilter)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1)

      if (error) throw error

      setLogs(data || [])
      setTotal(count || 0)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch unique job types for filter dropdown
  async function fetchJobTypes() {
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('job_type', { count: 'exact' })
        .distinct()

      if (error) throw error

      const types = data?.map((d) => d.job_type) || []
      setJobTypes(types.sort())
    } catch (error) {
      console.error('Failed to fetch job types:', error)
    }
  }

  useEffect(() => {
    fetchJobTypes()
  }, [])

  useEffect(() => {
    setPage(0) // Reset to first page when filters change
  }, [jobTypeFilter, statusFilter])

  useEffect(() => {
    fetchLogs()
  }, [page, jobTypeFilter, statusFilter])

  const statusColors = {
    success: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    pending: 'text-yellow-600 bg-yellow-50',
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">🏒 Job Logs</h1>
            <p className="text-gray-600 text-sm mt-1">
              System job execution history (last 90 days)
            </p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
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
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {loading ? 'Loading...' : `${total} entries`}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading && !logs.length ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Loading...
              </div>
            ) : logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No job logs found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {log.job_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {log.job_type}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            statusColors[log.status]
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Job Details
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Job Name
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.job_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Job Type
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{selectedLog.job_type}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </label>
                  <p className="text-sm mt-1">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        statusColors[selectedLog.status]
                      }`}
                    >
                      {selectedLog.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Duration
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Started
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedLog.started_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Completed
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.completed_at
                      ? new Date(selectedLog.completed_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
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
                <div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
