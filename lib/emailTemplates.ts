// ============================================
// EMAIL TEMPLATES FOR BUDGIEEE
// All notification emails with consistent branding
// ============================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Shared email wrapper with consistent branding
function emailWrapper(content: string, footerText: string = "You're receiving this because you have notifications enabled."): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          
          ${content}
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                ${footerText}
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
// 1. GROUP/TRIP INVITE EMAIL
// ============================================
export interface GroupInviteEmailData {
  inviterName: string
  groupName: string
  inviteLink: string
}

export function groupInviteEmail(data: GroupInviteEmailData): { subject: string; html: string; text: string } {
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                You're invited to join a group!
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${data.inviterName}</strong> invited you to join 
                <strong style="color: #5eead4;">${data.groupName}</strong> on Budgieee.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Split expenses easily with friends and keep track of who owes what.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Join Group
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `${data.inviterName} invited you to join ${data.groupName} on Budgieee`,
    html: emailWrapper(content, "You received this invite from a Budgieee user."),
    text: `${data.inviterName} invited you to join ${data.groupName} on Budgieee!\n\nSplit expenses easily with friends and keep track of who owes what.\n\nJoin here: ${data.inviteLink}`,
  }
}

// ============================================
// 2. COMMUNITY POST NOTIFICATION
// ============================================
export interface CommunityPostEmailData {
  authorName: string
  communityName: string
  communityEmoji: string
  postTitle: string
  postPreview: string
  postLink: string
  tag?: string
}

export function communityPostEmail(data: CommunityPostEmailData): { subject: string; html: string; text: string } {
  const tagHtml = data.tag ? `
              <span style="display: inline-block; padding: 4px 10px; background: rgba(96, 165, 250, 0.2); color: #60a5fa; font-size: 12px; font-weight: 500; border-radius: 12px; margin-bottom: 8px;">
                ${data.tag}
              </span>
  ` : ''
  
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                New deal in ${data.communityEmoji} ${data.communityName}
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.08);">
                ${tagHtml}
                <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">
                  ${data.postTitle}
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #94a3b8;">
                  ${data.postPreview}
                </p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                  Posted by ${data.authorName}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${data.postLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Deal
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `${data.communityEmoji} New deal in ${data.communityName}: ${data.postTitle}`,
    html: emailWrapper(content),
    text: `New deal in ${data.communityName}!\n\n${data.postTitle}\n\n${data.postPreview}\n\nPosted by ${data.authorName}\n\nView it here: ${data.postLink}`,
  }
}

// ============================================
// 3. TRIP EXPENSE NOTIFICATION
// ============================================
export interface TripExpenseEmailData {
  payerName: string
  groupName: string
  description: string
  totalAmount: string
  yourShare: string
  expenseLink: string
}

export function tripExpenseEmail(data: TripExpenseEmailData): { subject: string; html: string; text: string } {
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                New expense in ${data.groupName}
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.08);">
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">
                  ${data.description}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <span style="font-size: 14px; color: #94a3b8;">Paid by</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                      <span style="font-size: 14px; color: #f1f5f9;">${data.payerName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <span style="font-size: 14px; color: #94a3b8;">Total</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                      <span style="font-size: 14px; color: #f1f5f9;">${data.totalAmount}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 14px; font-weight: 600; color: #f97316;">Your share</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 16px; font-weight: 600; color: #f97316;">${data.yourShare}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${data.expenseLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Expense
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `${data.payerName} added "${data.description}" - You owe ${data.yourShare}`,
    html: emailWrapper(content),
    text: `New expense in ${data.groupName}!\n\n${data.description}\nPaid by: ${data.payerName}\nTotal: ${data.totalAmount}\nYour share: ${data.yourShare}\n\nView it here: ${data.expenseLink}`,
  }
}

// ============================================
// 4. SETTLEMENT NOTIFICATION
// ============================================
export interface SettlementEmailData {
  settlerName: string
  amount: string
  groupName: string
  settlementLink: string
}

