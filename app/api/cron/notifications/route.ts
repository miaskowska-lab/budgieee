import { NextRequest, NextResponse } from 'next/server'
import { 
  processHighPriorityNotifications, 
  processDigestNotifications 
} from '@/lib/notifications'

// ============================================
// NOTIFICATION CRON ENDPOINT
// Run via Vercel Cron every 15 minutes
// ============================================

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  
  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  // In production, require secret
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - cron endpoint is unprotected')
    return true
  }
  
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check for dry run mode
  const searchParams = request.nextUrl.searchParams
  const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true'
  const mode = searchParams.get('mode') || 'all' // 'high', 'digest', or 'all'
  
  const startTime = Date.now()
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    dryRun,
    mode,
  }
  
  try {
    // Process high-priority notifications (immediate)
    if (mode === 'all' || mode === 'high') {
      const highPriorityResult = await processHighPriorityNotifications(dryRun)
      results.highPriority = highPriorityResult
    }
    
    // Process digest notifications (batched, once per day per user)
    // Only run digest processing at specific hours (e.g., every hour on the hour)
    const currentHour = new Date().getUTCHours()
    const shouldProcessDigest = mode === 'digest' || 
      (mode === 'all' && new Date().getMinutes() < 15) // Only in first 15 min of each hour
    
    if (shouldProcessDigest) {
      const digestResult = await processDigestNotifications(dryRun)
      results.digest = digestResult
    } else {
      results.digest = { skipped: true, reason: 'Not digest processing window' }
    }
    
    results.durationMs = Date.now() - startTime
    results.success = true
    
    // Log summary
    console.log('[CRON] Notification processing complete:', JSON.stringify(results, null, 2))
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('[CRON] Notification processing failed:', error)
    
    return NextResponse.json({
      ...results,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    }, { status: 500 })
  }
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
  return GET(request)
}
