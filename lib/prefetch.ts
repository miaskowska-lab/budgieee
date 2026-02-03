// ============================================
// Global Data Prefetch Cache
// Pre-loads data after login so pages load instantly
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient'

// Cache storage
interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

interface PrefetchCache {
  budgetCategories?: CacheEntry<any[]>
  budgetExpenses?: CacheEntry<any[]>
  budgetMonth?: string
  tripsGroups?: CacheEntry<any[]>
  tripsExpenses?: CacheEntry<any[]>
  tripsSettlements?: CacheEntry<any[]>
  tripsBalances?: CacheEntry<any[]>
  tripsPendingInvites?: CacheEntry<any[]>
}

// Global cache (persists across navigation)
let cache: PrefetchCache = {}
const CACHE_TTL = 60000 // 1 minute cache

// Get current month helper
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// Check if cache is valid
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < CACHE_TTL
}

// ============ Budget Prefetch ============
export async function prefetchBudgetData(): Promise<void> {
  if (!isSupabaseConfigured) return
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const currentMonth = getCurrentMonth()
  cache.budgetMonth = currentMonth

  try {
    // Fetch categories for current month
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .order('created_at', { ascending: true })

    if (categories) {
      cache.budgetCategories = { data: categories, fetchedAt: Date.now() }
      
      // Fetch expenses for these categories
      if (categories.length > 0) {
        const categoryIds = categories.map(c => c.id)
        const { data: expenses } = await supabase
          .from('budget_expenses')
          .select('*')
          .in('category_id', categoryIds)
          .order('occurred_at', { ascending: false })

        if (expenses) {
          cache.budgetExpenses = { data: expenses, fetchedAt: Date.now() }
        }
      }
    }
  } catch (err) {
    console.error('prefetchBudgetData error:', err)
  }
}

// ============ Trips Prefetch ============
export async function prefetchTripsData(): Promise<void> {
  if (!isSupabaseConfigured) return
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    // Fetch groups with members
    const { data: groups } = await supabase
      .from('groups')
      .select(`
        id, name, emoji, owner_id, created_at,
        group_members (
          id, user_id, role, joined_at,
          profiles:user_id (user_id, email, full_name, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (groups) {
      cache.tripsGroups = { data: groups, fetchedAt: Date.now() }
      
      // Fetch expenses for all groups
      const groupIds = groups.map(g => g.id)
      if (groupIds.length > 0) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select(`
            id, description, amount, currency, paid_by, group_id, created_by, created_at,
            expense_splits (id, expense_id, user_id, share)
          `)
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })

        if (expenses) {
          cache.tripsExpenses = { data: expenses, fetchedAt: Date.now() }
        }

        // Fetch settlements
        const { data: settlements } = await supabase
          .from('settlements')
          .select('*')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })

        if (settlements) {
          cache.tripsSettlements = { data: settlements, fetchedAt: Date.now() }
        }
      }
    }

    // Fetch pending invites
    const { data: invites } = await supabase
      .from('invites')
      .select(`
        id, invited_by, invited_email, group_id, status, created_at,
        groups:group_id (name, emoji)
      `)
      .eq('invited_email', user.email?.toLowerCase())
      .eq('status', 'pending')

    if (invites) {
      cache.tripsPendingInvites = { data: invites, fetchedAt: Date.now() }
    }

    // Fetch balances
    const { data: balances } = await supabase.rpc('get_user_balances')
    if (balances) {
      cache.tripsBalances = { data: balances, fetchedAt: Date.now() }
    }
  } catch (err) {
    console.error('prefetchTripsData error:', err)
  }
}

// ============ Prefetch All ============
export async function prefetchAllData(): Promise<void> {
  if (!isSupabaseConfigured) return
  
  // Run prefetch in parallel
  await Promise.all([
    prefetchBudgetData(),
    prefetchTripsData(),
  ])
}

// ============ Get Cached Data ============
export function getCachedBudgetData(month: string): { 
  categories: any[] | null
  expenses: any[] | null
  isValid: boolean 
} {
  const monthMatches = cache.budgetMonth === month
  const categoriesValid = monthMatches && isCacheValid(cache.budgetCategories)
  const expensesValid = monthMatches && isCacheValid(cache.budgetExpenses)
  
  return {
    categories: categoriesValid ? cache.budgetCategories!.data : null,
    expenses: expensesValid ? cache.budgetExpenses!.data : null,
    isValid: categoriesValid && expensesValid,
  }
}

export function getCachedTripsData(): {
  groups: any[] | null
  expenses: any[] | null
  settlements: any[] | null
  balances: any[] | null
  pendingInvites: any[] | null
  isValid: boolean
} {
  return {
    groups: isCacheValid(cache.tripsGroups) ? cache.tripsGroups!.data : null,
    expenses: isCacheValid(cache.tripsExpenses) ? cache.tripsExpenses!.data : null,
    settlements: isCacheValid(cache.tripsSettlements) ? cache.tripsSettlements!.data : null,
    balances: isCacheValid(cache.tripsBalances) ? cache.tripsBalances!.data : null,
    pendingInvites: isCacheValid(cache.tripsPendingInvites) ? cache.tripsPendingInvites!.data : null,
    isValid: isCacheValid(cache.tripsGroups),
  }
}

// ============ Invalidate Cache ============
export function invalidateBudgetCache(): void {
  delete cache.budgetCategories
  delete cache.budgetExpenses
  delete cache.budgetMonth
}

export function invalidateTripsCache(): void {
  delete cache.tripsGroups
  delete cache.tripsExpenses
  delete cache.tripsSettlements
  delete cache.tripsBalances
  delete cache.tripsPendingInvites
}

export function invalidateAllCache(): void {
  cache = {}
}