export function settlementEmail(data: SettlementEmailData): { subject: string; html: string; text: string } {
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                You got paid! 💰
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(34, 197, 94, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(34, 197, 94, 0.2); text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #94a3b8;">
                  ${data.settlerName} settled up with you
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #22c55e;">
                  ${data.amount}
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
                  in ${data.groupName}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${data.settlementLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Balance
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `${data.settlerName} paid you ${data.amount}`,
    html: emailWrapper(content),
    text: `${data.settlerName} settled up with you!\n\nAmount: ${data.amount}\nGroup: ${data.groupName}\n\nView your balance: ${data.settlementLink}`,
  }
}

// ============================================
// 5. BUDGET ALERT
// ============================================
export interface BudgetAlertEmailData {
  categoryName: string
  categoryEmoji: string
  spent: string
  budget: string
  percentUsed: number
  budgetLink: string
}

export function budgetAlertEmail(data: BudgetAlertEmailData): { subject: string; html: string; text: string } {
  const isOver = data.percentUsed >= 100
  const alertColor = isOver ? '#ef4444' : '#f97316'
  const alertText = isOver ? 'Over budget!' : 'Almost at limit'
  
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                ${data.categoryEmoji} Budget Alert
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.08);">
                <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #f1f5f9; text-align: center;">
                  ${data.categoryName}
                </p>
                
                <!-- Progress bar -->
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 12px;">
                  <div style="background: ${alertColor}; height: 100%; width: ${Math.min(data.percentUsed, 100)}%; border-radius: 8px;"></div>
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align: left;">
                      <span style="font-size: 13px; color: #94a3b8;">Spent</span>
                      <br>
                      <span style="font-size: 18px; font-weight: 600; color: ${alertColor};">${data.spent}</span>
                    </td>
                    <td style="text-align: center;">
                      <span style="display: inline-block; padding: 4px 12px; background: ${alertColor}20; color: ${alertColor}; font-size: 12px; font-weight: 600; border-radius: 12px;">
                        ${alertText}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 13px; color: #94a3b8;">Budget</span>
                      <br>
                      <span style="font-size: 18px; font-weight: 600; color: #f1f5f9;">${data.budget}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${data.budgetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Budget
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `${data.categoryEmoji} ${data.categoryName}: ${data.percentUsed}% of budget used`,
    html: emailWrapper(content),
    text: `Budget Alert for ${data.categoryName}!\n\nSpent: ${data.spent}\nBudget: ${data.budget}\nUsed: ${data.percentUsed}%\n\nView your budget: ${data.budgetLink}`,
  }
}

// ============================================
// 6. DAILY DIGEST
// ============================================
export interface DigestSection {
  title: string
  emoji: string
  items: { text: string; link?: string }[]
}

export interface DailyDigestEmailData {
  userName: string
  sections: DigestSection[]
}

export function dailyDigestEmail(data: DailyDigestEmailData): { subject: string; html: string; text: string } {
  const sectionsHtml = data.sections.map(section => `
          <tr>
            <td style="padding: 16px 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #5eead4;">
                ${section.emoji} ${section.title}
              </h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.8;">
                ${section.items.map(item => `
                  <li style="margin-bottom: 4px;">
                    ${item.link ? `<a href="${item.link}" style="color: #94a3b8; text-decoration: none;">${item.text}</a>` : item.text}
                  </li>
                `).join('')}
              </ul>
            </td>
          </tr>
  `).join('')
  
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">
                Your Daily Digest
              </h2>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">
                Hi ${data.userName}, here's what happened today
              </p>
            </td>
          </tr>
          
          ${sectionsHtml}
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 24px;">
              <a href="${BASE_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Open Budgieee
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `Your Budgieee Daily Digest`,
    html: emailWrapper(content, "You're receiving this daily digest based on your preferences."),
    text: data.sections.map(s => `${s.emoji} ${s.title}\n${s.items.map(i => `- ${i.text}`).join('\n')}`).join('\n\n'),
  }
}

// ============================================
// 7. WELCOME EMAIL (for new users)
// ============================================
export interface WelcomeEmailData {
  userName: string
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const content = `
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #f1f5f9;">
                Welcome to Budgieee! 🎉
              </h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Hi ${data.userName}! We're excited to have you on board.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Here's what you can do with Budgieee:
              </p>
              
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <p style="margin: 0; font-size: 15px; color: #f1f5f9;">
                  💰 <strong>Life Budget</strong> - Track your spending by category
                </p>
              </div>
              
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <p style="margin: 0; font-size: 15px; color: #f1f5f9;">
                  ✈️ <strong>Trips & Splits</strong> - Split expenses with friends
                </p>
              </div>
              
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px;">
                <p style="margin: 0; font-size: 15px; color: #f1f5f9;">
                  🏷️ <strong>Community Deals</strong> - Share and discover deals
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="${BASE_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Get Started
              </a>
            </td>
          </tr>
  `
  
  return {
    subject: `Welcome to Budgieee, ${data.userName}! 🎉`,
    html: emailWrapper(content, "You're receiving this because you signed up for Budgieee."),
    text: `Welcome to Budgieee, ${data.userName}!\n\nHere's what you can do:\n- 💰 Life Budget - Track your spending by category\n- ✈️ Trips & Splits - Split expenses with friends\n- 🏷️ Community Deals - Share and discover deals\n\nGet started: ${BASE_URL}`,
  }
}
