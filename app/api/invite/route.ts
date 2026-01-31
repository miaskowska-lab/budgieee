import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAccessToken } from '@/lib/supabaseServer'

// Rate limit: max invites per user per hour
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.substring(7)
    
    // Verify the user
    const user = await verifyAccessToken(accessToken)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired access token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { invited_email, group_id } = body

    // Validate email
    if (!invited_email || typeof invited_email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(invited_email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Prevent self-invite
    if (invited_email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot invite yourself' },
        { status: 400 }
      )
    }

    // Rate limiting: check invites sent in last hour
    const hourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabaseAdmin
      .from('invites')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', user.id)
      .gte('created_at', hourAgo)

    if (countError) {
      console.error('Rate limit check error:', countError)
    } else if (count && count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} invites per hour.` },
        { status: 429 }
      )
    }

    // Check if invite already exists and is pending
    const { data: existingInvite } = await supabaseAdmin
      .from('invites')
      .select('id, status')
      .eq('invited_email', invited_email.toLowerCase())
      .eq('invited_by', user.id)
      .eq('status', 'sent')
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: 'Invite already sent to this email' },
        { status: 400 }
      )
    }

    // Check if user already exists in the system
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', invited_email.toLowerCase())
      .single()

    // Determine redirect URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
      || process.env.VERCEL_URL 
      || 'http://localhost:3000'
    const redirectTo = `${siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`}/trips`

    // If user doesn't exist, send Supabase invite email
    if (!existingUser) {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        invited_email,
        { redirectTo }
      )

      if (inviteError) {
        // If user already invited via Supabase but not in our profiles yet, that's ok
        if (!inviteError.message.includes('already been registered')) {
          console.error('Supabase invite error:', inviteError)
          return NextResponse.json(
            { success: false, error: 'Failed to send invite email' },
            { status: 500 }
          )
        }
      }
    }

    // Create invite record in our database
    const { data: invite, error: insertError } = await supabaseAdmin
      .from('invites')
      .insert({
        invited_email: invited_email.toLowerCase(),
        invited_by: user.id,
        group_id: group_id || null,
        status: existingUser ? 'accepted' : 'sent',
        accepted_user_id: existingUser?.user_id || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert invite error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create invite record' },
        { status: 500 }
      )
    }

    // If user already exists, auto-create friendship and add to group
    if (existingUser) {
      // Create bidirectional friendship
      await supabaseAdmin.from('friendships').upsert([
        { user_id: user.id, friend_user_id: existingUser.user_id, status: 'accepted' },
        { user_id: existingUser.user_id, friend_user_id: user.id, status: 'accepted' },
      ], { onConflict: 'user_id,friend_user_id' })

      // Add to group if specified
      if (group_id) {
        await supabaseAdmin.from('group_members').upsert({
          group_id,
          user_id: existingUser.user_id,
          role: 'member',
        }, { onConflict: 'group_id,user_id' })
      }

      return NextResponse.json({
        success: true,
        message: 'User already exists - added as friend',
        already_registered: true,
        invite_id: invite.id,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
      already_registered: false,
      invite_id: invite.id,
    })

  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
