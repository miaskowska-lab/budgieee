import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a mock client if env vars are missing (for dev without Supabase)
const isMissingConfig = !supabaseUrl || !supabaseAnonKey

export const supabase: SupabaseClient = isMissingConfig
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = !isMissingConfig

// Mock client for development without Supabase
function createMockClient(): SupabaseClient {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
    signInWithOtp: async () => ({ data: {}, error: null }),
  }
  
  return {
    auth: mockAuth,
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as unknown as SupabaseClient
}
