import { supabase, isSupabaseConfigured } from './supabaseClient'
import { isDevBypassEnabled, DEV_USER } from './useSession'

// ============================================
// Get User
// Retrieves current authenticated user info
// ============================================

export interface CurrentUser {
  id: string
  email: string
  displayName: string | null
}

/**
 * Get the current authenticated user
 * Returns dev user if bypass mode is enabled
 * Returns null if not authenticated
 * 
 * NOTE: For database queries, use this user.id to filter data.
 * When RLS is enabled, the database will use auth.uid() automatically,
 * but threading the user.id ensures the wiring is ready.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Dev bypass mode - return mock user
  if (isDevBypassEnabled) {
    return {
      id: DEV_USER.id,
      email: DEV_USER.email || 'dev@budgieee.app',
      displayName: 'Dev User',
    }
  }

  // Supabase not configured
  if (!isSupabaseConfigured) {
    return null
  }

  // Get real user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.display_name || null,
  }
}

/**
 * Synchronous version for use in hooks (requires user to be passed in)
 */
export function getUserFromSession(user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null): CurrentUser | null {
  if (isDevBypassEnabled) {
    return {
      id: DEV_USER.id,
      email: DEV_USER.email || 'dev@budgieee.app',
      displayName: 'Dev User',
    }
  }

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.display_name || null,
  }
}
