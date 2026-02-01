import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getCurrentMonth } from './budgetRepo'

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
    
    // Community stats (not connected yet - return 0)
    // TODO: Connect when community feature uses Supabase
    const communityPoints = 0
    const dealsPosted = 0
    const savedDeals = 0
    
    // Trips net balance (not connected yet - return 0)
    // TODO: Connect when trips feature uses Supabase
    const tripsNet = 0
    
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
