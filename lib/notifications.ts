import { createClient } from '@supabase/supabase-js'

// ============================================
// NOTIFICATION SYSTEM
// Email notifications for Budgieee
// ============================================

// Types
export interface NotificationEvent {
  id: string
  user_id: string
  user_email: string
  type: 'community_post' | 'trip_added' | 'split_expense' | 'split_settle' | 'budget_alert' | 'budget_digest'
  title: string
  body: string
  url: string | null
  priority: 'high' | 'normal'
  created_at: string
  notif_community: boolean
  notif_trips: boolean
  notif_budget: boolean
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

// Get Supabase admin client for server-side operations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
}

// ============================================
// EMAIL SENDING
// Uses Resend if configured, otherwise logs
// ============================================

async function sendEmailViaResend(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }
  
  const fromEmail = process.env.NOTIF_FROM_EMAIL || 'Budgieee <notifications@budgieee.app>'
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message || `HTTP ${response.status}` }
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function sendEmail(payload: EmailPayload, dryRun = false): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    console.log('[DRY RUN] Would send email:', {
      to: payload.to,
      subject: payload.subject,
      bodyPreview: payload.text.slice(0, 100) + '...',
    })
    return { success: true }
  }
  
  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    return sendEmailViaResend(payload)
  }
  
  // No email provider configured - log instead
  console.log('[NO EMAIL PROVIDER] Email would be sent:', {
    to: payload.to,
    subject: payload.subject,
  })
  return { success: true }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function generateEmailHtml(title: string, body: string, ctaText: string, ctaUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a1628;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a1628;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(180deg, #142136 0%, #1a2d4a 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Budgieee
              </h1>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 24px 16px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                ${title}
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                ${body}
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                ${ctaText}
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this because you have notifications enabled.
                <br>
                <a href="${BASE_URL}" style="color: #60a5fa;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function generateDigestHtml(sections: { title: string; items: string[] }[]): string {
  const sectionsHtml = sections.map(section => `
    <tr>
      <td style="padding: 16px 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #60a5fa;">
          ${section.title}
        </h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.8;">
          ${section.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </td>
    </tr>
  `).join('')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Budgieee Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a1628;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a1628;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(180deg, #142136 0%, #1a2d4a 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Budgieee
              </h1>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 24px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                Your Daily Digest
              </h2>
            </td>
          </tr>
          
          <!-- Sections -->
          ${sectionsHtml}
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 24px;">
              <a href="${BASE_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Open Budgieee
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this daily digest based on your preferences.
                <br>
                <a href="${BASE_URL}" style="color: #60a5fa;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ============================================
// NOTIFICATION PROCESSING
// ============================================

// Check if notification should be sent based on user settings
function shouldSendNotification(event: NotificationEvent): boolean {
  switch (event.type) {
    case 'community_post':
      return event.notif_community
    case 'trip_added':
    case 'split_expense':
    case 'split_settle':
      return event.notif_trips
    case 'budget_alert':
    case 'budget_digest':
      return event.notif_budget
    default:
      return true
  }
}

// Process high-priority notifications (send immediately)
export async function processHighPriorityNotifications(dryRun = false): Promise<{
  processed: number
  sent: number
  skipped: number
  errors: string[]
}> {
  const result = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] }
  
  try {
    const supabase = getAdminClient()
    
    // Get pending high-priority notifications
    const { data: notifications, error } = await supabase
      .rpc('get_pending_notifications', { p_priority: 'high', p_limit: 50 })
    
    if (error) {
      result.errors.push(`Failed to fetch notifications: ${error.message}`)
      return result
    }
    
    if (!notifications || notifications.length === 0) {
      return result
    }
    
    const deliveredIds: string[] = []
    
    for (const notif of notifications as NotificationEvent[]) {
      result.processed++
      
      // Check user settings
      if (!shouldSendNotification(notif)) {
        result.skipped++
        deliveredIds.push(notif.id) // Mark as delivered even if skipped
        continue
      }
      
      // Generate email
      const ctaUrl = notif.url ? `${BASE_URL}${notif.url}` : BASE_URL
      const html = generateEmailHtml(notif.title, notif.body, 'View Details', ctaUrl)
      const text = `${notif.title}\n\n${notif.body}\n\nView in Budgieee: ${ctaUrl}`
      
      const emailResult = await sendEmail({
        to: notif.user_email,
        subject: `Budgieee: ${notif.title}`,
        html,
        text,
      }, dryRun)
      
      if (emailResult.success) {
        result.sent++
        deliveredIds.push(notif.id)
      } else {
        result.errors.push(`Failed to send to ${notif.user_email}: ${emailResult.error}`)
      }
    }
    
    // Mark as delivered
    if (deliveredIds.length > 0 && !dryRun) {
      await supabase.rpc('mark_notifications_delivered', { p_ids: deliveredIds })
    }
    
  } catch (err) {
    result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`)
  }
  
  return result
}

// Process digest notifications (batch normal priority)
export async function processDigestNotifications(dryRun = false): Promise<{
  usersProcessed: number
  emailsSent: number
  errors: string[]
}> {
  const result = { usersProcessed: 0, emailsSent: 0, errors: [] as string[] }
  
  try {
    const supabase = getAdminClient()
    
    // Get pending normal-priority notifications
    const { data: notifications, error } = await supabase
      .rpc('get_pending_notifications', { p_priority: 'normal', p_limit: 500 })
    
    if (error) {
      result.errors.push(`Failed to fetch notifications: ${error.message}`)
      return result
    }
    
    if (!notifications || notifications.length === 0) {
      return result
    }
    
    // Group by user
    const byUser = new Map<string, NotificationEvent[]>()
    for (const notif of notifications as NotificationEvent[]) {
      const existing = byUser.get(notif.user_id) || []
      existing.push(notif)
      byUser.set(notif.user_id, existing)
    }
    
    const allDeliveredIds: string[] = []
    
    for (const [userId, userNotifs] of byUser.entries()) {
      result.usersProcessed++
      
      const userEmail = userNotifs[0].user_email
      const sections: { title: string; items: string[] }[] = []
      const deliveredIds: string[] = []
      
      // Filter by settings and group by type
      const communityItems: string[] = []
      const tripItems: string[] = []
      const budgetItems: string[] = []
      
      for (const notif of userNotifs) {
        if (!shouldSendNotification(notif)) {
          deliveredIds.push(notif.id) // Mark as delivered even if skipped
          continue
        }
        
        deliveredIds.push(notif.id)
        
        switch (notif.type) {
          case 'community_post':
            communityItems.push(notif.title)
            break
          case 'trip_added':
          case 'split_expense':
          case 'split_settle':
            tripItems.push(notif.title)
            break
          case 'budget_alert':
          case 'budget_digest':
            budgetItems.push(notif.title)
            break
        }
      }
      
      // Build sections
      if (communityItems.length > 0) {
        sections.push({ title: '🏷️ Community Deals', items: communityItems })
      }
      if (tripItems.length > 0) {
        sections.push({ title: '✈️ Trips & Splits', items: tripItems })
      }
      if (budgetItems.length > 0) {
        sections.push({ title: '💰 Budget Updates', items: budgetItems })
      }
      
      // Send digest if there's content
      if (sections.length > 0) {
        const html = generateDigestHtml(sections)
        const text = sections.map(s => `${s.title}\n${s.items.map(i => `- ${i}`).join('\n')}`).join('\n\n')
        
        const emailResult = await sendEmail({
          to: userEmail,
          subject: 'Budgieee: Your Daily Digest',
          html,
          text,
        }, dryRun)
        
        if (emailResult.success) {
          result.emailsSent++
          allDeliveredIds.push(...deliveredIds)
        } else {
          result.errors.push(`Failed to send digest to ${userEmail}: ${emailResult.error}`)
        }
      } else {
        // All notifications were skipped due to settings
        allDeliveredIds.push(...deliveredIds)
      }
    }
    
    // Mark as delivered
    if (allDeliveredIds.length > 0 && !dryRun) {
      await supabase.rpc('mark_notifications_delivered', { p_ids: allDeliveredIds })
    }
    
  } catch (err) {
    result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`)
  }
  
  return result
}

// ============================================
// EVENT CREATION HELPERS
// Call these from API routes after relevant actions
// ============================================

export async function createNotificationEvent(
  userId: string,
  type: NotificationEvent['type'],
  title: string,
  body: string,
  url?: string,
  priority: 'high' | 'normal' = 'normal'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    
    const { error } = await supabase.rpc('create_notification_event', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_url: url || null,
      p_priority: priority,
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
