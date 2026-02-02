import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getCurrentMonth } from './budgetRepo'
import { getUserPoints, getSavedDeals } from './communityRepo'
import { getMyBalances } from './tripsRepo'

// ============================================
// HOME PAGE - Data Repository
// Fetches stats directly from tables (no RPC needed)
// ============================================

export interface HomeDashboard {
  email: string | null
  displayName: string | null
  communityPoints: number
  dealsPosted: number
  savedDeals: number
  tripsNet: number
  budgetTotal: number
  budgetSpent: number
}

export interface HomeStats {
  communityPoints: number
  dealsPosted: number
  savedDeals: number
  tripsNet: number
  budgetTotal: number
  budgetSpent: number
  loading: boolean
  error: string | null
}

// Fetch home dashboard stats directly from tables
export async function getHomeDashboard(): Promise<{ data: HomeDashboard | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      data: {
        email: null,
        displayName: null,
        communityPoints: 0,
        dealsPosted: 0,
        savedDeals: 0,
        tripsNet: 0,
        budgetTotal: 0,
        budgetSpent: 0,
      },
      error: null,
    }
  }
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single()
    
    // Get current month budget
    const currentMonth = getCurrentMonth()
    const { data: budget } = await supabase
      .from('budgets')
      .select('total_budget')
      .eq('month', currentMonth)
      .maybeSingle()
    
    // Get total spent this month
    const { data: expenses } = await supabase
      .from('budget_expenses')
      .select('amount')
      .eq('month', currentMonth)
    
    const totalSpent = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
    
    // Community stats
    let communityPoints = 0
    let dealsPosted = 0
    let savedDeals = 0
    
    try {
      // Get community points from RPC
      const { points } = await getUserPoints()
      communityPoints = points || 0
      
      // Get saved deals count
      const { data: savedDealsData } = await getSavedDeals()
      savedDeals = savedDealsData?.length || 0
      
      // Get deals posted count (posts authored by user)
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id')
        .eq('author_id', user.id)
      dealsPosted = postsData?.length || 0
    } catch (err) {
      console.error('Error fetching community stats:', err)
    }
    
    // Trips net balance
    let tripsNet = 0
    try {
      const { data: balances } = await getMyBalances()
      if (balances) {
        // Sum up all balances: positive = others owe me, negative = I owe others
        tripsNet = balances.reduce((sum, b) => sum + b.balance, 0)
      }
    } catch (err) {
      console.error('Error fetching trips balance:', err)
    }
    
    return {
      data: {
        email: profile?.email || user.email || null,
        displayName: profile?.full_name || null,
        communityPoints,
        dealsPosted,
        savedDeals,
        tripsNet,
        budgetTotal: budget?.total_budget || 0,
        budgetSpent: totalSpent,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error in getHomeDashboard:', err)
    return { data: null, error: 'Failed to load dashboard' }
  }
}

// Legacy function for backwards compatibility
export async function fetchAllHomeStats(userId: string): Promise<Omit<HomeStats, 'loading'>> {
  const { data, error } = await getHomeDashboard()
  
  if (error || !data) {
    return {
      communityPoints: 0,
      dealsPosted: 0,
      savedDeals: 0,
      tripsNet: 0,
      budgetTotal: 0,
      budgetSpent: 0,
      error: error || 'Failed to load stats',
    }
  }
  
  return {
    communityPoints: data.communityPoints,
    dealsPosted: data.dealsPosted,
    savedDeals: data.savedDeals,
    tripsNet: data.tripsNet,
    budgetTotal: data.budgetTotal,
    budgetSpent: data.budgetSpent,
    error: null,
  }
}
