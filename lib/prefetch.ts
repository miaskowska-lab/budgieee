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
// Note: Trips prefetch is disabled for now - the queries are complex and can fail.
// The trips page loads data directly via tripsRepo which is more reliable.
export async function prefetchTripsData(): Promise<void> {
  // Disabled - let trips page load data directly for reliability
  return
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
