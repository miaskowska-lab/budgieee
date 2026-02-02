import { createClient } from '@supabase/supabase-js'
import {
  groupInviteEmail,
  communityPostEmail,
  tripExpenseEmail,
  settlementEmail,
  budgetAlertEmail,
  dailyDigestEmail,
  welcomeEmail,
  type GroupInviteEmailData,
  type CommunityPostEmailData,
  type TripExpenseEmailData,
  type SettlementEmailData,
  type BudgetAlertEmailData,
  type DailyDigestEmailData,
  type WelcomeEmailData,
} from './emailTemplates'

// ============================================
// NOTIFICATION SYSTEM
// Email notifications for Budgieee
// Respects user preferences except for:
// - Group invites (always send)
// - Welcome emails (always send)
// ============================================

// Types
export type NotificationType = 
  | 'community_post' 
  | 'trip_added' 
  | 'split_expense' 
  | 'split_settle' 
  | 'budget_alert' 
  | 'budget_digest'
  | 'group_invite'  // Always sends
  | 'welcome'       // Always sends

export interface NotificationEvent {
  id: string
  user_id: string
  user_email: string
  type: NotificationType
  title: string
  body: string
  url: string | null
  priority: 'high' | 'normal'
  created_at: string
  notif_community: boolean
  notif_trips: boolean
  notif_budget: boolean
  // Extra data for rich emails
  metadata?: Record<string, any>
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

// Types that ALWAYS send regardless of user preferences
const ALWAYS_SEND_TYPES: NotificationType[] = ['group_invite', 'welcome']

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
            <td align="center" style="padding: 32px 24px 8px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #5eead4; letter-spacing: -0.5px;">
                Budgieee
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">
                Your money, smarter.
              </p>
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
            <td align="center" style="padding: 32px 24px 8px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #5eead4; letter-spacing: -0.5px;">
                Budgieee
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">
                Your money, smarter.
              </p>
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
  // Group invites and welcome emails ALWAYS send
  if (ALWAYS_SEND_TYPES.includes(event.type)) {
    return true
  }
  
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

// Generate rich email from notification event using templates
function generateEmailFromEvent(event: NotificationEvent): EmailPayload {
  const metadata = event.metadata || {}
  
  switch (event.type) {
    case 'group_invite':
      const inviteData: GroupInviteEmailData = {
        inviterName: metadata.inviterName || 'Someone',
        groupName: metadata.groupName || 'a group',
        inviteLink: metadata.inviteLink || (event.url ? `${BASE_URL}${event.url}` : BASE_URL),
      }
      const inviteEmail = groupInviteEmail(inviteData)
      return { to: event.user_email, ...inviteEmail }
      
    case 'community_post':
      const postData: CommunityPostEmailData = {
        authorName: metadata.authorName || 'Someone',
        communityName: metadata.communityName || 'a community',
        communityEmoji: metadata.communityEmoji || '🏷️',
        postTitle: metadata.postTitle || event.title,
        postPreview: metadata.postPreview || event.body,
        postLink: event.url ? `${BASE_URL}${event.url}` : BASE_URL,
        tag: metadata.tag,
      }
      const postEmail = communityPostEmail(postData)
      return { to: event.user_email, ...postEmail }
      
    case 'split_expense':
    case 'trip_added':
      const expenseData: TripExpenseEmailData = {
        payerName: metadata.payerName || 'Someone',
        groupName: metadata.groupName || 'a group',
        description: metadata.description || event.title,
        totalAmount: metadata.totalAmount || '$0.00',
        yourShare: metadata.yourShare || '$0.00',
        expenseLink: event.url ? `${BASE_URL}${event.url}` : BASE_URL,
      }
      const expenseEmail = tripExpenseEmail(expenseData)
      return { to: event.user_email, ...expenseEmail }
      
    case 'split_settle':
      const settleData: SettlementEmailData = {
        settlerName: metadata.settlerName || 'Someone',
        amount: metadata.amount || '$0.00',
        groupName: metadata.groupName || 'a group',
        settlementLink: event.url ? `${BASE_URL}${event.url}` : BASE_URL,
      }
      const settleEmail = settlementEmail(settleData)
      return { to: event.user_email, ...settleEmail }
      
    case 'budget_alert':
      const budgetData: BudgetAlertEmailData = {
        categoryName: metadata.categoryName || 'a category',
        categoryEmoji: metadata.categoryEmoji || '💰',
        spent: metadata.spent || '$0',
        budget: metadata.budget || '$0',
        percentUsed: metadata.percentUsed || 0,
        budgetLink: event.url ? `${BASE_URL}${event.url}` : `${BASE_URL}/budget`,
      }
      const budgetEmail = budgetAlertEmail(budgetData)
      return { to: event.user_email, ...budgetEmail }
      
    case 'welcome':
      const welcomeData: WelcomeEmailData = {
        userName: metadata.userName || event.user_email.split('@')[0],
      }
      const welcomeEmailContent = welcomeEmail(welcomeData)
      return { to: event.user_email, ...welcomeEmailContent }
      
    default:
      // Fallback to simple email
      const ctaUrl = event.url ? `${BASE_URL}${event.url}` : BASE_URL
      const html = generateEmailHtml(event.title, event.body, 'View Details', ctaUrl)
      const text = `${event.title}\n\n${event.body}\n\nView in Budgieee: ${ctaUrl}`
      return {
        to: event.user_email,
        subject: `Budgieee: ${event.title}`,
        html,
        text,
      }
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
      
      // Check user settings (group_invite and welcome always send)
      if (!shouldSendNotification(notif)) {
        result.skipped++
        deliveredIds.push(notif.id) // Mark as delivered even if skipped
        continue
      }
      
      // Generate rich email using templates
      const emailPayload = generateEmailFromEvent(notif)
      
      const emailResult = await sendEmail(emailPayload, dryRun)
      
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
    
    for (const [userId, userNotifs] of Array.from(byUser.entries())) {
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
  type: NotificationType,
  title: string,
  body: string,
  url?: string,
  priority: 'high' | 'normal' = 'normal',
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    
    // Insert directly into notification_events table
    const { error } = await supabase
      .from('notification_events')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        url: url || null,
        priority,
        // Store metadata as JSON in the body or a separate column if needed
      })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS FOR REAL EVENTS
// Call these from your app when events happen
// ============================================

/**
 * Send a group invite email (ALWAYS sends, ignores preferences)
 */
export async function sendGroupInviteEmail(
  recipientEmail: string,
  inviterName: string,
  groupName: string,
  inviteLink: string
): Promise<{ success: boolean; error?: string }> {
  const { groupInviteEmail } = await import('./emailTemplates')
  const email = groupInviteEmail({ inviterName, groupName, inviteLink })
  
  return sendEmail({
    to: recipientEmail,
    ...email,
  })
}

/**
 * Send a welcome email to new user (ALWAYS sends)
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const { welcomeEmail } = await import('./emailTemplates')
  const email = welcomeEmail({ userName })
  
  return sendEmail({
    to: userEmail,
    ...email,
  })
}

/**
 * Notify community members about a new post
 * Respects user notification preferences
 */
export async function notifyCommunityPost(
  authorId: string,
  authorName: string,
  communityId: string,
  communityName: string,
  communityEmoji: string,
  postId: string,
  postTitle: string,
  postPreview: string,
  tag?: string
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const result = { sent: 0, skipped: 0, errors: [] as string[] }
  
  try {
    const supabase = getAdminClient()
    
    // Get all community members except the author
    const { data: members, error: membersError } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .neq('user_id', authorId)
    
    if (membersError || !members) {
      result.errors.push(membersError?.message || 'Failed to fetch members')
      return result
    }
    
    // Get user emails and settings
    for (const member of members) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('notif_community')
        .eq('user_id', member.user_id)
        .single()
      
      // Check if notifications are enabled (default true if no settings)
      if (settings?.notif_community === false) {
        result.skipped++
        continue
      }
      
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
      if (!userData?.user?.email) continue
      
      // Create notification event for the cron to process
      await createNotificationEvent(
        member.user_id,
        'community_post',
        postTitle,
        postPreview,
        `/community?post=${postId}`,
        'normal'
      )
      
      result.sent++
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }
  
  return result
}

/**
 * Notify participants about a new expense
 * Respects user notification preferences
 */
export async function notifyExpenseAdded(
  payerId: string,
  payerName: string,
  groupId: string,
  groupName: string,
  expenseId: string,
  description: string,
  totalAmount: number,
  splits: { userId: string; share: number }[]
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const result = { sent: 0, skipped: 0, errors: [] as string[] }
  
  try {
    const supabase = getAdminClient()
    
    // Notify each participant except the payer
    for (const split of splits) {
      if (split.userId === payerId) continue
      
      // Check user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('notif_trips')
        .eq('user_id', split.userId)
        .single()
      
      if (settings?.notif_trips === false) {
        result.skipped++
        continue
      }
      
      // Create notification event
      await createNotificationEvent(
        split.userId,
        'split_expense',
        `${payerName} added "${description}"`,
        `You owe $${split.share.toFixed(2)} for ${description}`,
        `/trips?group=${groupId}`,
        'high'
      )
      
      result.sent++
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }
  
  return result
}

/**
 * Notify user about budget threshold
 * Respects user notification preferences
 */
export async function notifyBudgetAlert(
  userId: string,
  categoryName: string,
  categoryEmoji: string,
  spent: number,
  budget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    
    // Check user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('notif_budget, last_budget_alert_at')
      .eq('user_id', userId)
      .single()
    
    // Check if budget notifications are enabled
    if (settings?.notif_budget === false) {
      return { success: true } // Silently skip
    }
    
    // Check 48-hour cooldown
    if (settings?.last_budget_alert_at) {
      const lastAlert = new Date(settings.last_budget_alert_at)
      const hoursSinceLastAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastAlert < 48) {
        return { success: true } // Skip due to cooldown
      }
    }
    
    const percentUsed = Math.round((spent / budget) * 100)
    
    // Create notification event
    await createNotificationEvent(
      userId,
      'budget_alert',
      `${categoryEmoji} ${categoryName}: ${percentUsed}% used`,
      `You've spent $${spent.toFixed(0)} of your $${budget.toFixed(0)} budget`,
      '/budget',
      'normal'
    )
    
    // Update last alert timestamp
    await supabase
      .from('user_settings')
      .update({ last_budget_alert_at: new Date().toISOString() })
      .eq('user_id', userId)
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
