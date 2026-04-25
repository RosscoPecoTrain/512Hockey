import { NextRequest, NextResponse } from 'next/server'
import { scrapeDropInHockeyEvents } from '@/lib/dropInScraper'
import { logJobRun } from '@/lib/jobLogger'

/**
 * API endpoint to trigger the drop-in hockey scraper
 * Called by the job scheduler or manually
 */
export async function POST(request: NextRequest) {
  const startTime = new Date()

  try {
    console.log('🏒 Drop-in hockey scraper triggered via API')

    // Run the scraper
    const result = await scrapeDropInHockeyEvents()

    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    // Log successful job run
    await logJobRun({
      jobName: 'scrape-drop-in-hockey',
      jobType: 'drop_in_scraper',
      status: 'success',
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      outputData: {
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        locationsScraped: result.locationsScraped,
        errors: result.errors,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Drop-in hockey scraper completed',
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error('❌ Scraper failed:', errorMessage)

    // Log failed job run
    await logJobRun({
      jobName: 'scrape-drop-in-hockey',
      jobType: 'drop_in_scraper',
      status: 'failed',
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      errorMessage,
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
