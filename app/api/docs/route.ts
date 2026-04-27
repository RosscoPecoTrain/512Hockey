import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Return OpenAPI spec
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
      contact: {
        name: 'API Support',
        email: 'support@512hockey.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    paths: {
      '/admin/jobs/run': {
        post: {
          summary: 'Run an admin job',
          description: 'Manually trigger a scheduled job',
          tags: ['Admin Jobs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job_id: {
                      type: 'string',
                      description: 'ID of the job to run',
                    },
                  },
                  required: ['job_id'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Job executed successfully',
            },
            401: {
              description: 'Unauthorized',
            },
            403: {
              description: 'Forbidden - Admin access required',
            },
          },
        },
      },
      '/admin/api-keys': {
        get: {
          summary: 'List API keys',
          description: 'Get all API keys for the current user',
          tags: ['API Keys'],
          responses: {
            200: {
              description: 'List of API keys',
            },
            401: {
              description: 'Unauthorized',
            },
          },
        },
        post: {
          summary: 'Create API key',
          description: 'Create a new API key with scopes and rate limits',
          tags: ['API Keys'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Key name',
                    },
                    scopes: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      description: 'Permissions for this key',
                    },
                    rate_limit_requests: {
                      type: 'integer',
                      default: 100,
                    },
                    rate_limit_window_seconds: {
                      type: 'integer',
                      default: 60,
                    },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'API key created',
            },
            401: {
              description: 'Unauthorized',
            },
          },
        },
      },
      '/notifications/types': {
        get: {
          summary: 'Get event types',
          description: 'Retrieve available event types',
          tags: ['Events'],
          responses: {
            200: {
              description: 'List of event types',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'API Key: Bearer sk_...',
        },
        cookieAuth: {
          type: 'apiKey',
          name: 'sb-access-token',
          in: 'cookie',
        },
      },
    },
    security: [
      {
        apiKey: [],
      },
      {
        cookieAuth: [],
      },
    ],
  }
}
