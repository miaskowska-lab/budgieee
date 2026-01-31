'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ============ Types ============
interface User {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

interface Group {
  id: string
  name: string
  memberIds: string[]
  emoji?: string
}

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  paidBy: string
  splitBetween: string[]
  splitMode: 'equal'
  createdAt: Date
  groupId?: string
}

// ============ Mock Data ============
const ME_ID = 'me'

const MOCK_FRIENDS: User[] = [
  { id: 'friend1', name: 'Sarah Chen', email: 'sarah@email.com', avatarUrl: '' },
  { id: 'friend2', name: 'Marcus Johnson', email: 'marcus@email.com', avatarUrl: '' },
  { id: 'friend3', name: 'Elena Rodriguez', email: 'elena@email.com', avatarUrl: '' },
  { id: 'friend4', name: 'James Wilson', email: 'james@email.com', avatarUrl: '' },
  { id: 'friend5', name: 'Priya Patel', email: 'priya@email.com', avatarUrl: '' },
]

const INITIAL_GROUPS: Group[] = [
  { id: 'group1', name: 'Bali Trip 2026', memberIds: [ME_ID, 'friend1', 'friend2', 'friend3'], emoji: '🏝️' },
  { id: 'group2', name: 'Roommates', memberIds: [ME_ID, 'friend4', 'friend5'], emoji: '🏠' },
  { id: 'group3', name: 'Office Lunches', memberIds: [ME_ID, 'friend1', 'friend4'], emoji: '🍕' },
]

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp1',
    description: 'Beach Resort Booking',
    amount: 450.00,
    currency: 'USD',
    paidBy: ME_ID,
    splitBetween: [ME_ID, 'friend1', 'friend2', 'friend3'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-28T10:00:00'),
    groupId: 'group1',
  },
  {
    id: 'exp2',
    description: 'Uber to Airport',
    amount: 65.00,
    currency: 'USD',
    paidBy: 'friend1',
    splitBetween: [ME_ID, 'friend1', 'friend2'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-29T08:30:00'),
    groupId: 'group1',
  },
  {
    id: 'exp3',
    description: 'Groceries',
    amount: 124.50,
    currency: 'USD',
    paidBy: ME_ID,
    splitBetween: [ME_ID, 'friend4', 'friend5'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-30T14:00:00'),
    groupId: 'group2',
  },
  {
    id: 'exp4',
    description: 'Pizza Friday',
    amount: 48.00,
    currency: 'USD',
    paidBy: 'friend4',
    splitBetween: [ME_ID, 'friend1', 'friend4'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-30T12:30:00'),
    groupId: 'group3',
  },
  {
    id: 'exp5',
    description: 'Netflix Subscription',
    amount: 22.99,
    currency: 'USD',
    paidBy: 'friend5',
    splitBetween: [ME_ID, 'friend4', 'friend5'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-25T09:00:00'),
    groupId: 'group2',
  },
  {
    id: 'exp6',
    description: 'Dinner at Sushi Place',
    amount: 186.00,
    currency: 'USD',
    paidBy: ME_ID,
    splitBetween: [ME_ID, 'friend2', 'friend3'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-27T19:00:00'),
  },
  {
    id: 'exp7',
    description: 'Scooter Rental',
    amount: 35.00,
    currency: 'USD',
    paidBy: 'friend2',
    splitBetween: [ME_ID, 'friend2'],
    splitMode: 'equal',
    createdAt: new Date('2026-01-29T16:00:00'),
    groupId: 'group1',
  },
]

// ============ Utility Functions ============
function generateId(): string {
  return 'exp' + Date.now() + Math.random().toString(36).substr(2, 9)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount))
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
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

// ============ Main Component ============
export default function TripsPage() {
  // DEV MODE: Skip auth, use mock user
  const user = { email: 'dev@budgieee.app' }
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES)
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS)
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'activity'>('friends')
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null)

  // Add member to group
  const handleAddMemberToGroup = (groupId: string, friendId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId && !g.memberIds.includes(friendId)) {
        return { ...g, memberIds: [...g.memberIds, friendId] }
      }
      return g
    }))
    setShowInviteModal(null)
  }

  // Remove member from group
  const handleRemoveMemberFromGroup = (groupId: string, memberId: string) => {
    if (memberId === ME_ID) return // Can't remove yourself
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, memberIds: g.memberIds.filter(id => id !== memberId) }
      }
      return g
    }))
  }

  // Calculate balances
  const balances = useMemo(() => {
    const friendBalances: Record<string, number> = {}
    
    // Initialize all friends with 0 balance
    MOCK_FRIENDS.forEach(f => {
      friendBalances[f.id] = 0
    })

    expenses.forEach(expense => {
      const { paidBy, splitBetween, amount, splitMode } = expense
      
      if (splitMode === 'equal') {
        const sharePerPerson = amount / splitBetween.length

        splitBetween.forEach(personId => {
          if (personId === paidBy) return // Payer doesn't owe themselves

          if (paidBy === ME_ID && personId !== ME_ID) {
            // I paid, friend owes me their share
            friendBalances[personId] = (friendBalances[personId] || 0) + sharePerPerson
          } else if (paidBy !== ME_ID && personId === ME_ID) {
            // Friend paid, I owe them my share
            friendBalances[paidBy] = (friendBalances[paidBy] || 0) - sharePerPerson
          }
        })
      }
    })

    return friendBalances
  }, [expenses])

  // Aggregate totals
  const totals = useMemo(() => {
    let owed = 0
    let owe = 0

    Object.values(balances).forEach(balance => {
      if (balance > 0) {
        owed += balance
      } else if (balance < 0) {
        owe += Math.abs(balance)
      }
    })

    return { owed, owe }
  }, [balances])

  // Group balances
  const groupBalances = useMemo(() => {
    const gBalances: Record<string, number> = {}
    
    groups.forEach(g => {
      gBalances[g.id] = 0
    })

    expenses.forEach(expense => {
      if (!expense.groupId) return
      
      const { paidBy, splitBetween, amount, groupId } = expense
      const sharePerPerson = amount / splitBetween.length

      if (paidBy === ME_ID) {
        // I paid: I'm owed by everyone except me
        const othersCount = splitBetween.filter(id => id !== ME_ID).length
        gBalances[groupId] = (gBalances[groupId] || 0) + (sharePerPerson * othersCount)
      } else if (splitBetween.includes(ME_ID)) {
        // Someone else paid and I'm in the split: I owe my share
        gBalances[groupId] = (gBalances[groupId] || 0) - sharePerPerson
      }
    })

    return gBalances
  }, [expenses, groups])

  // Sorted friends by absolute balance
  const sortedFriends = useMemo(() => {
    return [...MOCK_FRIENDS].sort((a, b) => {
      return Math.abs(balances[b.id] || 0) - Math.abs(balances[a.id] || 0)
    })
  }, [balances])

  // Activity feed
  const activityFeed = useMemo(() => {
    return [...expenses].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [expenses])

  // Get user/friend name by ID
  const getName = (id: string): string => {
    if (id === ME_ID) return 'You'
    return MOCK_FRIENDS.find(f => f.id === id)?.name || 'Unknown'
  }

  // Handle add expense
  const handleAddExpense = (newExpense: Omit<Expense, 'id' | 'createdAt'>) => {
    const expense: Expense = {
      ...newExpense,
      id: generateId(),
      createdAt: new Date(),
    }
    setExpenses(prev => [expense, ...prev])
    setShowAddModal(false)
  }

  return (
    <div className="trips-page">
      <style>{styles}</style>
      
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
            <p className="trips-header-subtitle">Personal Finance</p>
          </div>
        </div>
        <div className="trips-header-avatar" style={{ background: getAvatarColor(user.email) }}>
          {user.email[0]?.toUpperCase() || 'U'}
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
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Friends
        </button>
        <button 
          className={`trips-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
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
            {sortedFriends.map(friend => {
              const balance = balances[friend.id] || 0
              const hasBalance = Math.abs(balance) > 0.01
              
              return (
                <div key={friend.id} className="trips-friend-item">
                  <div className="trips-friend-avatar" style={{ background: getAvatarColor(friend.id) }}>
                    {getInitials(friend.name)}
                  </div>
                  <div className="trips-friend-info">
                    <span className="trips-friend-name">{friend.name}</span>
                    {hasBalance && (
                      <span className={`trips-friend-status ${balance > 0 ? 'trips-positive' : 'trips-negative'}`}>
                        {balance > 0 ? 'owes you' : 'you owe'}
                      </span>
                    )}
                    {!hasBalance && (
                      <span className="trips-friend-status trips-settled">settled up</span>
                    )}
                  </div>
                  <div className="trips-friend-amount">
                    {hasBalance && (
                      <span className={balance > 0 ? 'trips-positive' : 'trips-negative'}>
                        {balance > 0 ? '+' : '-'}{formatCurrency(balance)}
                      </span>
                    )}
                    {!hasBalance && (
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
            {groups.map(group => {
              const balance = groupBalances[group.id] || 0
              const hasBalance = Math.abs(balance) > 0.01
              const memberCount = group.memberIds.length
              const isExpanded = expandedGroup === group.id
              const members = group.memberIds.map(id => 
                id === ME_ID ? { id, name: 'You' } : MOCK_FRIENDS.find(f => f.id === id)
              ).filter(Boolean)
              const availableFriends = MOCK_FRIENDS.filter(f => !group.memberIds.includes(f.id))
              
              return (
                <div key={group.id} className="trips-group-wrapper">
                  <div 
                    className={`trips-group-item ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  >
                    <div className="trips-group-icon">
                      {group.emoji}
                    </div>
                    <div className="trips-group-info">
                      <span className="trips-group-name">{group.name}</span>
                      <span className="trips-group-members">{memberCount} members • tap to {isExpanded ? 'collapse' : 'view'}</span>
                    </div>
                    <div className="trips-group-balance">
                      {hasBalance && (
                        <>
                          <span className={balance > 0 ? 'trips-positive' : 'trips-negative'}>
                            {balance > 0 ? '+' : '-'}{formatCurrency(balance)}
                          </span>
                          <span className={`trips-group-status ${balance > 0 ? 'trips-positive' : 'trips-negative'}`}>
                            {balance > 0 ? 'you are owed' : 'you owe'}
                          </span>
                        </>
                      )}
                      {!hasBalance && (
                        <span className="trips-settled">settled up</span>
                      )}
                    </div>
                    <div className={`trips-group-chevron ${isExpanded ? 'expanded' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="trips-group-members-list">
                      <div className="trips-group-members-header">Members</div>
                      {members.map(member => member && (
                        <div key={member.id} className="trips-group-member">
                          <div 
                            className="trips-group-member-avatar" 
                            style={{ background: getAvatarColor(member.id) }}
                          >
                            {member.id === ME_ID ? 'Y' : getInitials(member.name)}
                          </div>
                          <span className="trips-group-member-name">{member.name}</span>
                          {member.id === ME_ID && <span className="trips-group-member-you">(You)</span>}
                          {member.id !== ME_ID && (
                            <button 
                              className="trips-group-member-remove"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveMemberFromGroup(group.id, member.id)
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        className="trips-invite-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowInviteModal(group.id)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Invite Member
                      </button>
                      
                      {/* Invite Modal */}
                      {showInviteModal === group.id && (
                        <div className="trips-invite-dropdown">
                          <div className="trips-invite-dropdown-header">
                            <span>Add to {group.name}</span>
                            <button 
                              className="trips-invite-dropdown-close"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowInviteModal(null)
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                          {availableFriends.length === 0 ? (
                            <div className="trips-invite-empty">All friends are already members</div>
                          ) : (
                            availableFriends.map(friend => (
                              <button
                                key={friend.id}
                                className="trips-invite-option"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddMemberToGroup(group.id, friend.id)
                                }}
                              >
                                <div 
                                  className="trips-invite-option-avatar"
                                  style={{ background: getAvatarColor(friend.id) }}
                                >
                                  {getInitials(friend.name)}
                                </div>
                                <span>{friend.name}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="12" y1="5" x2="12" y2="19"/>
                                  <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="trips-activity-list">
            {activityFeed.map(expense => {
              const isPayer = expense.paidBy === ME_ID
              const payer = getName(expense.paidBy)
              const others = expense.splitBetween.filter(id => id !== expense.paidBy)
              const myShare = expense.splitBetween.includes(ME_ID) 
                ? expense.amount / expense.splitBetween.length 
                : 0
              
              return (
                <div key={expense.id} className="trips-activity-item">
                  <div className="trips-activity-icon" style={{ background: isPayer ? '#3b82f6' : '#374151' }}>
                    {isPayer ? '💰' : '📝'}
                  </div>
                  <div className="trips-activity-info">
                    <div className="trips-activity-main">
                      <span className="trips-activity-payer">{payer}</span>
                      <span className="trips-activity-action"> paid </span>
                      <span className="trips-activity-amount-inline">{formatCurrency(expense.amount)}</span>
                      <span className="trips-activity-action"> for </span>
                      <span className="trips-activity-desc">{expense.description}</span>
                    </div>
                    <div className="trips-activity-details">
                      <span className="trips-activity-split">
                        Split with {others.map(id => getName(id)).join(', ')}
                      </span>
                      {!isPayer && myShare > 0 && (
                        <span className="trips-activity-owe trips-negative">
                          You owe {formatCurrency(myShare)}
                        </span>
                      )}
                      {isPayer && (
                        <span className="trips-activity-owe trips-positive">
                          You get back {formatCurrency(expense.amount - (expense.amount / expense.splitBetween.length))}
                        </span>
                      )}
                    </div>
                    <span className="trips-activity-date">{formatDate(expense.createdAt)}</span>
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
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          friends={MOCK_FRIENDS}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddExpense}
        />
      )}
    </div>
  )
}

// ============ Add Expense Modal Component ============
interface AddExpenseModalProps {
  friends: User[]
  groups: Group[]
  onClose: () => void
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
}

function AddExpenseModal({ friends, groups, onClose, onSubmit }: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(ME_ID)
  const [splitWith, setSplitWith] = useState<string[]>([ME_ID, ...friends.map(f => f.id)])
  const [groupId, setGroupId] = useState<string>('')
  const [error, setError] = useState('')

  const handleToggleSplit = (id: string) => {
    setSplitWith(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amountNum = parseFloat(amount)
    if (!description.trim()) {
      setError('Please enter a description')
      return
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }
    if (splitWith.length < 2) {
      setError('Please select at least 2 people to split with')
      return
    }
    if (!splitWith.includes(paidBy)) {
      setError('The payer must be included in the split')
      return
    }

    onSubmit({
      description: description.trim(),
      amount: amountNum,
      currency: 'USD',
      paidBy,
      splitBetween: splitWith,
      splitMode: 'equal',
      groupId: groupId || undefined,
    })
  }

  const perPersonAmount = splitWith.length > 0 ? parseFloat(amount) / splitWith.length : 0

  return (
    <div className="trips-modal-overlay" onClick={onClose}>
      <div className="trips-modal" onClick={e => e.stopPropagation()}>
        <div className="trips-modal-header">
          <h2>Add Expense</h2>
          <button className="trips-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="trips-modal-form">
          {error && <div className="trips-modal-error">{error}</div>}
          
          <div className="trips-form-group">
            <label>Description</label>
            <input
              type="text"
              placeholder="What was this expense for?"
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
            <label>Paid by</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="trips-select"
            >
              <option value={ME_ID}>You</option>
              {friends.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="trips-form-group">
            <label>Split equally with</label>
            <div className="trips-split-list">
              <label className="trips-split-item">
                <input
                  type="checkbox"
                  checked={splitWith.includes(ME_ID)}
                  onChange={() => handleToggleSplit(ME_ID)}
                />
                <span className="trips-split-checkbox"></span>
                <span>You</span>
              </label>
              {friends.map(f => (
                <label key={f.id} className="trips-split-item">
                  <input
                    type="checkbox"
                    checked={splitWith.includes(f.id)}
                    onChange={() => handleToggleSplit(f.id)}
                  />
                  <span className="trips-split-checkbox"></span>
                  <span>{f.name}</span>
                </label>
              ))}
            </div>
            {splitWith.length > 0 && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <div className="trips-split-preview">
                {formatCurrency(perPersonAmount)} per person ({splitWith.length} people)
              </div>
            )}
          </div>

          <div className="trips-form-group">
            <label>Group (optional)</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="trips-select"
            >
              <option value="">No group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="trips-submit-btn">
            Add Expense
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ Styles ============
const styles = `
  .trips-page {
    min-height: 100vh;
    background: linear-gradient(180deg, 
      #050d18 0%, 
      #0a1628 15%, 
      #142136 35%, 
      #1a2d4a 50%, 
      #142136 65%, 
      #0a1628 85%, 
      #050d18 100%
    );
    color: #e2e8f0;
    padding-bottom: 100px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Loading */
  .trips-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .trips-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: trips-spin 0.8s linear infinite;
  }
  @keyframes trips-spin {
    to { transform: rotate(360deg); }
  }

  /* Auth Required */
  .trips-auth-required {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    text-align: center;
  }
  .trips-auth-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  .trips-auth-required h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: #f1f5f9;
  }
  .trips-auth-required p {
    color: #94a3b8;
    margin-bottom: 24px;
  }
  .trips-auth-button {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .trips-auth-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
  }

  /* Header */
  .trips-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .trips-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
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
    transition: background 0.2s, color 0.2s;
  }
  .trips-back-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .trips-header-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }
  .trips-header-subtitle {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0;
  }
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

  /* Summary Cards */
  .trips-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 20px;
  }
  .trips-summary-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .trips-summary-owed {
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.08);
  }
  .trips-summary-owe {
    border-color: rgba(248, 113, 113, 0.2);
    background: rgba(248, 113, 113, 0.05);
  }
  .trips-summary-label {
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .trips-summary-amount {
    font-size: 1.5rem;
    font-weight: 700;
  }

  /* Net Balance */
  .trips-net-balance {
    text-align: center;
    padding: 0 20px 16px;
    font-size: 0.875rem;
    color: #94a3b8;
  }

  /* Colors */
  .trips-positive {
    color: #60a5fa;
  }
  .trips-negative {
    color: #f87171;
  }
  .trips-settled {
    color: #64748b;
  }

  /* Tabs */
  .trips-tabs {
    display: flex;
    gap: 4px;
    padding: 0 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
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
    transition: color 0.2s, border-color 0.2s;
  }
  .trips-tab:hover {
    color: #94a3b8;
  }
  .trips-tab.active {
    color: #60a5fa;
    border-bottom-color: #3b82f6;
  }
  .trips-tab svg {
    opacity: 0.7;
  }
  .trips-tab.active svg {
    opacity: 1;
  }

  /* Content */
  .trips-content {
    padding: 16px 20px;
  }

  /* Friends List */
  .trips-friends-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .trips-friend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    transition: background 0.2s, border-color 0.2s;
  }
  .trips-friend-item:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }
  .trips-friend-avatar {
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
  .trips-friend-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .trips-friend-name {
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .trips-friend-status {
    font-size: 0.75rem;
  }
  .trips-friend-amount {
    font-weight: 600;
    font-size: 0.9375rem;
    text-align: right;
  }

  /* Groups List */
  .trips-groups-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .trips-group-wrapper {
    display: flex;
    flex-direction: column;
  }
  .trips-group-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .trips-group-item:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }
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
  .trips-group-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .trips-group-name {
    font-weight: 500;
    color: #e2e8f0;
  }
  .trips-group-members {
    font-size: 0.75rem;
    color: #64748b;
  }
  .trips-group-balance {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .trips-group-balance > span:first-child {
    font-weight: 600;
    font-size: 0.9375rem;
  }
  .trips-group-status {
    font-size: 0.7rem;
  }
  .trips-group-chevron {
    color: #64748b;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .trips-group-chevron.expanded {
    transform: rotate(180deg);
  }
  .trips-group-members-list {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-top: none;
    border-radius: 0 0 14px 14px;
    padding: 12px 16px;
  }
  .trips-group-members-header {
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
  }
  .trips-group-member {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
  }
  .trips-group-member:not(:last-child) {
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .trips-group-member-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    color: white;
    flex-shrink: 0;
  }
  .trips-group-member-name {
    font-size: 0.875rem;
    color: #e2e8f0;
  }
  .trips-group-member-you {
    font-size: 0.75rem;
    color: #60a5fa;
    margin-left: 4px;
  }
  .trips-group-member-name {
    flex: 1;
  }
  .trips-group-member-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(248, 113, 113, 0.1);
    border: none;
    border-radius: 6px;
    color: #f87171;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, background 0.2s;
  }
  .trips-group-member:hover .trips-group-member-remove {
    opacity: 1;
  }
  .trips-group-member-remove:hover {
    background: rgba(248, 113, 113, 0.2);
  }
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
    transition: background 0.2s, border-color 0.2s;
  }
  .trips-invite-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .trips-invite-dropdown {
    margin-top: 12px;
    background: rgba(10, 22, 40, 0.95);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }
  .trips-invite-dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    font-size: 0.8125rem;
    font-weight: 600;
    color: #60a5fa;
  }
  .trips-invite-dropdown-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
  }
  .trips-invite-dropdown-close:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .trips-invite-empty {
    padding: 16px;
    text-align: center;
    color: #64748b;
    font-size: 0.8125rem;
  }
  .trips-invite-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-top: 1px solid rgba(255,255,255,0.05);
    color: #e2e8f0;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }
  .trips-invite-option:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  .trips-invite-option-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.7rem;
    color: white;
    flex-shrink: 0;
  }
  .trips-invite-option span {
    flex: 1;
  }
  .trips-invite-option svg {
    color: #60a5fa;
  }

  /* Activity List */
  .trips-activity-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .trips-activity-item {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
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
  .trips-activity-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .trips-activity-main {
    font-size: 0.875rem;
    line-height: 1.4;
    color: #cbd5e1;
  }
  .trips-activity-payer {
    font-weight: 600;
    color: #e2e8f0;
  }
  .trips-activity-action {
    color: #94a3b8;
  }
  .trips-activity-amount-inline {
    font-weight: 600;
    color: #60a5fa;
  }
  .trips-activity-desc {
    color: #e2e8f0;
  }
  .trips-activity-details {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 0.75rem;
  }
  .trips-activity-split {
    color: #64748b;
  }
  .trips-activity-owe {
    font-weight: 500;
  }
  .trips-activity-date {
    font-size: 0.7rem;
    color: #475569;
  }

  /* Add Button */
  .trips-add-btn {
    position: fixed;
    bottom: 24px;
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
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .trips-add-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.5);
  }
  .trips-add-btn:active {
    transform: scale(0.96);
  }

  /* Modal */
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
  @media (min-width: 640px) {
    .trips-modal-overlay {
      align-items: center;
    }
    .trips-modal {
      border-radius: 24px;
    }
  }
  .trips-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .trips-modal-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }
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
    transition: background 0.2s, color 0.2s;
  }
  .trips-modal-close:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .trips-modal-form {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .trips-modal-error {
    padding: 12px 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.875rem;
  }
  .trips-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .trips-form-group label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }
  .trips-input {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .trips-input:focus {
    border-color: #3b82f6;
    background: rgba(255,255,255,0.06);
  }
  .trips-input::placeholder {
    color: #475569;
  }
  .trips-amount-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .trips-currency {
    position: absolute;
    left: 16px;
    color: #64748b;
    font-size: 1rem;
    font-weight: 500;
  }
  .trips-amount-input {
    padding-left: 32px;
  }
  .trips-select {
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 1rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }
  .trips-select:focus {
    border-color: #3b82f6;
  }
  .trips-select option {
    background: #0d1a2d;
    color: #e2e8f0;
  }
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
    transition: background 0.2s;
  }
  .trips-split-item:hover {
    background: rgba(255,255,255,0.04);
  }
  .trips-split-item input {
    display: none;
  }
  .trips-split-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, background 0.2s;
    flex-shrink: 0;
  }
  .trips-split-item input:checked + .trips-split-checkbox {
    background: #3b82f6;
    border-color: #3b82f6;
  }
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
  .trips-split-item span:last-child {
    color: #cbd5e1;
    font-size: 0.9375rem;
  }
  .trips-split-preview {
    font-size: 0.8125rem;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
    text-align: center;
  }
  .trips-submit-btn {
    padding: 14px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .trips-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
  }
  .trips-submit-btn:active {
    transform: translateY(0);
  }

  /* Responsive */
  @media (max-width: 480px) {
    .trips-summary {
      gap: 8px;
      padding: 16px;
    }
    .trips-summary-card {
      padding: 12px;
    }
    .trips-summary-amount {
      font-size: 1.25rem;
    }
    .trips-content {
      padding: 12px 16px;
    }
    .trips-friend-item,
    .trips-group-item,
    .trips-activity-item {
      padding: 12px;
    }
  }
`
