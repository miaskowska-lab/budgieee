// ============================================
// Trips & Splits - Data Repository
// Client-side Supabase queries for Groups, Expenses, Splits
// 
// USER DATA OWNERSHIP:
// - Groups: owner_id = auth.uid() for creators
// - Members: RLS ensures you only see groups you're in
// - Expenses: visible to all group members via RLS
// - Balances: calculated via get_user_balances() RPC
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============ Types ============
export interface Profile {
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface GroupMember {
  id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile: Profile
}

export interface Group {
  id: string
  name: string
  emoji: string
  owner_id: string
  created_at: string
  members: GroupMember[]
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  share: number
}

export interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  paid_by: string
  group_id: string | null
  created_by: string
  created_at: string
  splits: ExpenseSplit[]
  payer_profile?: Profile
}

export interface PendingInvite {
  id: string
  invited_by: string
  invited_email: string
  group_id: string | null
  group_name?: string
  group_emoji?: string
  inviter_name?: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface Balance {
  other_user_id: string
  other_user_email: string
  other_user_name: string | null
  balance: number // positive = they owe you, negative = you owe them
}

// ============ Groups ============

/** Get all groups the current user is a member of */
export async function getMyGroups(): Promise<{ data: Group[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get groups (RLS filters to groups user is member of)
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, emoji, owner_id, created_at')
    .order('created_at', { ascending: false })

  if (groupsError) {
    console.error('getMyGroups groups:', groupsError)
    return { data: null, error: groupsError.message }
  }

  if (!groups || groups.length === 0) {
    return { data: [], error: null }
  }

  // Get all members for these groups
  const groupIds = groups.map(g => g.id)
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, role, joined_at')
    .in('group_id', groupIds)

  if (membersError) {
    console.error('getMyGroups members:', membersError)
    return { data: null, error: membersError.message }
  }

  // Get profiles for all members
  const memberUserIds = Array.from(new Set((members || []).map(m => m.user_id)))
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, avatar_url')
    .in('user_id', memberUserIds)

  if (profilesError) {
    console.error('getMyGroups profiles:', profilesError)
    return { data: null, error: profilesError.message }
  }

  const profileMap: Record<string, Profile> = {}
  ;(profiles || []).forEach(p => {
    profileMap[p.user_id] = p
  })

  // Assemble groups with members
  const result: Group[] = groups.map(g => ({
    ...g,
    members: (members || [])
      .filter(m => m.group_id === g.id)
      .map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as 'owner' | 'member',
        joined_at: m.joined_at,
        profile: profileMap[m.user_id] || { user_id: m.user_id, email: '', full_name: null, avatar_url: null }
      }))
  }))

  return { data: result, error: null }
}

/** Create a new group */
export async function createGroup(name: string, emoji: string = '✈️'): Promise<{ data: Group | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Create the group
  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({ name, emoji, owner_id: user.id })
    .select()
    .single()

  if (groupError) {
    console.error('createGroup:', groupError)
    return { data: null, error: groupError.message }
  }

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: newGroup.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('createGroup add owner:', memberError)
    // Group was created, just couldn't add member - try to continue
  }

  // Get creator's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, avatar_url')
    .eq('user_id', user.id)
    .single()

  const result: Group = {
    ...newGroup,
    members: [{
      id: 'temp',
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
      profile: profile || { user_id: user.id, email: user.email || '', full_name: null, avatar_url: null }
    }]
  }

  return { data: result, error: null }
}

