import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
// ONLY use this in server-side code (API routes, server components)
// NEVER expose to client

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - server-side operations will fail')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Helper to verify a user's access token
export async function verifyAccessToken(accessToken: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
  if (error || !user) {
    return null
  }
  return user
}
