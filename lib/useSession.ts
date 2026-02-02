'use client'

import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

// ============================================
// useSession Hook
// Manages authentication state across the app
// ============================================

export interface SessionState {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
}

// Check if dev bypass mode is enabled
export const isDevBypassEnabled = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

// Mock user for dev bypass mode
export const DEV_USER: User = {
  id: 'dev-user-id',
  email: 'dev@budgieee.app',
  app_metadata: {},
  user_metadata: { display_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User

export function useSession(): SessionState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If Supabase is not configured or dev bypass is on, use mock user
    if (!isSupabaseConfigured || isDevBypassEnabled) {
      setUser(isDevBypassEnabled ? DEV_USER : null)
      setSession(null)
      setLoading(false)
      return
    }

    // Get initial session — stop waiting after 4s so the app doesn't hang
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setLoading(false)
    }
    const t = setTimeout(finish, 4000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (done) return
        clearTimeout(t)
        setSession(session)
        setUser(session?.user ?? null)
        finish()
      })
      .catch(() => {
        clearTimeout(t)
        finish()
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => {
      done = true
      clearTimeout(t)
      subscription.unsubscribe()
    }
  }, [])

  const isAuthenticated = isDevBypassEnabled || !!user

  return { user, session, loading, isAuthenticated }
}

export default useSession
