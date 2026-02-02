import { NextRequest, NextResponse } from 'next/server'
import { sendGroupInviteEmail } from '@/lib/notifications'

// API route to send invite emails (called from client)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, inviterName, groupName, inviteLink } = body
    
    if (!email || !inviterName || !groupName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://budgieee.com'
    const finalInviteLink = inviteLink || `${appUrl}/trips`
    
    const result = await sendGroupInviteEmail(
      email,
      inviterName,
      groupName,
      finalInviteLink
    )
    
    if (!result.success) {
      console.error('Invite email failed:', result.error)
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
