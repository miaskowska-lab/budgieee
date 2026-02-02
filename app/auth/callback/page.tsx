'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('error')
      setErrorMsg('Supabase not configured')
      return
    }

    const run = async () => {
      const code = searchParams.get('code')
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const hasHash = hash.includes('access_token') || hash.includes('error')
      // Check for error in hash (e.g. #error=access_denied)
      if (hash.includes('error=')) {
        const errMatch = hash.match(/error=([^&]+)/)
        setStatus('error')
        setErrorMsg(errMatch ? decodeURIComponent(errMatch[1]) : 'Verification failed')
        return
      }

      try {
        // PKCE flow: ?code=... in URL
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setStatus('error')
            setErrorMsg(error.message)
            return
          }
          setStatus('success')
          router.replace('/')
          return
        }

        // Implicit flow: #access_token=... in hash (Supabase client auto-processes on init)
        if (hasHash) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setStatus('success')
            router.replace('/')
            return
          }
          // Give Supabase client a moment to process the hash
          await new Promise(r => setTimeout(r, 500))
          const { data: { session: s2 } } = await supabase.auth.getSession()
          if (s2) {
            setStatus('success')
            router.replace('/')
            return
          }
        }

        // Already logged in?
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus('success')
          router.replace('/')
          return
        }

        // No code/hash and no session – redirect to login
        setStatus('error')
        setErrorMsg('Could not verify email. Please try signing in.')
      } catch (err) {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed')
      }
    }

    run()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#050d18',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}>
        <p style={{ marginBottom: 16, color: '#f87171' }}>{errorMsg}</p>
        <a
          href="/login"
          style={{
            color: '#60a5fa',
            textDecoration: 'underline',
          }}
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#050d18',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ marginTop: 16 }}>Verifying your email...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * Auth callback page – handles Supabase email verification redirects.
 * Supabase redirects here after the user clicks "Verify email" in the confirmation email.
 * Supports both PKCE (?code=...) and implicit (#access_token=...) flows.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#050d18',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p>Verifying...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
