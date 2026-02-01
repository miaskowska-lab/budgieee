// ============================================
// Auth Guard
// Helper functions for route protection
// ============================================

import { isDevBypassEnabled } from './useSession'

/**
 * Check if the user should be considered authenticated
 * Returns true if:
 * - Dev bypass mode is enabled (NEXT_PUBLIC_DEV_BYPASS_AUTH=true)
 * - OR a valid user object is provided
 */
export function isUserAuthenticated(user: { id: string } | null): boolean {
  if (isDevBypassEnabled) {
    return true
  }
  return !!user?.id
}

/**
 * Get the redirect path for unauthenticated users
 */
export function getLoginRedirectPath(): string {
  return '/login'
}

/**
 * Get the redirect path after successful login
 */
export function getPostLoginRedirectPath(): string {
  return '/'
}
