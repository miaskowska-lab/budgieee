'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useSession, isDevBypassEnabled } from '@/lib/useSession'

// ============================================
// Login Page
// Email + Password Authentication
// ============================================

type AuthMode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading: sessionLoading } = useSession()
  
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, sessionLoading, router])

  // If dev bypass is enabled, redirect immediately
  useEffect(() => {
    if (isDevBypassEnabled) {
      router.push('/')
    }
  }, [router])

  const resetForm = () => {
    setError(null)
    setMessage(null)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    resetForm()

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set environment variables.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Success - redirect to home
    router.push('/')
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    resetForm()

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set environment variables.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Send welcome email (fire and forget - don't block on this)
    if (data?.user?.email) {
      fetch('/api/notifications/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.user.email,
          name: data.user.email.split('@')[0],
        }),
      }).catch(console.error)
    }

    setMessage('Check your email to confirm your account, then sign in.')
    setMode('signin')
    setPassword('')
    setConfirmPassword('')
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    resetForm()

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set environment variables.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Check your email for a password reset link.')
    setLoading(false)
  }

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    resetForm()

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Confirmation email sent. Check your inbox (and spam).')
    setLoading(false)
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    resetForm()
    setPassword('')
    setConfirmPassword('')
  }

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <div className="login-page">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="login-loading">
          <div className="login-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <h1>Budgieee</h1>
          <p>Budgeting and finances, minus the boring.</p>
        </div>

        {/* Auth Card */}
        <div className="login-card">
          <h2 className="login-title">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>

          {/* Messages */}
          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-success">{message}</div>}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="login-form">
              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="login-field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                className="login-link"
                onClick={handleResendConfirmation}
                disabled={loading || !email.trim()}
              >
                Didn&apos;t receive the confirmation email? Resend
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="login-form">
              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="login-field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div className="login-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="login-form">
              <p className="login-hint">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* Mode Switches */}
          <div className="login-switches">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode('signup')}
                >
                  Don't have an account? <strong>Sign up</strong>
                </button>
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                className="login-link"
                onClick={() => switchMode('signin')}
              >
                Already have an account? <strong>Sign in</strong>
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                className="login-link"
                onClick={() => switchMode('signin')}
              >
                Back to <strong>Sign in</strong>
              </button>
            )}
          </div>
        </div>

        {/* Dev mode notice */}
        {!isSupabaseConfigured && (
          <div className="login-notice">
            <p>
              <strong>Note:</strong> Supabase is not configured. 
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 
              in your <code>.env.local</code> file.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = `
  .login-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 30%, #142136 50%, #0a1628 70%, #050d18 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .login-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #64748b;
  }

  .login-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .login-container {
    width: 100%;
    max-width: 400px;
  }

  .login-logo {
    text-align: center;
    margin-bottom: 32px;
  }

  .login-logo h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    background: linear-gradient(135deg, #60a5fa, #34d399);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .login-logo p {
    font-size: 1rem;
    color: #64748b;
    margin: 0;
  }

  .login-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 32px;
  }

  .login-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 24px 0;
    text-align: center;
  }

  .login-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 0.875rem;
    color: #f87171;
  }

  .login-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 0.875rem;
    color: #4ade80;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .login-hint {
    font-size: 0.875rem;
    color: #94a3b8;
    margin: 0 0 8px 0;
    line-height: 1.5;
  }

  .login-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .login-field label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .login-field input {
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }

  .login-field input:focus {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .login-field input::placeholder {
    color: #475569;
  }

  .login-field input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-btn {
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .login-btn.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
  }

  .login-btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .login-switches {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .login-link {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0;
    text-align: center;
  }

  .login-link:hover {
    color: #e2e8f0;
  }

  .login-link strong {
    color: #60a5fa;
  }

  .login-notice {
    margin-top: 24px;
    padding: 16px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 12px;
    font-size: 0.8125rem;
    color: #fbbf24;
    line-height: 1.5;
  }

  .login-notice code {
    background: rgba(255,255,255,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
  }
`
