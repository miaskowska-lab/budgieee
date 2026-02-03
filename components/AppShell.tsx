'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/useSession'
import BottomNav, { NavVisibilityProvider } from '@/components/BottomNav'
import { prefetchAllData } from '@/lib/prefetch'

/**
 * App shell: wraps children and conditionally renders BottomNav only when authenticated.
 * Logged-out users see no bottom nav (landing/sign-in only).
 * Also triggers data prefetch after login for instant page loads.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSession()
  const showNav = isAuthenticated && !loading
  const hasPrefetched = useRef(false)

  // Prefetch data after login for instant page loads
  useEffect(() => {
    if (isAuthenticated && !loading && !hasPrefetched.current) {
      hasPrefetched.current = true
      // Delay slightly to not block initial render
      const timer = setTimeout(() => {
        prefetchAllData().catch(console.error)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, loading])

  return (
    <NavVisibilityProvider showNav={showNav}>
      {children}
      {showNav && <BottomNav />}
    </NavVisibilityProvider>
  )
}
