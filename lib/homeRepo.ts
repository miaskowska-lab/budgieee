import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================
// HOME PAGE - Data Repository
// Fetches real stats from Supabase for the logged-in user
// ============================================

const POINTS_PER_LIKE = 2

export interface HomeStats {
  communityPoints: number
  dealsPosted: number
  savedDeals: number
  tripsNet: number // positive = owed to me, negative = I owe
  loading: boolean
  error: string | null
}

// Get community points (2 * total likes on my posts)
export async function getCommunityPoints(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0
  
  try {
    // Get all my posts
    const { data: myPosts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId)
    
    if (postsError || !myPosts || myPosts.length === 0) {
      return 0
    }
    
    const postIds = myPosts.map(p => p.id)
    
    // Count likes on my posts
    const { count, error: likesError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .in('post_id', postIds)
    
    if (likesError) {
      console.error('Error fetching likes:', likesError)
      return 0
    }
    
    return (count || 0) * POINTS_PER_LIKE
  } catch (err) {
    console.error('Error in getCommunityPoints:', err)
    return 0
  }
}

// Get number of deals/posts I've created
export async function getDealsPosted(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0
  
  try {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
    
    if (error) {
      console.error('Error fetching deals posted:', error)
      return 0
    }
    
    return count || 0
  } catch (err) {
    console.error('Error in getDealsPosted:', err)
    return 0
  }
}

// Get number of deals I've saved/bookmarked
export async function getSavedDealsCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0
  
  try {
    const { count, error } = await supabase
      .from('post_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching saved deals:', error)
      return 0
    }
    
    return count || 0
  } catch (err) {
    console.error('Error in getSavedDealsCount:', err)
    return 0
  }
}

// Get net balance from trips/splits
// Positive = others owe me, Negative = I owe others
export async function getTripsNetBalance(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0
  
  try {
    // Get all expenses where I'm either the payer or in splits
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        id,
        amount,
        paid_by,
        expense_splits (
          user_id,
          share
        )
      `)
    
    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return 0
    }
    
    if (!expenses || expenses.length === 0) {
      return 0
    }
    
    let netBalance = 0
    
    for (const expense of expenses) {
      const splits = expense.expense_splits as { user_id: string; share: number }[] || []
      const myShare = splits.find(s => s.user_id === userId)?.share || 0
      const iAmPayer = expense.paid_by === userId
      
      // Check if I'm involved in this expense
      const iAmInvolved = iAmPayer || myShare > 0
      if (!iAmInvolved) continue
      
      if (iAmPayer) {
        // I paid - others owe me their shares
        const totalOwedToMe = splits
          .filter(s => s.user_id !== userId)
          .reduce((sum, s) => sum + Number(s.share), 0)
        netBalance += totalOwedToMe
      } else {
        // Someone else paid - I owe them my share
        netBalance -= myShare
      }
    }
    
    return Math.round(netBalance * 100) / 100 // Round to 2 decimals
  } catch (err) {
    console.error('Error in getTripsNetBalance:', err)
    return 0
  }
}

// Fetch all stats in parallel
export async function fetchAllHomeStats(userId: string): Promise<Omit<HomeStats, 'loading'>> {
  if (!isSupabaseConfigured) {
    return {
      communityPoints: 0,
      dealsPosted: 0,
      savedDeals: 0,
      tripsNet: 0,
      error: null,
    }
  }
  
  try {
    const [communityPoints, dealsPosted, savedDeals, tripsNet] = await Promise.all([
      getCommunityPoints(userId),
      getDealsPosted(userId),
      getSavedDealsCount(userId),
      getTripsNetBalance(userId),
    ])
    
    return {
      communityPoints,
      dealsPosted,
      savedDeals,
      tripsNet,
      error: null,
    }
  } catch (err) {
    console.error('Error fetching home stats:', err)
    return {
      communityPoints: 0,
      dealsPosted: 0,
      savedDeals: 0,
      tripsNet: 0,
      error: 'Failed to load stats',
    }
  }
}
