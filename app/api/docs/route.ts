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
    return NextResponse.json(openApiSpec)
  } catch (error) {
    console.error('Error in /api/docs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: '512 Hockey API',
    description: 'API documentation for 512 Hockey platform',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@512hockey.com'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'API Server'
    }
  ],
  paths: {
    '/admin/jobs/run': {
      post: {
        summary: 'Run an admin job',
        description: 'Manually trigger a scheduled job (e.g., scrape rink events)',
        tags: ['Admin Jobs'],
        operationId: 'runJob',
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
                    example: 'scrape_rink_events'
                  }
                },
                required: ['job_id']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Job executed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized'
          },
          403: {
            description: 'Forbidden - Admin access required'
          }
        }
      }
    },
    '/events/types': {
      get: {
        summary: 'Get event types',
        description: 'Retrieve available event types',
        tags: ['Events'],
        operationId: 'getEventTypes',
        responses: {
          200: {
            description: 'List of event types',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/events/subscriptions': {
      get: {
        summary: 'List subscriptions',
        description: 'Get all event subscriptions for the current user',
        tags: ['Events'],
        operationId: 'getSubscriptions',
        responses: {
          200: {
            description: 'List of subscriptions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      user_id: { type: 'string' },
                      event_type: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized'
          }
        }
      },
      post: {
        summary: 'Create subscription',
        description: 'Subscribe to a specific event type',
        tags: ['Events'],
        operationId: 'createSubscription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  event_type: {
                    type: 'string',
                    description: 'Type of event to subscribe to',
                    example: 'hockey_drop_in'
                  }
                },
                required: ['event_type']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Subscription created'
          },
          401: {
            description: 'Unauthorized'
          }
        }
      }
    },
    '/events/subscriptions/{id}': {
      delete: {
        summary: 'Delete subscription',
        description: 'Unsubscribe from an event type',
        tags: ['Events'],
        operationId: 'deleteSubscription',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Subscription ID'
          }
        ],
        responses: {
          200: {
            description: 'Subscription deleted'
          },
          401: {
            description: 'Unauthorized'
          },
          404: {
            description: 'Subscription not found'
          }
        }
      }
    },
    '/events/check-new-postings': {
      post: {
        summary: 'Check for new event postings',
        description: 'Trigger a check for new hockey drop-in events',
        tags: ['Events'],
        operationId: 'checkNewPostings',
        responses: {
          200: {
            description: 'Check completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    new_events: { type: 'integer' },
                    updated_events: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/events/notifications': {
      get: {
        summary: 'Get notifications',
        description: 'Retrieve user notifications for new events',
        tags: ['Events'],
        operationId: 'getNotifications',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
            description: 'Number of notifications to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Pagination offset'
          }
        ],
        responses: {
          200: {
            description: 'List of notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      event_type: { type: 'string' },
                      message: { type: 'string' },
                      read: { type: 'boolean' },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized'
          }
        }
      }
    },
    '/admin/users': {
      get: {
        summary: 'List users',
        description: 'Get all users (admin only)',
        tags: ['Admin Users'],
        operationId: 'listUsers',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Number of users to return'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Pagination offset'
          }
        ],
        responses: {
          200: {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      full_name: { type: 'string' },
                      email: { type: 'string' },
                      is_admin: { type: 'boolean' },
                      is_banned: { type: 'boolean' },
                      is_enabled: { type: 'boolean' },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          403: {
            description: 'Forbidden - Admin access required'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description: 'Supabase authentication token (automatic via cookies)'
      }
    }
  },
  security: [
    {
      cookieAuth: []
    }
  ]
}
