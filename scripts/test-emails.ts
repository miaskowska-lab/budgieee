/**
 * Test script for Budgieee email functionality
 * Run with: npm run test:emails  or  npx tsx scripts/test-emails.ts
 *
 * Tests:
 * 1. Edge Function CORS (OPTIONS)
 * 2. Edge Function invite (POST – expects 401 without user JWT; from app it works with session)
 * 3. Budget alert (Resend)
 * 4. Welcome email (Resend)
 * 5. Community post (Resend)
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local without dotenv dependency
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  }
}

const TEST_EMAIL = 'braydon@uni.minerva.edu'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIF_FROM_EMAIL = process.env.NOTIF_FROM_EMAIL || 'Budgieee <notifications@budgieee.com>'

console.log('='.repeat(60))
console.log('BUDGIEEE EMAIL TEST SUITE')
console.log('='.repeat(60))
console.log(`Test recipient: ${TEST_EMAIL}`)
console.log(`Supabase URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}`)
console.log(`Supabase Anon Key: ${SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`)
console.log(`Resend API Key: ${RESEND_API_KEY ? '✓ Set' : '✗ Missing'}`)
console.log(`From Email: ${NOTIF_FROM_EMAIL}`)
console.log('='.repeat(60))

if (!RESEND_API_KEY) {
  console.error('\n❌ RESEND_API_KEY is not set. Cannot send emails.')
  process.exit(1)
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIF_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error(`  ❌ Failed: ${data.message || response.status}`)
      return false
    }
    
    console.log(`  ✓ Sent! ID: ${data.id}`)
    return true
  } catch (err) {
    console.error(`  ❌ Error: ${err}`)
    return false
  }
}

// Test 1: Edge Function CORS (OPTIONS preflight – must return 204)
async function testEdgeFunctionCors(): Promise<boolean> {
  console.log('\n📧 Test 1: Edge Function CORS (OPTIONS)')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite-email`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    })
    const hasCors = response.headers.get('Access-Control-Allow-Origin') !== null
    if (response.status !== 204 || !hasCors) {
      console.error(`  ❌ Expected 204 + CORS headers, got ${response.status}, CORS: ${hasCors}`)
      return false
    }
    console.log('  ✓ CORS preflight OK (204 + CORS headers)')
    return true
  } catch (err) {
    console.error('  ❌ Error:', err)
    return false
  }
}

// Test 2: Edge Function POST (with anon key → 401 Invalid JWT is expected; from app with user session it works)
async function testEdgeFunctionInvite(): Promise<boolean> {
  console.log('\n📧 Test 2: Edge Function Invite (POST)')
  console.log('  (With anon key expect 401; from app with logged-in user it sends email.)')
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invited_email: TEST_EMAIL,
        inviter_name: 'Budgieee Test',
        group_name: 'Test Trip Group',
      }),
    })
    const data = await response.json()
    // 200 = success (if JWT was valid), 401 = Invalid JWT (expected when using anon key from script)
    if (response.status === 200 && data.success) {
      console.log('  ✓ Edge Function sent email (valid JWT used)')
      return true
    }
    if (response.status === 401) {
      console.log('  ✓ Edge Function reachable; 401 Invalid JWT (expected with anon key – from app with user session it works)')
      return true
    }
    console.error(`  ❌ Unexpected: ${response.status}`, data)
    return false
  } catch (err) {
    console.error('  ❌ Error (could be CORS):', err)
    return false
  }
}

// Test 3: Budget Alert Email (direct via Resend)
async function testBudgetAlertEmail(): Promise<boolean> {
  console.log('\n📧 Test 3: Budget Alert Email (Resend)')
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, sans-serif; background-color: #0a1628;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a1628;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(180deg, #142136 0%, #1a2d4a 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td align="center" style="padding: 32px 24px 8px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #5eead4;">Budgieee</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Your money, smarter.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">🍔 Budget Alert</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.08);">
                <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #f1f5f9; text-align: center;">Food & Dining</p>
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 12px;">
                  <div style="background: #f97316; height: 100%; width: 85%; border-radius: 8px;"></div>
                </div>
                <p style="margin: 0; font-size: 14px; color: #94a3b8; text-align: center;">
                  <strong style="color: #f97316;">$425</strong> of <strong style="color: #f1f5f9;">$500</strong> (85%)
                </p>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center;">
                You're approaching your budget limit for this category.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="http://localhost:3000/budget" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Budget
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this because you have budget alerts enabled.
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
  
  return sendViaResend(TEST_EMAIL, '🍔 Budget Alert: Food & Dining at 85%', html)
}

// Test 4: Welcome Email (direct via Resend)
async function testWelcomeEmail(): Promise<boolean> {
  console.log('\n📧 Test 4: Welcome Email (Resend)')
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, sans-serif; background-color: #0a1628;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a1628;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(180deg, #142136 0%, #1a2d4a 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td align="center" style="padding: 32px 24px 8px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #5eead4;">Budgieee</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Your money, smarter.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">Welcome to Budgieee! 🎉</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Thanks for joining Budgieee! Here's what you can do:
              </p>
              <ul style="margin: 16px 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #94a3b8;">
                <li><strong style="color: #5eead4;">Budget</strong> - Track spending by category</li>
                <li><strong style="color: #5eead4;">Trips & Splits</strong> - Split expenses with friends</li>
                <li><strong style="color: #5eead4;">Community Deals</strong> - Share deals with your community</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="http://localhost:3000" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Get Started
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Questions? Just reply to this email.
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
  
  return sendViaResend(TEST_EMAIL, 'Welcome to Budgieee! 🎉', html)
}

// Test 5: Community Post Notification Email
async function testCommunityPostEmail(): Promise<boolean> {
  console.log('\n📧 Test 5: Community Post (Resend)')
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, sans-serif; background-color: #0a1628;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a1628;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(180deg, #142136 0%, #1a2d4a 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td align="center" style="padding: 32px 24px 8px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #5eead4;">Budgieee</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Your money, smarter.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #f1f5f9;">New Deal in Minerva SF 🌉</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.08);">
                <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">
                  50% off at Trader Joe's this week!
                </p>
                <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                  All frozen meals are half price through Sunday. Great for students!
                </p>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;">
                  Posted by <strong style="color: #60a5fa;">Sarah</strong>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 24px 32px;">
              <a href="http://localhost:3000/community" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                View Deal
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this because you're a member of this community.
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
  
  return sendViaResend(TEST_EMAIL, '🌉 New deal in Minerva SF: 50% off at Trader Joe\'s', html)
}

// Run all tests
async function runTests() {
  const results: { name: string; success: boolean }[] = []

  results.push({ name: 'Edge Function CORS (OPTIONS)', success: await testEdgeFunctionCors() })
  results.push({ name: 'Edge Function Invite (POST)', success: await testEdgeFunctionInvite() })

  await new Promise(r => setTimeout(r, 800))
  results.push({ name: 'Budget Alert (Resend)', success: await testBudgetAlertEmail() })

  await new Promise(r => setTimeout(r, 800))
  results.push({ name: 'Welcome Email (Resend)', success: await testWelcomeEmail() })

  await new Promise(r => setTimeout(r, 800))
  results.push({ name: 'Community Post (Resend)', success: await testCommunityPostEmail() })
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))
  
  let allPassed = true
  for (const r of results) {
    const status = r.success ? '✓ PASS' : '✗ FAIL'
    console.log(`  ${status} - ${r.name}`)
    if (!r.success) allPassed = false
  }
  
  console.log('='.repeat(60))
  console.log(allPassed 
    ? `\n✅ All ${results.length} tests passed! Check ${TEST_EMAIL} for emails.`
    : `\n⚠️  Some tests failed. Check the errors above.`
  )
  console.log('')
}

runTests().catch(console.error)
