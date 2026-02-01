'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, isDevBypassEnabled } from '@/lib/useSession'
import { isUserAuthenticated, getLoginRedirectPath } from '@/lib/authGuard'
import { useNavVisibility } from '@/components/BottomNav'

// ============================================
// STUB BACKEND - Works without Supabase
// All data is stored in local state (memory)
// Easy to swap for real API later
// ============================================

// ============ Types ============
interface Profile {
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

interface Friend extends Profile {
  friendship_id: string
  status: 'pending' | 'accepted'
  pending?: boolean
  invitedAt?: Date
}

interface Group {
  id: string
  name: string
  emoji: string
  owner_id: string
  members: GroupMember[]
}

interface GroupMember {
  user_id: string
  role: 'owner' | 'member'
  profile: Profile
}

type SplitMode = 'equal' | 'exact' | 'percent'

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  paid_by: string
  group_id: string | null
  created_by: string
  created_at: string
  split_mode: SplitMode
  split_meta: {
    mode: SplitMode
    participants: string[]
    values?: number[]
    percentages?: number[]
  } | null
  splits: ExpenseSplit[]
}

interface ExpenseSplit {
  id: string
  user_id: string
  share: number
}

interface PendingInvite {
  id: string
  invited_email: string
  group_id: string | null
  status: string
  created_at: string
}

// ============ Utility Functions ============
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount))
}

