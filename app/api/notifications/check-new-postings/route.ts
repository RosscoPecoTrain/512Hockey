import { NextRequest, NextResponse } from 'next/server'
import { checkForNewEventPostings } from '@/lib/eventNotificationJob'

/**
 * API endpoint to trigger event notification job
 * GET /api/events/check-new-postings
 * Authorization: Bearer <secret-token>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.EVENT_JOB_SECRET_KEY

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Event job not configured' },
        { status: 500 }
      )
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('📡 Event notification job triggered via API')
    await checkForNewEventPostings()

    return NextResponse.json(
      { success: true, message: 'Event notification job completed' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Job failed:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      { error: 'Job failed', details: errorMessage },
      { status: 500 }
    )
  }
}
