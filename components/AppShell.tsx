'use client'

import { useSession } from '@/lib/useSession'
import BottomNav, { NavVisibilityProvider } from '@/components/BottomNav'

/**
 * App shell: wraps children and conditionally renders BottomNav only when authenticated.
 * Logged-out users see no bottom nav (landing/sign-in only).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSession()
  const showNav = isAuthenticated && !loading

  return (
    <NavVisibilityProvider showNav={showNav}>
      {children}
      {showNav && <BottomNav />}
    </NavVisibilityProvider>
  )
}
