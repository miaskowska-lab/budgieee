'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { fetchAllHomeStats } from '@/lib/homeRepo'
import type { User } from '@supabase/supabase-js'

// ============================================
// BUDGIEEE HOME - Main Landing Page
// Dark teal/blue gradient design
// Connected to real Supabase backend
// ============================================

// Avatar color options
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#06b6d4', '#3b82f6',
]

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [panelView, setPanelView] = useState<'account' | 'settings'>('account')
  const [signingOut, setSigningOut] = useState(false)

  // User settings (stored in localStorage)
  const [displayName, setDisplayName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#6366f1')
  const [currency, setCurrency] = useState('USD')
  const [notifications, setNotifications] = useState({
    deals: true,
    splits: true,
    budget: false,
  })

  // Real stats from Supabase
  const [stats, setStats] = useState({
    communityPoints: 0,
    dealsPosted: 0,
    savedDeals: 0,
    tripsNet: 0,
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('budgieee-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        if (parsed.displayName) setDisplayName(parsed.displayName)
        if (parsed.avatarColor) setAvatarColor(parsed.avatarColor)
        if (parsed.currency) setCurrency(parsed.currency)
        if (parsed.notifications) setNotifications(parsed.notifications)
      } catch {}
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = () => {
    const settings = { displayName, avatarColor, currency, notifications }
    localStorage.setItem('budgieee-settings', JSON.stringify(settings))
  }

  // Fetch stats from Supabase
  const loadStats = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return
    
    setStatsLoading(true)
    setStatsError(null)
    
    const result = await fetchAllHomeStats(userId)
    
    setStats({
      communityPoints: result.communityPoints,
      dealsPosted: result.dealsPosted,
      savedDeals: result.savedDeals,
      tripsNet: result.tripsNet,
    })
    setStatsError(result.error)
    setStatsLoading(false)
  }, [])

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Load stats if user is logged in
      if (session?.user) {
        loadStats(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      
      // Load stats when user logs in
      if (session?.user) {
        loadStats(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadStats])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
    setShowUserPanel(false)
  }

  // Dev bypass: show app without login
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' || !isSupabaseConfigured
  const isLoggedIn = user || devBypass

  // Get user initials
  const getUserInitials = () => {
    if (displayName) return displayName.charAt(0).toUpperCase()
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  // Handle opening settings
  const openSettings = () => {
    setPanelView('settings')
  }

  // Handle closing panel
  const closePanel = () => {
    setShowUserPanel(false)
    setPanelView('account')
  }

  // Loading state
  if (loading) {
    return (
      <div className="home-page">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="home-loading">
          <div className="home-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* ============ HEADER ============ */}
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-logo">Budgieee</h1>
          <p className="home-tagline">Your money, smarter.</p>
        </div>
        <div className="home-header-right">
          {/* Points Badge */}
          {isLoggedIn && stats.communityPoints > 0 && (
            <div className="home-points-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {stats.communityPoints}
            </div>
          )}
          <button 
            className="home-avatar-btn"
            onClick={() => setShowUserPanel(true)}
          >
            <div className="home-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}>
              {getUserInitials()}
            </div>
          </button>
        </div>
      </header>

      {/* ============ WELCOME SECTION ============ */}
      <div className="home-welcome">
        <h2 className="home-welcome-title">
          {isLoggedIn ? (devBypass ? 'Dev Mode' : 'Welcome back') : 'Welcome'}
        </h2>
        <p className="home-welcome-text">
          {isLoggedIn 
            ? 'Manage your finances, split expenses, and discover deals.'
            : 'Sign in to access all features.'
          }
        </p>
      </div>

      {/* ============ AUTH BOX (Not logged in) ============ */}
      {!isLoggedIn && (
        <div className="home-auth-section">
          <AuthBox />
        </div>
      )}

      {/* ============ FEATURE CARDS ============ */}
      {isLoggedIn && (
        <div className="home-cards">
          {/* Life Budget */}
          <button className="home-card" onClick={() => router.push('/budget')}>
            <div className="home-card-icon budget">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="home-card-content">
              <h3 className="home-card-title">Life Budget</h3>
              <p className="home-card-desc">Track and manage your personal finances</p>
            </div>
            <div className="home-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>

          {/* Trips & Splits */}
          <button className="home-card" onClick={() => router.push('/trips')}>
            <div className="home-card-icon trips">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="home-card-content">
              <h3 className="home-card-title">Trips & Splits</h3>
              <p className="home-card-desc">Split expenses with friends</p>
            </div>
            <div className="home-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>

          {/* Community Deals */}
          <button className="home-card" onClick={() => router.push('/community')}>
            <div className="home-card-icon community">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="home-card-content">
              <h3 className="home-card-title">Community Deals</h3>
              <p className="home-card-desc">Share & discover savings</p>
            </div>
            <div className="home-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* ============ BOTTOM NAV ============ */}
      <nav className="home-bottom-nav">
        <button className="home-nav-item" onClick={() => router.push('/budget')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span>Budget</span>
        </button>

        <button className="home-nav-item active home-nav-center" onClick={() => {}}>
          <div className="home-nav-center-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span>Home</span>
        </button>

        <button className="home-nav-item" onClick={() => router.push('/trips')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Trips</span>
        </button>

        <button className="home-nav-item" onClick={() => router.push('/community')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Deals</span>
        </button>
      </nav>

      {/* ============ USER PANEL OVERLAY ============ */}
      {showUserPanel && (
        <>
          <div className="home-panel-overlay" onClick={closePanel} />
          <div className="home-user-panel">
            {/* ============ ACCOUNT VIEW ============ */}
            {panelView === 'account' && (
              <>
                <div className="home-panel-header">
                  <h2>My Account</h2>
                  <button className="home-panel-close" onClick={closePanel}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="home-panel-user">
                  <div className="home-panel-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}>
                    {getUserInitials()}
                  </div>
                  <div className="home-panel-user-info">
                    {displayName && <span className="home-panel-name">{displayName}</span>}
                    <span className="home-panel-email">
                      {user?.email || (devBypass ? 'dev@budgieee.app' : 'Not logged in')}
                    </span>
                    {devBypass && !user && (
                      <span className="home-panel-badge">Dev Mode</span>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="home-panel-stats-header">
                  <span>Your Stats</span>
                  <button 
                    className="home-panel-refresh"
                    onClick={() => user && loadStats(user.id)}
                    disabled={statsLoading}
                    title="Refresh stats"
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      className={statsLoading ? 'spinning' : ''}
                    >
                      <path d="M23 4v6h-6M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
                </div>
                {statsError && (
                  <div className="home-panel-stats-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {statsError}
                  </div>
                )}
                <div className="home-panel-stats">
                  <div className="home-panel-stat">
                    <span className={`home-panel-stat-value ${stats.tripsNet >= 0 ? 'positive' : 'negative'}`}>
                      {statsLoading ? '—' : `${stats.tripsNet >= 0 ? '+' : ''}$${Math.abs(stats.tripsNet).toFixed(0)}`}
                    </span>
                    <span className="home-panel-stat-label">Net from splits</span>
                  </div>
                  <div className="home-panel-stat">
                    <span className="home-panel-stat-value">
                      {statsLoading ? '—' : stats.dealsPosted}
                    </span>
                    <span className="home-panel-stat-label">Deals posted</span>
                  </div>
                  <div className="home-panel-stat">
                    <span className="home-panel-stat-value gold">
                      {statsLoading ? '—' : stats.communityPoints}
                    </span>
                    <span className="home-panel-stat-label">Community pts</span>
                  </div>
                  <div className="home-panel-stat">
                    <span className="home-panel-stat-value">
                      {statsLoading ? '—' : stats.savedDeals}
                    </span>
                    <span className="home-panel-stat-label">Saved deals</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="home-panel-actions">
                  <button className="home-panel-btn" onClick={openSettings}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
                  </button>
                  {(user || !devBypass) && (
                    <button 
                      className="home-panel-btn signout"
                      onClick={handleSignOut}
                      disabled={signingOut}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      {signingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ============ SETTINGS VIEW ============ */}
            {panelView === 'settings' && (
              <>
                <div className="home-panel-header">
                  <button className="home-panel-back" onClick={() => setPanelView('account')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <h2>Settings</h2>
                  <button className="home-panel-close" onClick={closePanel}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className="home-settings-content">
                  {/* Profile Section */}
                  <div className="home-settings-section">
                    <h3 className="home-settings-title">Profile</h3>
                    
                    <div className="home-settings-field">
                      <label>Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={saveSettings}
                        placeholder="Enter your name"
                        className="home-settings-input"
                      />
                    </div>

                    <div className="home-settings-field">
                      <label>Avatar Color</label>
                      <div className="home-settings-colors">
                        {AVATAR_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`home-settings-color ${avatarColor === color ? 'active' : ''}`}
                            style={{ background: color }}
                            onClick={() => {
                              setAvatarColor(color)
                              setTimeout(saveSettings, 0)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preferences Section */}
                  <div className="home-settings-section">
                    <h3 className="home-settings-title">Preferences</h3>
                    
                    <div className="home-settings-field">
                      <label>Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => {
                          setCurrency(e.target.value)
                          setTimeout(saveSettings, 0)
                        }}
                        className="home-settings-select"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="ARS">ARS ($)</option>
                      </select>
                    </div>
                  </div>

                  {/* Notifications Section */}
                  <div className="home-settings-section">
                    <h3 className="home-settings-title">Notifications</h3>
                    
                    <div className="home-settings-toggle-list">
                      <label className="home-settings-toggle">
                        <span>Community deals</span>
                        <input
                          type="checkbox"
                          checked={notifications.deals}
                          onChange={(e) => {
                            setNotifications(prev => ({ ...prev, deals: e.target.checked }))
                            setTimeout(saveSettings, 0)
                          }}
                        />
                        <span className="home-toggle-switch" />
                      </label>

                      <label className="home-settings-toggle">
                        <span>Trip & split updates</span>
                        <input
                          type="checkbox"
                          checked={notifications.splits}
                          onChange={(e) => {
                            setNotifications(prev => ({ ...prev, splits: e.target.checked }))
                            setTimeout(saveSettings, 0)
                          }}
                        />
                        <span className="home-toggle-switch" />
                      </label>

                      <label className="home-settings-toggle">
                        <span>Budget reminders</span>
                        <input
                          type="checkbox"
                          checked={notifications.budget}
                          onChange={(e) => {
                            setNotifications(prev => ({ ...prev, budget: e.target.checked }))
                            setTimeout(saveSettings, 0)
                          }}
                        />
                        <span className="home-toggle-switch" />
                      </label>
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="home-settings-section">
                    <h3 className="home-settings-title">About</h3>
                    <div className="home-settings-about">
                      <div className="home-about-row">
                        <span>Version</span>
                        <span className="home-about-value">1.0.0</span>
                      </div>
                      <div className="home-about-row">
                        <span>Built with</span>
                        <span className="home-about-value">Next.js + Supabase</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============ Auth Box Component (inline for simplicity) ============
function AuthBox() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleLogin} className="home-auth-box">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="home-auth-input"
        disabled={loading}
      />
      <button type="submit" className="home-auth-btn" disabled={loading || !email.trim()}>
        {loading ? 'Sending...' : 'Sign in with Email'}
      </button>
      {message && <p className="home-auth-message">{message}</p>}
    </form>
  )
}

// ============ Styles ============
const styles = `
  .home-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 15%, #142136 35%, #1a2d4a 50%, #142136 65%, #0a1628 85%, #050d18 100%);
    color: #e2e8f0;
    padding-bottom: 100px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ============ LOADING ============ */
  .home-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    color: #64748b;
  }
  .home-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: home-spin 0.8s linear infinite;
  }
  @keyframes home-spin { to { transform: rotate(360deg); } }

  /* ============ HEADER ============ */
  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
  }
  .home-header-left { display: flex; flex-direction: column; gap: 2px; }
  .home-logo {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
    background: linear-gradient(135deg, #60a5fa, #34d399);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .home-tagline {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
  }
  .home-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .home-points-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 20px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fbbf24;
  }
  .home-avatar-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .home-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    color: white;
    border: 2px solid rgba(255,255,255,0.1);
    transition: all 0.2s;
  }
  .home-avatar-btn:hover .home-avatar {
    border-color: rgba(255,255,255,0.3);
    transform: scale(1.05);
  }

  /* ============ WELCOME ============ */
  .home-welcome {
    padding: 8px 24px 24px;
    text-align: center;
  }
  .home-welcome-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 8px 0;
  }
  .home-welcome-text {
    font-size: 0.9375rem;
    color: #94a3b8;
    margin: 0;
    max-width: 320px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* ============ AUTH SECTION ============ */
  .home-auth-section {
    padding: 0 24px;
    max-width: 400px;
    margin: 0 auto;
  }
  .home-auth-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .home-auth-input {
    padding: 14px 18px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }
  .home-auth-input:focus {
    border-color: #3b82f6;
    background: rgba(255,255,255,0.08);
  }
  .home-auth-input::placeholder { color: #64748b; }
  .home-auth-btn {
    padding: 14px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .home-auth-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
  }
  .home-auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .home-auth-message {
    font-size: 0.875rem;
    color: #60a5fa;
    text-align: center;
    margin: 8px 0 0 0;
  }

  /* ============ FEATURE CARDS ============ */
  .home-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 20px;
    max-width: 500px;
    margin: 0 auto;
  }
  .home-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }
  .home-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }
  .home-card:active { transform: translateY(0); }
  .home-card-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .home-card-icon.budget {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
    color: #34d399;
  }
  .home-card-icon.trips {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
    color: #60a5fa;
  }
  .home-card-icon.community {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
    color: #fbbf24;
  }
  .home-card-content { flex: 1; min-width: 0; }
  .home-card-title {
    font-size: 1.0625rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 4px 0;
  }
  .home-card-desc {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
  }
  .home-card-arrow {
    color: #475569;
    flex-shrink: 0;
  }
  .home-card:hover .home-card-arrow { color: #94a3b8; }

  /* ============ BOTTOM NAV ============ */
  .home-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    padding: 12px 16px 20px;
    background: linear-gradient(180deg, rgba(10, 22, 40, 0.95), rgba(5, 13, 24, 0.98));
    border-top: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    z-index: 100;
  }
  .home-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.6875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .home-nav-item:hover { color: #94a3b8; }
  .home-nav-item.active { color: #34d399; }
  .home-nav-center {
    margin-top: -20px;
  }
  .home-nav-center-icon {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    border: 3px solid rgba(10, 22, 40, 0.8);
  }
  .home-nav-item.active.home-nav-center .home-nav-center-icon {
    box-shadow: 0 4px 24px rgba(16, 185, 129, 0.5);
  }

  /* ============ USER PANEL ============ */
  .home-panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 200;
    animation: home-fade-in 0.2s ease-out;
  }
  @keyframes home-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .home-user-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    max-width: 360px;
    height: 100%;
    background: linear-gradient(180deg, #0d1a2d 0%, #0a1628 100%);
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 201;
    overflow-y: auto;
    animation: home-slide-in 0.25s ease-out;
  }
  @keyframes home-slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .home-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .home-panel-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }
  .home-panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
  }
  .home-panel-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

  /* User Info */
  .home-panel-user {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 24px;
  }
  .home-panel-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.25rem;
    color: white;
    flex-shrink: 0;
  }
  .home-panel-user-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .home-panel-email {
    font-size: 0.9375rem;
    color: #e2e8f0;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .home-panel-badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(59, 130, 246, 0.15);
    border-radius: 6px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #60a5fa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: fit-content;
  }

  /* Stats Header */
  .home-panel-stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .home-panel-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }
  .home-panel-refresh:hover { background: rgba(255,255,255,0.1); color: #94a3b8; }
  .home-panel-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
  .home-panel-refresh svg.spinning {
    animation: home-spin 1s linear infinite;
  }
  .home-panel-stats-error {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 24px 12px;
    padding: 10px 14px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    font-size: 0.8125rem;
    color: #f87171;
  }

  /* Stats */
  .home-panel-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 24px 24px;
  }
  .home-panel-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
  }
  .home-panel-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #e2e8f0;
  }
  .home-panel-stat-value.positive { color: #34d399; }
  .home-panel-stat-value.negative { color: #f87171; }
  .home-panel-stat-value.gold { color: #fbbf24; }
  .home-panel-stat-label {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Actions */
  .home-panel-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 24px 24px;
  }
  .home-panel-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 20px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .home-panel-btn:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.15);
  }
  .home-panel-btn.signout {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  .home-panel-btn.signout:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
  .home-panel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Panel Name */
  .home-panel-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  /* Panel Back Button */
  .home-panel-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    margin-right: 12px;
  }
  .home-panel-back:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

  /* ============ SETTINGS ============ */
  .home-settings-content {
    padding: 8px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .home-settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .home-settings-title {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }
  .home-settings-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .home-settings-field label {
    font-size: 0.8125rem;
    color: #94a3b8;
  }
  .home-settings-input {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    outline: none;
    transition: all 0.2s;
  }
  .home-settings-input:focus {
    border-color: #3b82f6;
    background: rgba(255,255,255,0.06);
  }
  .home-settings-input::placeholder { color: #475569; }
  .home-settings-select {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 0.9375rem;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }
  .home-settings-select:focus { border-color: #3b82f6; }
  .home-settings-select option { background: #0d1a2d; color: #e2e8f0; }

  /* Avatar Colors */
  .home-settings-colors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .home-settings-color {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }
  .home-settings-color:hover { transform: scale(1.1); }
  .home-settings-color.active {
    border-color: white;
    box-shadow: 0 0 12px rgba(255,255,255,0.3);
  }

  /* Toggle Switches */
  .home-settings-toggle-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .home-settings-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    cursor: pointer;
  }
  .home-settings-toggle span:first-child {
    font-size: 0.9375rem;
    color: #e2e8f0;
  }
  .home-settings-toggle input { display: none; }
  .home-toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.15);
    border-radius: 12px;
    transition: all 0.2s;
  }
  .home-toggle-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .home-settings-toggle input:checked + .home-toggle-switch {
    background: #10b981;
  }
  .home-settings-toggle input:checked + .home-toggle-switch::after {
    left: 22px;
  }

  /* About Section */
  .home-settings-about {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .home-about-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    font-size: 0.875rem;
  }
  .home-about-row span:first-child { color: #94a3b8; }
  .home-about-value { color: #e2e8f0; }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 380px) {
    .home-header { padding: 16px 20px 12px; }
    .home-logo { font-size: 1.5rem; }
    .home-cards { padding: 0 16px; }
    .home-card { padding: 14px 16px; }
    .home-card-icon { width: 48px; height: 48px; }
  }
`
