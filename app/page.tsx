'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import NavCard from '@/components/NavCard'
import AuthBox from '@/components/AuthBox'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="container">
        <h1 className="page-title">Budgieee</h1>
        <p className="page-subtitle">Loading...</p>
      </main>
    )
  }

  // Dev bypass: show app without login (set NEXT_PUBLIC_DEV_BYPASS_AUTH=true in .env.local)
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

  // Not logged in - show auth (unless dev bypass)
  if (!user && !devBypass) {
    return (
      <main className="container">
        <h1 className="page-title">Budgieee</h1>
        <p className="page-subtitle">Your finances, simplified</p>
        <AuthBox />
      </main>
    )
  }

  // Logged in (or dev bypass) - show main app
  return (
    <main className="container">
      <h1 className="page-title">Budgieee</h1>
      <p className="page-subtitle">{devBypass ? 'Dev mode' : 'Welcome back'}</p>

      <div className="nav-grid">
        <NavCard
          href="/budget"
          title="Life Budget"
          description="Track and manage your personal finances with ease"
          icon="💰"
        />
        <NavCard
          href="/trips"
          title="Trips & Splits"
          description="Plan trips and split expenses with friends"
          icon="✈️"
        />
        <NavCard
          href="/community"
          title="Community"
          description="Connect with others and share tips"
          icon="👥"
        />
      </div>

      {!devBypass && (
        <button onClick={handleSignOut} className="sign-out-button">
          Sign out
        </button>
      )}
    </main>
  )
}