/** Delete a group (owner only) */
export async function deleteGroup(groupId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    console.error('deleteGroup:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ============ Invites ============

/** Invite someone to a group by email */
export async function inviteToGroup(groupId: string, email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from('invites')
    .select('id')
    .eq('group_id', groupId)
    .eq('invited_email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return { error: 'Already invited' }
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existingMember) {
    const { data: isMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', existingMember.user_id)
      .maybeSingle()

    if (isMember) {
      return { error: 'Already a member' }
    }
  }

  // Create invite
  const { error } = await supabase
    .from('invites')
    .insert({
      invited_by: user.id,
      invited_email: email.toLowerCase(),
      group_id: groupId,
      status: 'pending'
    })

  if (error) {
    console.error('inviteToGroup:', error)
    return { error: error.message }
  }

  // Send invite email via API route (server-side)
  try {
    const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email?.split('@')[0] || 'Someone'
    const groupName = group?.name || 'a group'
    
    // Call API route to send email (works from client)
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://budgieee.com'
    const inviteLink = `${appUrl}/trips?invite=${groupId}`
    
    console.log('Sending invite email:', { email: email.toLowerCase(), inviterName, groupName, inviteLink })
    
    fetch('/api/notifications/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        inviterName,
        groupName,
        inviteLink
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Invite email sent successfully')
        } else {
          console.error('Invite email failed:', data.error)
        }
      })
      .catch(err => console.error('send-invite-email (trips):', err))
  } catch (err) {
    console.error('send-invite-email (trips) exception:', err)
  }

  return { error: null }
}

/** Get pending invites for the current user */
export async function getMyPendingInvites(): Promise<{ data: PendingInvite[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get user's email from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { data: [], error: null }
  }

  // Get pending invites for this email
  const { data: invites, error } = await supabase
    .from('invites')
    .select('id, invited_by, invited_email, group_id, status, created_at')
    .eq('invited_email', profile.email.toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyPendingInvites:', error)
    return { data: null, error: error.message }
  }

  if (!invites || invites.length === 0) {
    return { data: [], error: null }
  }

  // Get group details
  const groupIds = invites.filter(i => i.group_id).map(i => i.group_id)
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, emoji')
    .in('id', groupIds)

  const groupMap: Record<string, { name: string; emoji: string }> = {}
  ;(groups || []).forEach(g => {
    groupMap[g.id] = { name: g.name, emoji: g.emoji }
  })

  // Get inviter profiles
  const inviterIds = Array.from(new Set(invites.map(i => i.invited_by)))
  const { data: inviterProfiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', inviterIds)

  const inviterMap: Record<string, string> = {}
  ;(inviterProfiles || []).forEach(p => {
    inviterMap[p.user_id] = p.full_name || p.email?.split('@')[0] || 'A friend'
  })

  const result: PendingInvite[] = invites.map(i => ({
    ...i,
    status: i.status as 'pending' | 'accepted' | 'declined',
    group_name: i.group_id ? groupMap[i.group_id]?.name : undefined,
    group_emoji: i.group_id ? groupMap[i.group_id]?.emoji : undefined,
    inviter_name: inviterMap[i.invited_by] || 'A friend'
  }))

  return { data: result, error: null }
}

/** Accept an invite */
export async function acceptInvite(inviteId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the invite
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('id, group_id, status')
    .eq('id', inviteId)
    .single()

  if (fetchError || !invite) {
    return { error: 'Invite not found' }
  }

  if (invite.status !== 'pending') {
    return { error: 'Invite already responded to' }
  }

  // Update invite status
  const { error: updateError } = await supabase
    .from('invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  if (updateError) {
    console.error('acceptInvite update:', updateError)
    return { error: updateError.message }
  }

  // Add user to group members
  if (invite.group_id) {
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: invite.group_id, user_id: user.id, role: 'member' })

    if (memberError && !memberError.message.includes('duplicate')) {
      console.error('acceptInvite add member:', memberError)
      return { error: memberError.message }
    }
  }

  return { error: null }
}

