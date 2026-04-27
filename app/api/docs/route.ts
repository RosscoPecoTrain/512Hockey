import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return OpenAPI spec (auth check can be added back later)
    return NextResponse.json(getOpenAPISpec())
  } catch (error) {
    console.error('Error in /api/docs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getOpenAPISpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: '512 Hockey API',
      description: 'API documentation for 512 Hockey platform',
      version: '1.0.0',
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    paths: {
      '/admin/api-keys': {
        get: {
          summary: 'List API keys',
          tags: ['API Keys'],
          responses: {
            200: {
              description: 'List of API keys',
            },
          },
        },
        post: {
          summary: 'Create API key',
          tags: ['API Keys'],
          responses: {
            201: {
              description: 'API key created',
            },
          },
        },
      },
      '/admin/jobs/run': {
        post: {
          summary: 'Run an admin job',
          tags: ['Admin Jobs'],
          responses: {
            200: {
              description: 'Job executed successfully',
            },
          },
        },
      },
    },
  }
}