function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(id: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4']
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ============================================
// DEV MODE USER - Used when Supabase not configured
// New users start BLANK - no fake friends/groups/expenses
// ============================================
const MOCK_USER: Profile = {
  user_id: 'me-123',
  email: 'you@budgieee.app',
  full_name: 'You',
  avatar_url: null,
}

// ============ Main Component ============
export default function TripsPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading, isAuthenticated } = useSession()
  
  // Redirect to login if not authenticated (and not in dev bypass mode)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(getLoginRedirectPath())
    }
  }, [authLoading, isAuthenticated, router])
  
  // Use mock user for local data operations (trips page uses local state)
  const [user] = useState(MOCK_USER)
  const [isSignedIn, setIsSignedIn] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [signInEmail, setSignInEmail] = useState('')

  // Data state (local/in-memory) - starts BLANK for new users
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'activity'>('friends')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  
  // Hide global nav when any modal is open
  const { setHidden } = useNavVisibility()
  const anyModalOpen = showAddModal || showAddFriendModal || showCreateGroupModal
  useEffect(() => {
    setHidden(anyModalOpen)
  }, [anyModalOpen, setHidden])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupDetailTab, setGroupDetailTab] = useState<'members' | 'activity'>('members')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fake sign in handler
  const handleFakeSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInEmail.includes('@')) return
    
    setSigningIn(true)
    // Simulate API delay
    setTimeout(() => {
      setIsSignedIn(true)
      setSigningIn(false)
      showToast('Signed in successfully!')
    }, 800)
  }

  // Calculate balances from expenses
  const balances = useMemo(() => {
    const friendBalances: Record<string, number> = {}
    
    friends.forEach(f => {
      friendBalances[f.user_id] = 0
    })

    expenses.forEach(expense => {
      const payerId = expense.paid_by
      
      expense.splits.forEach(split => {
        if (split.user_id === payerId) return

        if (payerId === user.user_id && split.user_id !== user.user_id) {
          friendBalances[split.user_id] = (friendBalances[split.user_id] || 0) + split.share
        } else if (payerId !== user.user_id && split.user_id === user.user_id) {
          friendBalances[payerId] = (friendBalances[payerId] || 0) - split.share
        }
      })
    })

    return friendBalances
  }, [user, friends, expenses])

  // Aggregate totals
  const totals = useMemo(() => {
    let owed = 0
    let owe = 0

    Object.values(balances).forEach(balance => {
      if (balance > 0) owed += balance
      else if (balance < 0) owe += Math.abs(balance)
    })

    return { owed, owe }
  }, [balances])

  // Group balances
  const groupBalances = useMemo(() => {
    const gBalances: Record<string, number> = {}
    groups.forEach(g => { gBalances[g.id] = 0 })

    expenses.forEach(expense => {
      if (!expense.group_id) return
      
      const payerId = expense.paid_by
      const myShare = expense.splits.find(s => s.user_id === user.user_id)?.share || 0

      if (payerId === user.user_id) {
        const othersTotal = expense.splits
          .filter(s => s.user_id !== user.user_id)
          .reduce((sum, s) => sum + s.share, 0)
        gBalances[expense.group_id] = (gBalances[expense.group_id] || 0) + othersTotal
      } else if (myShare > 0) {
        gBalances[expense.group_id] = (gBalances[expense.group_id] || 0) - myShare
      }
    })

    return gBalances
  }, [user, groups, expenses])

  // Sorted friends by absolute balance
  const sortedFriends = useMemo(() => {
    return [...friends].filter(f => !f.pending).sort((a, b) => {
      return Math.abs(balances[b.user_id] || 0) - Math.abs(balances[a.user_id] || 0)
    })
  }, [friends, balances])

  // Get name helper
  const getName = useCallback((userId: string): string => {
    if (userId === user.user_id) return 'You'
    const friend = friends.find(f => f.user_id === userId)
    if (friend) return friend.full_name || friend.email.split('@')[0]
    for (const group of groups) {
      const member = group.members.find(m => m.user_id === userId)
      if (member) return member.profile.full_name || member.profile.email.split('@')[0]
    }
    return 'Unknown'
  }, [user, friends, groups])

  // ============================================
  // STUB API HANDLERS - Replace with real API later
  // ============================================

  // Invite friend (stub)
  const handleInviteFriend = useCallback((email: string, groupId?: string) => {
    // Check if already a friend
    if (friends.some(f => f.email.toLowerCase() === email.toLowerCase())) {
      showToast('This person is already your friend', 'error')
      return
    }

    // Check if already invited
    if (pendingInvites.some(i => i.invited_email.toLowerCase() === email.toLowerCase())) {
      showToast('Invite already sent to this email', 'error')
      return
    }

    // Create pending invite
    const newInvite: PendingInvite = {
      id: generateId(),
      invited_email: email.toLowerCase(),
      group_id: groupId || null,
      status: 'sent',
      created_at: new Date().toISOString(),
    }
    setPendingInvites(prev => [newInvite, ...prev])

    // Also add as pending friend
    const newFriend: Friend = {
      user_id: generateId(),
      email: email.toLowerCase(),
      full_name: email.split('@')[0],
      avatar_url: null,
      friendship_id: generateId(),
      status: 'pending',
      pending: true,
      invitedAt: new Date(),
    }
    setFriends(prev => [...prev, newFriend])

    showToast(`Invite sent to ${email}`)
    setShowAddFriendModal(false)
  }, [friends, pendingInvites, showToast])

  // Create expense (stub) - supports equal, exact, and percent split modes
  const handleCreateExpense = useCallback((
    description: string,
    amount: number,
    paidBy: string,
    splitUserIds: string[],
    splitMode: SplitMode,
    splitValues: number[],
    groupId?: string
  ) => {
    const numSplits = splitUserIds.length
    let shares: number[] = []

    if (splitMode === 'equal') {
      // Equal split with proper rounding (distribute remainder cents)
      const amountCents = Math.round(amount * 100)
      const baseShareCents = Math.floor(amountCents / numSplits)
      const remainderCents = amountCents - (baseShareCents * numSplits)

      shares = splitUserIds.map((_, index) => 
        index < remainderCents 
          ? (baseShareCents + 1) / 100 
          : baseShareCents / 100
      )
    } else if (splitMode === 'exact') {
      // Exact amounts - use provided values directly
      shares = splitValues
    } else if (splitMode === 'percent') {
      // Percent split - convert to amounts with proper rounding
      const amountCents = Math.round(amount * 100)
      const computedCents: number[] = []
      const fractionalParts: number[] = []
      
      // First pass: compute base cents and track fractional parts
      splitValues.forEach(pct => {
        const exactCents = (pct / 100) * amountCents
        const floorCents = Math.floor(exactCents)
        computedCents.push(floorCents)
        fractionalParts.push(exactCents - floorCents)
      })
      
      // Distribute remainder cents to largest fractional parts
      let remainder = amountCents - computedCents.reduce((a, b) => a + b, 0)
      while (remainder > 0) {
        let maxIdx = 0
        let maxFrac = -1
        fractionalParts.forEach((frac, idx) => {
          if (frac > maxFrac) {
            maxFrac = frac
            maxIdx = idx
          }
        })
        computedCents[maxIdx]++
        fractionalParts[maxIdx] = -1 // Mark as used
        remainder--
      }
      
      shares = computedCents.map(cents => cents / 100)
    }

    const splits: ExpenseSplit[] = splitUserIds.map((userId, index) => ({
      id: generateId(),
      user_id: userId,
      share: shares[index],
    }))

    // Build split_meta based on mode
    const split_meta = splitMode === 'equal' 
      ? { mode: splitMode, participants: splitUserIds }
      : splitMode === 'exact'
        ? { mode: splitMode, participants: splitUserIds, values: splitValues }
        : { mode: splitMode, participants: splitUserIds, percentages: splitValues }

    const newExpense: Expense = {
      id: generateId(),
      description,
      amount,
      currency: 'USD',
      paid_by: paidBy,
      group_id: groupId || null,
      created_by: user.user_id,
      created_at: new Date().toISOString(),
      split_mode: splitMode,
      split_meta,
      splits,
    }

    setExpenses(prev => [newExpense, ...prev])
    showToast('Expense added!')
    setShowAddModal(false)
  }, [user, showToast])

  // Create group (stub)
  const handleCreateGroup = useCallback((name: string, emoji: string) => {
    const newGroup: Group = {
      id: generateId(),
      name,
      emoji,
      owner_id: user.user_id,
      members: [
        { user_id: user.user_id, role: 'owner', profile: user },
      ],
    }

    setGroups(prev => [...prev, newGroup])
    showToast('Group created!')
    setShowCreateGroupModal(false)
  }, [user, showToast])

  // Add member to group (stub)
  const handleAddMemberToGroup = useCallback((groupId: string, friendId: string) => {
    const friend = friends.find(f => f.user_id === friendId)
    if (!friend) return

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      if (g.members.some(m => m.user_id === friendId)) return g
      return {
        ...g,
        members: [...g.members, {
          user_id: friendId,
          role: 'member' as const,
          profile: friend,
        }],
      }
    }))
    showToast(`${friend.full_name} added to group`)
  }, [friends, showToast])

  // ============================================
  // RENDER
  // ============================================

  // Sign in screen (fake)
  if (!isSignedIn) {
    return (
      <div className="trips-page">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="trips-auth-screen">
          <div className="trips-auth-logo">💸</div>
          <h1>Trips & Splits</h1>
          <p>Split expenses with friends, the easy way</p>
          
          <form onSubmit={handleFakeSignIn} className="trips-auth-form">
            <input
              type="email"
              placeholder="Enter your email"
              value={signInEmail}
              onChange={e => setSignInEmail(e.target.value)}
              className="trips-input"
              autoFocus
            />
            <button 
              type="submit" 
              className="trips-submit-btn"
              disabled={signingIn || !signInEmail.includes('@')}
            >
              {signingIn ? (
                <div className="trips-spinner-small"></div>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                  </svg>
                  Continue with Email
                </>
              )}
            </button>
          </form>

          <div className="trips-auth-divider">
            <span>Demo Mode</span>
          </div>

          <p className="trips-auth-note">
            Dev mode: data is stored locally.<br/>
            Connect Supabase for real persistence.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="trips-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Toast */}
      {toast && (
        <div className={`trips-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="trips-header">
        <div className="trips-header-left">
          <Link href="/" className="trips-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="trips-header-title">Trips & Splits</h1>
            <p className="trips-header-subtitle">{user.full_name} • Demo Mode</p>
          </div>
        </div>
        <div className="trips-header-avatar" style={{ background: getAvatarColor(user.user_id) }}>
          {getInitials(user.full_name)}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="trips-summary">
        <div className="trips-summary-card trips-summary-owed">
          <span className="trips-summary-label">You are owed</span>
          <span className="trips-summary-amount trips-positive">{formatCurrency(totals.owed)}</span>
        </div>
        <div className="trips-summary-card trips-summary-owe">
          <span className="trips-summary-label">You owe</span>
          <span className="trips-summary-amount trips-negative">{formatCurrency(totals.owe)}</span>
        </div>
      </div>

      {/* Net Balance */}
      <div className="trips-net-balance">
        <span>Net balance: </span>
        <span className={totals.owed - totals.owe >= 0 ? 'trips-positive' : 'trips-negative'}>
          {totals.owed - totals.owe >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.owed - totals.owe))}
        </span>
      </div>

      {/* Tabs */}
      <div className="trips-tabs">
        <button 
          className={`trips-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Friends
        </button>
        <button 
          className={`trips-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          Groups
        </button>
        <button 
          className={`trips-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="trips-content">
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="trips-friends-list">
            {/* Add Friend Button */}
            <button className="trips-add-friend-btn" onClick={() => setShowAddFriendModal(true)}>
              <div className="trips-add-friend-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div className="trips-add-friend-text">
                <span className="trips-add-friend-title">Invite a friend</span>
                <span className="trips-add-friend-subtitle">Send invite via email</span>
              </div>
            </button>

            {/* Pending Invites */}
            {friends.filter(f => f.pending).map(friend => (
              <div key={friend.user_id} className="trips-friend-item pending">
                <div className="trips-friend-avatar" style={{ background: '#475569' }}>?</div>
                <div className="trips-friend-info">
                  <span className="trips-friend-name">{friend.email}</span>
                  <span className="trips-friend-status trips-pending">Invite pending</span>
                </div>
                <span className="trips-friend-date">{formatDate(friend.invitedAt || new Date())}</span>
              </div>
            ))}

            {/* Friends List */}
            {sortedFriends.length === 0 && friends.filter(f => f.pending).length === 0 && (
              <div className="trips-empty">
                <p>No friends yet. Invite someone to get started!</p>
              </div>
            )}

            {sortedFriends.map(friend => {
              const balance = balances[friend.user_id] || 0
              const hasBalance = Math.abs(balance) > 0.01
              
              return (
                <div key={friend.user_id} className="trips-friend-item">
                  <div className="trips-friend-avatar" style={{ background: getAvatarColor(friend.user_id) }}>
                    {getInitials(friend.full_name)}
                  </div>
                  <div className="trips-friend-info">
                    <span className="trips-friend-name">{friend.full_name || friend.email.split('@')[0]}</span>
                    {hasBalance ? (
                      <span className={`trips-friend-status ${balance > 0 ? 'trips-positive' : 'trips-negative'}`}>
                        {balance > 0 ? 'owes you' : 'you owe'}
                      </span>
                    ) : (
                      <span className="trips-friend-status trips-settled">settled up</span>
                    )}
                  </div>
                  <div className="trips-friend-amount">
                    {hasBalance ? (
                      <span className={balance > 0 ? 'trips-positive' : 'trips-negative'}>
                        {balance > 0 ? '+' : '-'}{formatCurrency(balance)}
                      </span>
                    ) : (
                      <span className="trips-settled">$0.00</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="trips-groups-list">
            {/* Create Group Button */}
            <button className="trips-add-friend-btn" onClick={() => setShowCreateGroupModal(true)}>
              <div className="trips-add-friend-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
              <div className="trips-add-friend-text">
                <span className="trips-add-friend-title">Create group</span>
                <span className="trips-add-friend-subtitle">For trips, roommates, etc.</span>
              </div>
            </button>

            {groups.length === 0 && (
              <div className="trips-empty">
                <p>No groups yet. Create one to split expenses!</p>
              </div>
            )}

            {groups.map(group => {
              const balance = groupBalances[group.id] || 0
              const hasBalance = Math.abs(balance) > 0.01
              const isExpanded = expandedGroup === group.id
              const availableFriends = friends.filter(f => 
                !f.pending && !group.members.some(m => m.user_id === f.user_id)
              )
              
              return (
                <div key={group.id} className="trips-group-wrapper">
                  <div 
                    className={`trips-group-item ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  >
                    <div className="trips-group-icon">{group.emoji}</div>
                    <div className="trips-group-info">
                      <span className="trips-group-name">{group.name}</span>
                      <span className="trips-group-members">
                        {group.members.length} members • tap to {isExpanded ? 'collapse' : 'view'}
                      </span>
                    </div>
                    <div className="trips-group-balance">
                      {hasBalance ? (
                        <>
                          <span className={balance > 0 ? 'trips-positive' : 'trips-negative'}>
                            {balance > 0 ? '+' : '-'}{formatCurrency(balance)}
                          </span>
                          <span className={`trips-group-status ${balance > 0 ? 'trips-positive' : 'trips-negative'}`}>
                            {balance > 0 ? 'you are owed' : 'you owe'}
                          </span>
                        </>
                      ) : (
                        <span className="trips-settled">settled up</span>
                      )}
                    </div>
                    <div className={`trips-group-chevron ${isExpanded ? 'expanded' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                  {isExpanded && (() => {
                    const groupExpenses = expenses.filter(e => e.group_id === group.id)
                    return (
                      <div className="trips-group-detail-panel">
                        {/* Group Detail Tabs */}
                        <div className="trips-group-detail-tabs">
                          <button
                            className={`trips-group-detail-tab ${groupDetailTab === 'members' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setGroupDetailTab('members') }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                            </svg>
                            Members ({group.members.length})
                          </button>
                          <button
                            className={`trips-group-detail-tab ${groupDetailTab === 'activity' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setGroupDetailTab('activity') }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Activity ({groupExpenses.length})
                          </button>
                        </div>

                        {/* Members Tab Content */}
                        {groupDetailTab === 'members' && (
                          <div className="trips-group-members-content">
                            {group.members.map(member => (
                              <div key={member.user_id} className="trips-group-member">
                                <div 
                                  className="trips-group-member-avatar" 
                                  style={{ background: getAvatarColor(member.user_id) }}
                                >
                                  {getInitials(member.profile.full_name)}
                                </div>
                                <span className="trips-group-member-name">
                                  {member.user_id === user.user_id ? 'You' : member.profile.full_name || member.profile.email.split('@')[0]}
                                </span>
                                {member.role === 'owner' && <span className="trips-group-member-badge">Owner</span>}
                              </div>
                            ))}
                            
                            {/* Add member dropdown */}
                            {group.owner_id === user.user_id && availableFriends.length > 0 && (
                              <div className="trips-add-member-section">
                                <div className="trips-add-member-label">Add member:</div>
                                <div className="trips-add-member-list">
                                  {availableFriends.map(friend => (
                                    <button
                                      key={friend.user_id}
                                      className="trips-add-member-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddMemberToGroup(group.id, friend.user_id)
                                      }}
                                    >
                                      <div className="trips-add-member-avatar" style={{ background: getAvatarColor(friend.user_id) }}>
                                        {getInitials(friend.full_name)}
                                      </div>
                                      <span>{friend.full_name}</span>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button 
                              className="trips-invite-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowAddFriendModal(true)
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                              </svg>
                              Invite New Person
                            </button>
                          </div>
                        )}

                        {/* Activity Tab Content */}
                        {groupDetailTab === 'activity' && (
                          <div className="trips-group-activity-content">
                            {groupExpenses.length === 0 ? (
                              <div className="trips-group-empty">
                                <p>No expenses in this group yet</p>
                                <button 
                                  className="trips-group-add-expense-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAddModal(true)
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                  Add First Expense
                                </button>
                              </div>
                            ) : (
                              <>
                                {groupExpenses.map(expense => {
                                  const isPayer = expense.paid_by === user.user_id
                                  const myShare = expense.splits.find(s => s.user_id === user.user_id)?.share || 0
                                  const splitModeLabel = expense.split_mode === 'exact' ? 'Exact' 
                                    : expense.split_mode === 'percent' ? 'Percent' 
                                    : 'Equal'
                                  
                                  return (
                                    <div key={expense.id} className="trips-group-expense-item">
                                      <div className="trips-group-expense-icon" style={{ background: isPayer ? '#3b82f6' : '#374151' }}>
                                        {isPayer ? '💰' : '📝'}
                                      </div>
                                      <div className="trips-group-expense-info">
                                        <div className="trips-group-expense-header">
                                          <span className="trips-group-expense-desc">{expense.description}</span>
                                          <span className="trips-group-expense-amount">{formatCurrency(expense.amount)}</span>
                                        </div>
                                        <div className="trips-group-expense-details">
                                          <span className="trips-group-expense-payer">
                                            {getName(expense.paid_by)} paid
                                          </span>
                                          <span className="trips-group-expense-mode">{splitModeLabel}</span>
                                          <span className="trips-group-expense-date">{formatDate(expense.created_at)}</span>
                                        </div>
                                        <div className="trips-group-expense-split">
                                          {!isPayer && myShare > 0 && (
                                            <span className="trips-negative">You owe {formatCurrency(myShare)}</span>
                                          )}
                                          {isPayer && (
                                            <span className="trips-positive">You get back {formatCurrency(expense.amount - myShare)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                <button 
                                  className="trips-group-add-expense-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAddModal(true)
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                  Add Expense
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="trips-activity-list">
            {expenses.length === 0 && (
              <div className="trips-empty">
                <p>No expenses yet. Add one to get started!</p>
              </div>
            )}
            
            {expenses.map(expense => {
              const isPayer = expense.paid_by === user.user_id
              const myShare = expense.splits.find(s => s.user_id === user.user_id)?.share || 0
              const splitModeLabel = expense.split_mode === 'exact' ? 'Exact amounts' 
                : expense.split_mode === 'percent' ? 'Percent split' 
                : 'Equal split'
              
              return (
                <div key={expense.id} className="trips-activity-item">
                  <div className="trips-activity-icon" style={{ background: isPayer ? '#3b82f6' : '#374151' }}>
                    {isPayer ? '💰' : '📝'}
                  </div>
                  <div className="trips-activity-info">
                    <div className="trips-activity-main">
                      <span className="trips-activity-payer">{getName(expense.paid_by)}</span>
                      <span className="trips-activity-action"> paid </span>
                      <span className="trips-activity-amount-inline">{formatCurrency(expense.amount)}</span>
                      <span className="trips-activity-action"> for </span>
                      <span className="trips-activity-desc">{expense.description}</span>
                    </div>
                    <div className="trips-activity-details">
                      <span className="trips-activity-split">
                        Split with {expense.splits.filter(s => s.user_id !== expense.paid_by).map(s => getName(s.user_id)).join(', ')}
                      </span>
                      <span className="trips-activity-mode">{splitModeLabel}</span>
                      {!isPayer && myShare > 0 && (
                        <span className="trips-activity-owe trips-negative">You owe {formatCurrency(myShare)}</span>
                      )}
                      {isPayer && (
                        <span className="trips-activity-owe trips-positive">
                          You get back {formatCurrency(expense.amount - myShare)}
                        </span>
                      )}
                    </div>
                    <span className="trips-activity-date">{formatDate(expense.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Expense Button */}
      <button className="trips-add-btn" onClick={() => setShowAddModal(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Modals */}
      {showAddModal && (
        <AddExpenseModal
          currentUserId={user.user_id}
          friends={friends.filter(f => !f.pending)}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateExpense}
        />
      )}

      {showAddFriendModal && (
        <AddFriendModal
          groups={groups}
          onClose={() => setShowAddFriendModal(false)}
          onSubmit={handleInviteFriend}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}
    </div>
  )
}

// ============ Add Expense Modal ============
interface AddExpenseModalProps {
  currentUserId: string
  friends: Friend[]
  groups: Group[]
  onClose: () => void
  onSubmit: (description: string, amount: number, paidBy: string, splitUserIds: string[], splitMode: SplitMode, splitValues: number[], groupId?: string) => void
}

function AddExpenseModal({ currentUserId, friends, groups, onClose, onSubmit }: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitWith, setSplitWith] = useState<string[]>([currentUserId])
  const [groupId, setGroupId] = useState<string>('')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const allParticipants = useMemo(() => {
    const participants = new Map<string, { id: string; name: string }>()
    participants.set(currentUserId, { id: currentUserId, name: 'You' })
    
    friends.forEach(f => {
      participants.set(f.user_id, { id: f.user_id, name: f.full_name || f.email.split('@')[0] })
    })
    
    if (groupId) {
      const group = groups.find(g => g.id === groupId)
      group?.members.forEach(m => {
        if (!participants.has(m.user_id)) {
          participants.set(m.user_id, { 
            id: m.user_id, 
            name: m.profile.full_name || m.profile.email.split('@')[0] 
          })
        }
      })
    }
    
    return Array.from(participants.values())
  }, [currentUserId, friends, groups, groupId])

  // Initialize exact/percent values when participants change
  useEffect(() => {
    const newExact: Record<string, string> = {}
    const newPercent: Record<string, string> = {}
    splitWith.forEach(id => {
      newExact[id] = exactAmounts[id] || ''
      newPercent[id] = percentages[id] || ''
    })
    setExactAmounts(newExact)
    setPercentages(newPercent)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitWith.join(',')])

  const handleToggleSplit = (id: string) => {
    setSplitWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Calculate totals for validation
  const amountNum = parseFloat(amount) || 0
  
  const exactTotal = useMemo(() => {
    return splitWith.reduce((sum, id) => sum + (parseFloat(exactAmounts[id]) || 0), 0)
  }, [splitWith, exactAmounts])

  const percentTotal = useMemo(() => {
    return splitWith.reduce((sum, id) => sum + (parseFloat(percentages[id]) || 0), 0)
  }, [splitWith, percentages])

  // Preview for each mode
  const equalShare = splitWith.length > 0 && amountNum > 0 
    ? amountNum / splitWith.length 
    : 0

  // Compute shares for percent mode preview
  const percentShares = useMemo(() => {
    const shares: Record<string, number> = {}
    if (amountNum > 0 && percentTotal > 0) {
      const amountCents = Math.round(amountNum * 100)
      const computedCents: number[] = []
      const fractionalParts: number[] = []
      const ids = splitWith
      
      ids.forEach(id => {
        const pct = parseFloat(percentages[id]) || 0
        const exactCents = (pct / 100) * amountCents
        const floorCents = Math.floor(exactCents)
        computedCents.push(floorCents)
        fractionalParts.push(exactCents - floorCents)
      })
      
      let remainder = amountCents - computedCents.reduce((a, b) => a + b, 0)
      const usedIndices = new Set<number>()
      while (remainder > 0) {
        let maxIdx = 0
        let maxFrac = -1
        fractionalParts.forEach((frac, idx) => {
          if (frac > maxFrac && !usedIndices.has(idx)) {
            maxFrac = frac
            maxIdx = idx
          }
        })
        computedCents[maxIdx]++
        usedIndices.add(maxIdx)
        remainder--
      }
      
      ids.forEach((id, idx) => {
        shares[id] = computedCents[idx] / 100
      })
    }
    return shares
  }, [splitWith, percentages, amountNum, percentTotal])

  // Validation
  const exactError = splitMode === 'exact' && amountNum > 0 && Math.abs(exactTotal - amountNum) > 0.01
    ? `Amounts must add up to ${formatCurrency(amountNum)} (currently ${formatCurrency(exactTotal)})`
    : null

  const percentError = splitMode === 'percent' && Math.abs(percentTotal - 100) > 0.01
    ? `Percentages must add up to 100% (currently ${percentTotal.toFixed(1)}%)`
    : null

  // Auto-fill remaining for exact mode
  const handleAutoFillExact = () => {
    const filledUsers = splitWith.filter(id => parseFloat(exactAmounts[id]) > 0)
    const unfilledUsers = splitWith.filter(id => !parseFloat(exactAmounts[id]))
    if (unfilledUsers.length === 0) return
    
    const filledTotal = filledUsers.reduce((sum, id) => sum + (parseFloat(exactAmounts[id]) || 0), 0)
    const remaining = amountNum - filledTotal
    const perUser = remaining / unfilledUsers.length
    
    if (perUser >= 0) {
      const newExact = { ...exactAmounts }
      unfilledUsers.forEach(id => {
        newExact[id] = perUser.toFixed(2)
      })
      setExactAmounts(newExact)
    }
  }

  // Auto-fill equal percentages
  const handleAutoFillPercent = () => {
    const equalPct = 100 / splitWith.length
    const newPercent: Record<string, string> = {}
    splitWith.forEach(id => {
      newPercent[id] = equalPct.toFixed(2)
    })
    setPercentages(newPercent)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Please enter a description')
      return
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (splitWith.length < 2) {
      setError('Select at least 2 people to split')
      return
    }
    if (!splitWith.includes(paidBy)) {
      setError('Payer must be in the split')
      return
    }
    
    // Validate based on split mode
    if (splitMode === 'exact') {
      if (Math.abs(exactTotal - amountNum) > 0.01) {
        setError(`Amounts must add up to ${formatCurrency(amountNum)}`)
        return
      }
    }
    if (splitMode === 'percent') {
      if (Math.abs(percentTotal - 100) > 0.01) {
        setError('Percentages must add up to 100%')
        return
      }
    }

    // Build split values array in participant order
    let splitValues: number[] = []
    if (splitMode === 'exact') {
      splitValues = splitWith.map(id => parseFloat(exactAmounts[id]) || 0)
    } else if (splitMode === 'percent') {
      splitValues = splitWith.map(id => parseFloat(percentages[id]) || 0)
    }

    onSubmit(description.trim(), amountNum, paidBy, splitWith, splitMode, splitValues, groupId || undefined)
  }

  const getParticipantName = (id: string) => {
    return allParticipants.find(p => p.id === id)?.name || 'Unknown'
  }

  return (
    <div className="trips-modal-overlay" onClick={onClose}>
      <div className="trips-modal" onClick={e => e.stopPropagation()}>
        <div className="trips-modal-header">
          <h2>Add Expense</h2>
          <button className="trips-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="trips-modal-form">
          {error && <div className="trips-modal-error">{error}</div>}
          
          <div className="trips-form-group">
            <label>Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="trips-input"
              autoFocus
            />
          </div>

          <div className="trips-form-group">
            <label>Amount</label>
            <div className="trips-amount-input-wrapper">
              <span className="trips-currency">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="trips-input trips-amount-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="trips-form-group">
            <label>Group (optional)</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value)} className="trips-select">
              <option value="">No group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
              ))}
            </select>
          </div>

          <div className="trips-form-group">
            <label>Paid by</label>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="trips-select">
              {allParticipants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="trips-form-group">
            <label>Split with</label>
            <div className="trips-split-list">
              {allParticipants.map(p => (
                <label key={p.id} className="trips-split-item">
                  <input
                    type="checkbox"
                    checked={splitWith.includes(p.id)}
                    onChange={() => handleToggleSplit(p.id)}
                  />
                  <span className="trips-split-checkbox"></span>
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Split Mode Selector */}
          <div className="trips-form-group">
            <label>Split type</label>
            <div className="trips-split-mode-tabs">
              <button
                type="button"
                className={`trips-split-mode-btn ${splitMode === 'equal' ? 'active' : ''}`}
                onClick={() => setSplitMode('equal')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/>
                </svg>
                Equal
              </button>
              <button
                type="button"
                className={`trips-split-mode-btn ${splitMode === 'exact' ? 'active' : ''}`}
                onClick={() => setSplitMode('exact')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Exact
              </button>
              <button
                type="button"
                className={`trips-split-mode-btn ${splitMode === 'percent' ? 'active' : ''}`}
                onClick={() => setSplitMode('percent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><line x1="20" y1="4" x2="4" y2="20"/>
                </svg>
                Percent
              </button>
            </div>
          </div>

          {/* Equal Split Preview */}
          {splitMode === 'equal' && splitWith.length > 0 && amountNum > 0 && (
            <div className="trips-split-preview">
              <span className="trips-split-preview-icon">✓</span>
              {formatCurrency(equalShare)} per person ({splitWith.length} people)
            </div>
          )}

          {/* Exact Amounts Input */}
          {splitMode === 'exact' && splitWith.length > 0 && (
            <div className="trips-form-group">
              <div className="trips-split-values-header">
                <label>Exact amounts</label>
                {amountNum > 0 && (
                  <button 
                    type="button" 
                    className="trips-autofill-btn"
                    onClick={handleAutoFillExact}
                  >
                    Auto-fill remaining
                  </button>
                )}
              </div>
              <div className="trips-split-values-list">
                {splitWith.map(id => (
                  <div key={id} className="trips-split-value-row">
                    <span className="trips-split-value-name">{getParticipantName(id)}</span>
                    <div className="trips-split-value-input-wrapper">
                      <span className="trips-split-value-currency">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={exactAmounts[id] || ''}
                        onChange={e => setExactAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                        className="trips-input trips-split-value-input"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {exactError ? (
                <div className="trips-split-validation-error">{exactError}</div>
              ) : amountNum > 0 && Math.abs(exactTotal - amountNum) <= 0.01 ? (
                <div className="trips-split-validation-ok">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Total: {formatCurrency(exactTotal)}
                </div>
              ) : null}
            </div>
          )}

          {/* Percent Split Input */}
          {splitMode === 'percent' && splitWith.length > 0 && (
            <div className="trips-form-group">
              <div className="trips-split-values-header">
                <label>Percentages</label>
                <button 
                  type="button" 
                  className="trips-autofill-btn"
                  onClick={handleAutoFillPercent}
                >
                  Split equally
                </button>
              </div>
              <div className="trips-split-values-list">
                {splitWith.map(id => (
                  <div key={id} className="trips-split-value-row">
                    <span className="trips-split-value-name">{getParticipantName(id)}</span>
                    <div className="trips-split-value-input-wrapper trips-percent-input-wrapper">
                      <input
                        type="number"
                        placeholder="0"
                        value={percentages[id] || ''}
                        onChange={e => setPercentages(prev => ({ ...prev, [id]: e.target.value }))}
                        className="trips-input trips-split-value-input"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="trips-split-value-percent">%</span>
                    </div>
                    {amountNum > 0 && percentShares[id] !== undefined && (
                      <span className="trips-split-value-preview">{formatCurrency(percentShares[id])}</span>
                    )}
                  </div>
                ))}
              </div>
              {percentError ? (
                <div className="trips-split-validation-error">{percentError}</div>
              ) : Math.abs(percentTotal - 100) <= 0.01 ? (
                <div className="trips-split-validation-ok">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Total: {percentTotal.toFixed(1)}%
                </div>
              ) : null}
            </div>
          )}

          <button 
            type="submit" 
            className="trips-submit-btn"
            disabled={(splitMode === 'exact' && !!exactError) || (splitMode === 'percent' && !!percentError)}
          >
            Add Expense
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ Add Friend Modal ============
interface AddFriendModalProps {
  groups: Group[]
  onClose: () => void
  onSubmit: (email: string, groupId?: string) => void
}

function AddFriendModal({ groups, onClose, onSubmit }: AddFriendModalProps) {
  const [email, setEmail] = useState('')
  const [groupId, setGroupId] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    onSubmit(email.trim().toLowerCase(), groupId || undefined)
  }

  return (
    <div className="trips-modal-overlay" onClick={onClose}>
      <div className="trips-modal trips-modal-small" onClick={e => e.stopPropagation()}>
        <div className="trips-modal-header">
          <h2>Invite Friend</h2>
          <button className="trips-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="trips-modal-form">
          {error && <div className="trips-modal-error">{error}</div>}

          <div className="trips-invite-hero">
            <div className="trips-invite-hero-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              </svg>
            </div>
            <p>They'll receive an email to join Budgieee and connect with you.</p>
          </div>
          
          <div className="trips-form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="trips-input"
              autoFocus
            />
          </div>

          <div className="trips-form-group">
            <label>Add to group (optional)</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value)} className="trips-select">
              <option value="">No group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="trips-submit-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
            Send Invite
          </button>

          <p className="trips-demo-note">Demo mode: invite is simulated locally</p>
        </form>
      </div>
    </div>
  )
}

// ============ Create Group Modal ============
interface CreateGroupModalProps {
  onClose: () => void
  onSubmit: (name: string, emoji: string) => void
}

function CreateGroupModal({ onClose, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👥')
  const [error, setError] = useState('')

  const emojis = ['👥', '🏝️', '🏠', '🍕', '✈️', '🚗', '🎉', '💼', '🏕️', '🎿']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a group name')
      return
    }
    onSubmit(name.trim(), emoji)
  }

  return (
    <div className="trips-modal-overlay" onClick={onClose}>
      <div className="trips-modal trips-modal-small" onClick={e => e.stopPropagation()}>
        <div className="trips-modal-header">
          <h2>Create Group</h2>
          <button className="trips-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="trips-modal-form">
          {error && <div className="trips-modal-error">{error}</div>}
          
          <div className="trips-form-group">
            <label>Group Name</label>
            <input
              type="text"
              placeholder="e.g., Bali Trip 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              className="trips-input"
              autoFocus
            />
          </div>

          <div className="trips-form-group">
            <label>Icon</label>
            <div className="trips-emoji-picker">
              {emojis.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`trips-emoji-btn ${emoji === e ? 'active' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="trips-submit-btn">Create Group</button>
        </form>
      </div>
    </div>
  )
}

// ============ Styles ============
const styles = `
  .trips-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 15%, #142136 35%, #1a2d4a 50%, #142136 65%, #0a1628 85%, #050d18 100%);
    color: #e2e8f0;
    padding-bottom: 100px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .trips-auth-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    text-align: center;
  }
  .trips-auth-logo { font-size: 64px; margin-bottom: 16px; }
  .trips-auth-screen h1 { font-size: 2rem; font-weight: 700; color: #f1f5f9; margin: 0 0 8px 0; }
  .trips-auth-screen > p { color: #94a3b8; margin-bottom: 32px; }
  .trips-auth-form { width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 12px; }
  .trips-auth-divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 24px 0;
    color: #475569;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .trips-auth-divider::before, .trips-auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.1);
  }
  .trips-auth-note { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }
  .trips-demo-note {
    font-size: 0.75rem;
    color: #64748b;
    text-align: center;
    margin: 0;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .trips-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: trips-spin 0.8s linear infinite;
  }
  @keyframes trips-spin { to { transform: rotate(360deg); } }
  .trips-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 12px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1100;
    animation: trips-toast-in 0.3s ease-out;
  }
  .trips-toast.success { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); }
  .trips-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4); }
  @keyframes trips-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .trips-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .trips-header-left { display: flex; align-items: center; gap: 12px; }
  .trips-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border-radius: 10px;
    color: #94a3b8;
    text-decoration: none;
  }
  .trips-back-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .trips-header-title { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .trips-header-subtitle { font-size: 0.75rem; color: #64748b; margin: 0; }
  .trips-header-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
  }
  .trips-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px; }
  .trips-summary-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .trips-summary-owed { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.08); }
  .trips-summary-owe { border-color: rgba(248, 113, 113, 0.2); background: rgba(248, 113, 113, 0.05); }
  .trips-summary-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .trips-summary-amount { font-size: 1.5rem; font-weight: 700; }
  .trips-net-balance { text-align: center; padding: 0 20px 16px; font-size: 0.875rem; color: #94a3b8; }
  .trips-positive { color: #60a5fa; }
  .trips-negative { color: #f87171; }
  .trips-settled { color: #64748b; }
  .trips-pending { color: #fbbf24; }
  .trips-tabs { display: flex; gap: 4px; padding: 0 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .trips-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 8px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .trips-tab:hover { color: #94a3b8; }
  .trips-tab.active { color: #60a5fa; border-bottom-color: #3b82f6; }
  .trips-tab svg { opacity: 0.7; }
  .trips-tab.active svg { opacity: 1; }
  .trips-content { padding: 16px 20px; }
  .trips-empty {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }
  .trips-friends-list, .trips-groups-list, .trips-activity-list { display: flex; flex-direction: column; gap: 8px; }
  .trips-friend-item, .trips-group-item, .trips-activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
  }
  .trips-friend-item:hover, .trips-group-item:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }
  .trips-friend-item.pending { opacity: 0.7; border-style: dashed; }
  .trips-friend-avatar, .trips-group-member-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    color: white;
    flex-shrink: 0;
  }
  .trips-group-member-avatar { width: 32px; height: 32px; font-size: 0.75rem; }
  .trips-friend-info, .trips-group-info, .trips-activity-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .trips-friend-name, .trips-group-name, .trips-group-member-name { font-weight: 500; color: #e2e8f0; }
  .trips-friend-status, .trips-group-members, .trips-group-status { font-size: 0.75rem; }
  .trips-friend-amount { font-weight: 600; font-size: 0.9375rem; text-align: right; }
  .trips-friend-date { font-size: 0.7rem; color: #475569; }
  .trips-add-friend-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
    border: 1px dashed rgba(59, 130, 246, 0.3);
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
  }
  .trips-add-friend-btn:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.1));
    border-color: rgba(59, 130, 246, 0.5);
  }
  .trips-add-friend-icon {
    width: 42px;
    height: 42px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #60a5fa;
  }
  .trips-add-friend-text { display: flex; flex-direction: column; gap: 2px; }
  .trips-add-friend-title { font-weight: 600; font-size: 0.9375rem; color: #60a5fa; }
  .trips-add-friend-subtitle { font-size: 0.75rem; color: #64748b; }
  .trips-group-wrapper { display: flex; flex-direction: column; }
  .trips-group-item { cursor: pointer; }
  .trips-group-item.expanded {
    border-radius: 14px 14px 0 0;
    border-bottom-color: transparent;
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
  }
  .trips-group-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  .trips-group-balance { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .trips-group-balance > span:first-child { font-weight: 600; font-size: 0.9375rem; }
  .trips-group-chevron { color: #64748b; transition: transform 0.2s; flex-shrink: 0; }
  .trips-group-chevron.expanded { transform: rotate(180deg); }
  .trips-group-detail-panel {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-top: none;
    border-radius: 0 0 14px 14px;
    overflow: hidden;
  }
  .trips-group-detail-tabs {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .trips-group-detail-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .trips-group-detail-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.02); }
  .trips-group-detail-tab.active { color: #60a5fa; border-bottom-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
  .trips-group-detail-tab svg { opacity: 0.7; }
  .trips-group-detail-tab.active svg { opacity: 1; }
  .trips-group-members-content, .trips-group-activity-content { padding: 12px 16px; }
  .trips-group-empty {
    text-align: center;
    padding: 20px;
    color: #64748b;
  }
  .trips-group-empty p { margin: 0 0 12px 0; font-size: 0.875rem; }
  .trips-group-add-expense-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 16px;
    margin-top: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px dashed rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    color: #60a5fa;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .trips-group-add-expense-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .trips-group-expense-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .trips-group-expense-item:last-of-type { margin-bottom: 0; }
  .trips-group-expense-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
  .trips-group-expense-info { flex: 1; min-width: 0; }
  .trips-group-expense-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
  }
  .trips-group-expense-desc { font-weight: 500; color: #e2e8f0; font-size: 0.875rem; }
  .trips-group-expense-amount { font-weight: 600; color: #60a5fa; font-size: 0.875rem; white-space: nowrap; }
  .trips-group-expense-details { display: flex; gap: 8px; font-size: 0.7rem; color: #64748b; margin-bottom: 4px; }
  .trips-group-expense-payer { color: #94a3b8; }
  .trips-group-expense-mode {
    font-size: 0.6rem;
    padding: 1px 5px;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border-radius: 3px;
    font-weight: 500;
  }
  .trips-group-expense-date { color: #475569; }
  .trips-group-expense-split { font-size: 0.75rem; font-weight: 500; }
  .trips-group-members-header {
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
  }
  .trips-group-member { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
  .trips-group-member:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.05); }
  .trips-group-member-badge {
    font-size: 0.65rem;
    padding: 2px 6px;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border-radius: 4px;
    margin-left: auto;
  }
  .trips-add-member-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
  .trips-add-member-label { font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .trips-add-member-list { display: flex; flex-direction: column; gap: 4px; }
  .trips-add-member-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #cbd5e1;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .trips-add-member-btn:hover { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
  .trips-add-member-btn svg { margin-left: auto; color: #60a5fa; }
  .trips-add-member-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 600; color: white; }
  .trips-invite-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    margin-top: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px dashed rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    color: #60a5fa;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .trips-invite-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .trips-activity-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  .trips-activity-main { font-size: 0.875rem; line-height: 1.4; color: #cbd5e1; }
  .trips-activity-payer { font-weight: 600; color: #e2e8f0; }
  .trips-activity-action { color: #94a3b8; }
  .trips-activity-amount-inline { font-weight: 600; color: #60a5fa; }
  .trips-activity-desc { color: #e2e8f0; }
  .trips-activity-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; }
  .trips-activity-split { color: #64748b; }
  .trips-activity-owe { font-weight: 500; }
  .trips-activity-date { font-size: 0.7rem; color: #475569; }
  .trips-add-btn {
    position: fixed;
    bottom: 88px; /* Above bottom nav (72px) + spacing */
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  }
  .trips-add-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(59, 130, 246, 0.5); }
  .trips-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .trips-modal {
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    background: linear-gradient(180deg, #131f33 0%, #0d1a2d 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px 24px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .trips-modal-small { max-width: 400px; }
  @media (min-width: 640px) {
    .trips-modal-overlay { align-items: center; }
    .trips-modal { border-radius: 24px; }
  }
  .trips-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .trips-modal-header h2 { font-size: 1.125rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .trips-modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 8px;
    color: #94a3b8;
    cursor: pointer;
  }
  .trips-modal-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .trips-modal-form { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
  .trips-modal-error {
    padding: 12px 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.875rem;
  }
  .trips-form-group { display: flex; flex-direction: column; gap: 8px; }
  .trips-form-group label { font-size: 0.8125rem; font-weight: 500; color: #94a3b8; }
  .trips-input {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
  }
  .trips-input:focus { border-color: #3b82f6; background: rgba(255,255,255,0.06); }
  .trips-input::placeholder { color: #475569; }
  .trips-amount-input-wrapper { position: relative; display: flex; align-items: center; }
  .trips-currency { position: absolute; left: 16px; color: #64748b; font-size: 1rem; font-weight: 500; }
  .trips-amount-input { padding-left: 32px; }
  .trips-select {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
    cursor: pointer;
    appearance: none;
    padding-right: 40px;
  }
  .trips-select-wrapper { position: relative; }
  .trips-select-wrapper::after {
    content: '';
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #64748b;
    pointer-events: none;
  }
  .trips-select:focus { border-color: #3b82f6; }
  .trips-select option { background: #0d1a2d; color: #e2e8f0; }
  .trips-split-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
    padding: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
  }
  .trips-split-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
  }
  .trips-split-item:hover { background: rgba(255,255,255,0.04); }
  .trips-split-item input { display: none; }
  .trips-split-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .trips-split-item input:checked + .trips-split-checkbox { background: #3b82f6; border-color: #3b82f6; }
  .trips-split-item input:checked + .trips-split-checkbox::after {
    content: '';
    display: block;
    width: 6px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-bottom: 2px;
  }
  .trips-split-item span:last-child { color: #cbd5e1; font-size: 0.9375rem; }
  .trips-split-preview {
    font-size: 0.8125rem;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
    text-align: center;
  }
  .trips-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  .trips-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3); }
  .trips-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .trips-invite-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px 0;
    gap: 12px;
  }
  .trips-invite-hero-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #60a5fa;
  }
  .trips-invite-hero p { font-size: 0.875rem; color: #94a3b8; line-height: 1.5; max-width: 280px; margin: 0; }
  .trips-emoji-picker { display: flex; flex-wrap: wrap; gap: 8px; }
  .trips-emoji-btn {
    width: 44px;
    height: 44px;
    background: rgba(255,255,255,0.04);
    border: 2px solid transparent;
    border-radius: 10px;
    font-size: 1.25rem;
    cursor: pointer;
  }
  .trips-emoji-btn:hover { background: rgba(255,255,255,0.08); }
  .trips-emoji-btn.active { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

  /* Split Mode Tabs */
  .trips-split-mode-tabs {
    display: flex;
    gap: 8px;
    background: rgba(255,255,255,0.04);
    padding: 4px;
    border-radius: 12px;
  }
  .trips-split-mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #94a3b8;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .trips-split-mode-btn:hover {
    color: #cbd5e1;
    background: rgba(255,255,255,0.04);
  }
  .trips-split-mode-btn.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }
  .trips-split-mode-btn svg {
    opacity: 0.7;
  }
  .trips-split-mode-btn.active svg {
    opacity: 1;
  }

  /* Split Preview */
  .trips-split-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.8125rem;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
    padding: 10px 16px;
    border-radius: 10px;
    text-align: center;
  }
  .trips-split-preview-icon {
    color: #22c55e;
    font-weight: bold;
  }

  /* Split Values Input */
  .trips-split-values-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .trips-split-values-header label {
    margin: 0;
  }
  .trips-autofill-btn {
    padding: 4px 10px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 6px;
    color: #60a5fa;
    font-size: 0.6875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .trips-autofill-btn:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .trips-split-values-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
  }
  .trips-split-value-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .trips-split-value-name {
    flex: 1;
    font-size: 0.875rem;
    color: #cbd5e1;
    min-width: 80px;
  }
  .trips-split-value-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100px;
  }
  .trips-split-value-currency {
    position: absolute;
    left: 10px;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .trips-split-value-input {
    padding: 8px 10px 8px 24px !important;
    font-size: 0.875rem !important;
    text-align: right;
    width: 100%;
  }
  .trips-percent-input-wrapper .trips-split-value-input {
    padding: 8px 24px 8px 10px !important;
  }
  .trips-split-value-percent {
    position: absolute;
    right: 10px;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .trips-split-value-preview {
    font-size: 0.75rem;
    color: #94a3b8;
    min-width: 60px;
    text-align: right;
  }

  /* Split Validation */
  .trips-split-validation-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 8px;
    color: #f87171;
    font-size: 0.75rem;
  }
  .trips-split-validation-ok {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    color: #22c55e;
    font-size: 0.75rem;
  }

  /* Activity Mode Label */
  .trips-activity-mode {
    font-size: 0.65rem;
    padding: 2px 6px;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border-radius: 4px;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .trips-summary { gap: 8px; padding: 16px; }
    .trips-summary-card { padding: 12px; }
    .trips-summary-amount { font-size: 1.25rem; }
    .trips-content { padding: 12px 16px; }
    .trips-friend-item, .trips-group-item, .trips-activity-item { padding: 12px; }
  }
`