/** Decline an invite */
export async function declineInvite(inviteId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { error } = await supabase
    .from('invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)

  if (error) {
    console.error('declineInvite:', error)
    return { error: error.message }
  }

  return { error: null }
}

/** Leave a group */
export async function leaveGroup(groupId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) {
    console.error('leaveGroup:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ============ Expenses ============

/** Get expenses for a group */
export async function getGroupExpenses(groupId: string): Promise<{ data: Expense[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  // Get expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, description, amount, currency, paid_by, group_id, created_by, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (expensesError) {
    console.error('getGroupExpenses:', expensesError)
    return { data: null, error: expensesError.message }
  }

  if (!expenses || expenses.length === 0) {
    return { data: [], error: null }
  }

  // Get splits for these expenses
  const expenseIds = expenses.map(e => e.id)
  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, share')
    .in('expense_id', expenseIds)

  if (splitsError) {
    console.error('getGroupExpenses splits:', splitsError)
    return { data: null, error: splitsError.message }
  }

  // Get payer profiles
  const payerIds = Array.from(new Set(expenses.map(e => e.paid_by)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, avatar_url')
    .in('user_id', payerIds)

  const profileMap: Record<string, Profile> = {}
  ;(profiles || []).forEach(p => {
    profileMap[p.user_id] = p
  })

  const result: Expense[] = expenses.map(e => ({
    ...e,
    splits: (splits || []).filter(s => s.expense_id === e.id),
    payer_profile: profileMap[e.paid_by]
  }))

  return { data: result, error: null }
}

/** Add an expense to a group */
export async function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  splitAmong: { userId: string; share: number }[],
  currency: string = 'USD'
): Promise<{ data: Expense | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Create expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      description,
      amount,
      currency,
      paid_by: paidBy,
      group_id: groupId,
      created_by: user.id
    })
    .select()
    .single()

  if (expenseError) {
    console.error('addExpense:', expenseError)
    return { data: null, error: expenseError.message }
  }

  // Create splits
  const splitsToInsert = splitAmong.map(s => ({
    expense_id: expense.id,
    user_id: s.userId,
    share: s.share
  }))

  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsToInsert)
    .select()

  if (splitsError) {
    console.error('addExpense splits:', splitsError)
    // Expense was created, continue with partial data
  }

  const result: Expense = {
    ...expense,
    splits: splits || []
  }

  // Notify participants about the new expense (fire and forget)
  try {
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()
    
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', paidBy)
      .single()
    
    const payerName = payerProfile?.full_name || payerProfile?.email?.split('@')[0] || 'Someone'
    const groupName = group?.name || 'a group'
    
    const { notifyExpenseAdded } = await import('./notifications')
    
    notifyExpenseAdded(
      paidBy,
      payerName,
      groupId,
      groupName,
      expense.id,
      description,
      amount,
      splitAmong
    ).catch(console.error) // Don't block on notification
  } catch (notifError) {
    console.error('Failed to notify expense participants:', notifError)
  }

  return { data: result, error: null }
}

/** Delete an expense */
export async function deleteExpense(expenseId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' }
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) {
    console.error('deleteExpense:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ============ Balances ============

/** Get balance summary for current user */
export async function getMyBalances(): Promise<{ data: Balance[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Call the RPC function
  const { data, error } = await supabase.rpc('get_user_balances', { p_user_id: user.id })

  if (error) {
    console.error('getMyBalances:', error)
    return { data: null, error: error.message }
  }

  const result: Balance[] = (data || []).map((row: any) => ({
    other_user_id: row.other_user_id,
    other_user_email: row.other_user_email,
    other_user_name: row.other_user_name,
    balance: Number(row.balance)
  }))

  return { data: result, error: null }
}

/** Get balances within a specific group */
export async function getGroupBalances(groupId: string): Promise<{ data: Balance[] | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get all expenses for this group
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, amount, paid_by')
    .eq('group_id', groupId)

  if (expensesError) {
    console.error('getGroupBalances expenses:', expensesError)
    return { data: null, error: expensesError.message }
  }

  if (!expenses || expenses.length === 0) {
    return { data: [], error: null }
  }

  // Get splits
  const expenseIds = expenses.map(e => e.id)
  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('expense_id, user_id, share')
    .in('expense_id', expenseIds)

  if (splitsError) {
    console.error('getGroupBalances splits:', splitsError)
    return { data: null, error: splitsError.message }
  }

  // Calculate balances manually for this group
  // positive balance = they owe current user
  // negative balance = current user owes them
  const balanceMap: Record<string, number> = {}

  expenses.forEach(expense => {
    const expenseSplits = (splits || []).filter(s => s.expense_id === expense.id)
    
    expenseSplits.forEach(split => {
      if (expense.paid_by === user.id && split.user_id !== user.id) {
        // Current user paid, someone else owes
        balanceMap[split.user_id] = (balanceMap[split.user_id] || 0) + split.share
      } else if (expense.paid_by !== user.id && split.user_id === user.id) {
        // Someone else paid, current user owes
        balanceMap[expense.paid_by] = (balanceMap[expense.paid_by] || 0) - split.share
      }
    })
  })

  // Get profiles for users with balances
  const userIds = Object.keys(balanceMap)
  if (userIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds)

  const profileMap: Record<string, { email: string; full_name: string | null }> = {}
  ;(profiles || []).forEach(p => {
    profileMap[p.user_id] = { email: p.email, full_name: p.full_name }
  })

  const result: Balance[] = Object.entries(balanceMap)
    .filter(([_, balance]) => Math.abs(balance) > 0.01)
    .map(([userId, balance]) => ({
      other_user_id: userId,
      other_user_email: profileMap[userId]?.email || '',
      other_user_name: profileMap[userId]?.full_name || null,
      balance
    }))

  return { data: result, error: null }
}
