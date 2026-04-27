'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
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
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }

      setIsAdmin(true)
      setLoading(false)
    } catch (err) {
      console.error('Error checking admin status:', err)
      setError('Failed to verify admin status')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Loading API documentation...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">{error || 'You do not have permission to access this page.'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded transition"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">🏒 512 Hockey API Documentation</h1>
          <p className="text-gray-400">Interactive API reference for admin users</p>
        </div>
      </div>

      {/* Swagger UI Container */}
      <div className="swagger-ui-container">
        <style jsx>{`
          .swagger-ui-container {
            max-width: 100%;
            background: linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59));
          }

          /* Swagger UI Styling */
          :global(.swagger-ui) {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          :global(.swagger-ui .topbar) {
            background: linear-gradient(to right, rgb(15, 23, 42), rgb(30, 41, 59));
            border-bottom: 1px solid rgb(71, 85, 105);
          }

          :global(.swagger-ui .information-container) {
            margin: 0;
            padding: 20px;
          }

          :global(.swagger-ui .btn) {
            background: rgb(6, 182, 212);
            border-color: rgb(6, 182, 212);
            color: white;
          }

          :global(.swagger-ui .btn:hover) {
            background: rgb(5, 150, 175);
            border-color: rgb(5, 150, 175);
          }

          :global(.swagger-ui .scheme-container) {
            background: rgb(30, 41, 59);
            border: 1px solid rgb(71, 85, 105);
          }

          :global(.swagger-ui .model-box) {
            background: rgb(30, 41, 59);
            border: 1px solid rgb(71, 85, 105);
          }

          :global(.swagger-ui .parameter__name) {
            color: rgb(6, 182, 212);
            font-weight: bold;
          }

          :global(.swagger-ui .opblock.opblock-get) {
            background: rgba(59, 130, 246, 0.1);
            border-color: rgb(59, 130, 246);
          }

          :global(.swagger-ui .opblock.opblock-post) {
            background: rgba(34, 197, 94, 0.1);
            border-color: rgb(34, 197, 94);
          }

          :global(.swagger-ui .opblock.opblock-delete) {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgb(239, 68, 68);
          }

          :global(.swagger-ui .response-col_status) {
            color: rgb(6, 182, 212);
          }

          :global(.swagger-ui .response-col_description) {
            color: rgb(229, 231, 235);
          }

          :global(.swagger-ui .properties-row) {
            border-bottom: 1px solid rgb(71, 85, 105);
          }

          :global(.swagger-ui input[type='text'],
                   .swagger-ui input[type='email'],
                   .swagger-ui input[type='password'],
                   .swagger-ui input[type='search'],
                   .swagger-ui textarea,
                   .swagger-ui select) {
            background: rgb(30, 41, 59);
            border: 1px solid rgb(71, 85, 105);
            color: rgb(229, 231, 235);
          }

          :global(.swagger-ui input[type='text']:focus,
                   .swagger-ui input[type='email']:focus,
                   .swagger-ui input[type='password']:focus,
                   .swagger-ui input[type='search']:focus,
                   .swagger-ui textarea:focus,
                   .swagger-ui select:focus) {
            border-color: rgb(6, 182, 212);
            outline: none;
          }

          :global(.swagger-ui .markdown) {
            color: rgb(229, 231, 235);
          }

          :global(.swagger-ui .opblock-description-wrapper,
                   .swagger-ui .opblock-external-docs-wrapper,
                   .swagger-ui .opblock-title_normal) {
            color: rgb(229, 231, 235);
          }

          :global(.swagger-ui .opblock-summary-path,
                   .swagger-ui .opblock-summary-operation-id,
                   .swagger-ui .opblock-summary-path__deprecated) {
            color: rgb(6, 182, 212);
          }
        `}</style>

        <SwaggerUI
          url="/api/docs"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          docExpansion="list"
          filter={true}
          showRequestHeaders={true}
          supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']}
          tryItOutEnabled={true}
        />
      </div>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-700 p-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>512 Hockey API Documentation • Admin Only • Last updated {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}
