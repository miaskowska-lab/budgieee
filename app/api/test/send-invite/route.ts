import { NextRequest, NextResponse } from 'next/server'
import {
  groupInviteEmail,
  communityPostEmail,
  tripExpenseEmail,
  settlementEmail,
  budgetAlertEmail,
  welcomeEmail,
} from '@/lib/emailTemplates'

// Test endpoint to send different email types
// Usage: /api/test/send-invite?type=invite|community|expense|settlement|budget|welcome
export async function GET(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  
  const testEmail = request.nextUrl.searchParams.get('email') || 'miaskowska@uni.minerva.edu'
  const emailType = request.nextUrl.searchParams.get('type') || 'invite'
  
  let emailData: { subject: string; html: string; text: string }
  
  switch (emailType) {
    case 'invite':
      emailData = groupInviteEmail({
        inviterName: 'Alex Chen',
        groupName: 'Buenos Aires Trip 🇦🇷',
        inviteLink: 'http://localhost:3000/trips?invite=test123',
      })
      break
      
    case 'community':
      emailData = communityPostEmail({
        authorName: 'Maria S.',
        communityName: 'Buenos Aires',
        communityEmoji: '🇦🇷',
        postTitle: '50% off at La Cabrera steakhouse!',
        postPreview: 'Just found out they have a student discount - show your Minerva ID and get 50% off any main course. Valid until end of month!',
        postLink: 'http://localhost:3000/community?post=abc123',
        tag: 'FOOD',
      })
      break
      
    case 'expense':
      emailData = tripExpenseEmail({
        payerName: 'Alex Chen',
        groupName: 'Buenos Aires Trip',
        description: 'Dinner at La Cabrera',
        totalAmount: '$120.00',
        yourShare: '$40.00',
        expenseLink: 'http://localhost:3000/trips?group=abc123',
      })
      break
      
    case 'settlement':
      emailData = settlementEmail({
        settlerName: 'Alex Chen',
        amount: '$45.50',
        groupName: 'Buenos Aires Trip',
        settlementLink: 'http://localhost:3000/trips?group=abc123',
      })
      break
      
    case 'budget':
      emailData = budgetAlertEmail({
        categoryName: 'Food & Dining',
        categoryEmoji: '🍕',
        spent: '$450',
        budget: '$500',
        percentUsed: 90,
        budgetLink: 'http://localhost:3000/budget',
      })
      break
      
    case 'welcome':
      emailData = welcomeEmail({
        userName: 'Marta',
      })
      break
      
    default:
      return NextResponse.json({ 
        error: 'Invalid type. Use: invite, community, expense, settlement, budget, or welcome',
        availableTypes: ['invite', 'community', 'expense', 'settlement', 'budget', 'welcome'],
      }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIF_FROM_EMAIL || 'Budgieee <notifications@budgieee.com>',
        to: testEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Failed to send email',
        details: data 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      type: emailType,
      subject: emailData.subject,
      message: `Test ${emailType} email sent to ${testEmail}`,
      emailId: data.id 
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
