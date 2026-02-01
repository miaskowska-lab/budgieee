import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================
// HOME PAGE - Data Repository
// Uses get_home_dashboard RPC for efficient stats loading
// All stats are persisted in user_stats table via triggers
// 
// USER DATA OWNERSHIP:
// All stats are user-specific. The RPC uses auth.uid() to
// fetch only the current user's data. When RLS is enabled,
// policies enforce user_id = auth.uid() on all tables.
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

// Fetch all home dashboard stats via single RPC call
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
    const { data, error } = await supabase.rpc('get_home_dashboard')
    
    if (error) {
      console.error('Error fetching home dashboard:', error)
      return { data: null, error: error.message }
    }
    
    if (data?.error) {
      return { data: null, error: data.error }
    }
    
    return {
      data: {
        email: data.email || null,
        displayName: data.display_name || null,
        communityPoints: data.community_points || 0,
        dealsPosted: data.deals_posted || 0,
        savedDeals: data.saved_deals || 0,
        tripsNet: data.trips_net || 0,
        budgetTotal: data.budget_total || 0,
        budgetSpent: data.budget_spent || 0,
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
