import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/notifications'

// Send welcome email to new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    
    const result = await sendWelcomeEmail(email, name || email.split('@')[0])
    
    if (!result.success) {
      console.error('Welcome email failed:', result.error)
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
