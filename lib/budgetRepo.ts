import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================
// BUDGET REPOSITORY
// Queries for Life Budget feature
// 
// All operations use direct table queries with RLS.
// RLS policies enforce: user_id = auth.uid()
// ============================================

export interface BudgetCategory {
  id: string
  user_id: string
  month: string
  name: string
  emoji: string
  color: string
  limit_amount: number
  spent: number // computed client-side
}

export interface BudgetExpense {
  id: string
  user_id: string
  category_id: string
  month: string
  title: string
  note: string | null
  amount: number
  occurred_at: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  month: string
  total_budget: number
}

// Get current month as date string (first day)
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// Ensure budget exists for month (creates if not exists)
export async function ensureBudgetSeed(month: string = getCurrentMonth()) {
  if (!isSupabaseConfigured) return { error: null }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { message: 'Not authenticated' } }
  
  // Check if budget exists
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('month', month)
    .single()
  
  // If no budget exists, create one with $0
  if (!existing) {
    const { error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        month,
        total_budget: 0,
      })
    if (error && error.code !== '23505') { // Ignore unique constraint violations
      return { error }
    }
  }
  
  return { error: null }
}

// Get budget for a month
export async function getBudget(month: string = getCurrentMonth()): Promise<{ data: Budget | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: null }
  
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .maybeSingle() // Use maybeSingle to avoid error if not found
  
  return { data, error }
}

// Get categories with spent amounts for a month
export async function getCategoriesWithSpent(month: string = getCurrentMonth()): Promise<{ data: BudgetCategory[] | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: null }
  
  // Get categories
  const { data: categories, error: catError } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('month', month)
    .order('name')
  
  if (catError) return { data: null, error: catError }
  if (!categories) return { data: [], error: null }
  
  // Get expense totals per category
  const { data: expenses, error: expError } = await supabase
    .from('budget_expenses')
    .select('category_id, amount')
    .eq('month', month)
  
  if (expError) return { data: null, error: expError }
  
  // Calculate spent per category
  const spentMap: Record<string, number> = {}
  expenses?.forEach(exp => {
    spentMap[exp.category_id] = (spentMap[exp.category_id] || 0) + Number(exp.amount)
  })
  
  // Merge spent into categories
  const categoriesWithSpent: BudgetCategory[] = categories.map(cat => ({
    ...cat,
    spent: spentMap[cat.id] || 0,
  }))
  
  return { data: categoriesWithSpent, error: null }
}

// Get expenses for a category
export async function getCategoryExpenses(categoryId: string): Promise<{ data: BudgetExpense[] | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: null }
  
  const { data, error } = await supabase
    .from('budget_expenses')
    .select('*')
    .eq('category_id', categoryId)
    .order('occurred_at', { ascending: false })
    .limit(200)
  
  return { data, error }
}

// Add expense - uses direct insert instead of RPC
export async function addExpense(
  categoryId: string,
  title: string,
  amount: number,
  occurredAt: string = new Date().toISOString(),
  note?: string
): Promise<{ data: BudgetExpense | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }
  
  // Get the category to find its month
  const { data: category, error: catError } = await supabase
    .from('budget_categories')
    .select('month')
    .eq('id', categoryId)
    .single()
  
  if (catError || !category) {
    return { data: null, error: catError || { message: 'Category not found' } }
  }
  
  // Parse the occurred_at date to just the date part
  const occurredDate = occurredAt.split('T')[0]
  
  // Insert the expense
  const { data, error } = await supabase
    .from('budget_expenses')
    .insert({
      user_id: user.id,
      category_id: categoryId,
      month: category.month,
      title,
      amount,
      note: note || null,
      occurred_at: occurredDate,
    })
    .select()
    .single()
  
  return { data, error }
}

// Delete expense - uses direct delete instead of RPC
export async function deleteExpense(expenseId: string): Promise<{ success: boolean; error: any }> {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase not configured' } }
  
  const { error } = await supabase
    .from('budget_expenses')
    .delete()
    .eq('id', expenseId)
  
  return { success: !error, error }
}

// Update category budget - uses direct update instead of RPC
export async function updateCategoryBudget(categoryId: string, limitAmount: number): Promise<{ data: BudgetCategory | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase
    .from('budget_categories')
    .update({ limit_amount: limitAmount })
    .eq('id', categoryId)
    .select()
    .single()
  
  return { data: data ? { ...data, spent: 0 } : null, error }
}

// Update total budget - uses direct upsert instead of RPC
export async function updateTotalBudget(month: string, totalBudget: number): Promise<{ data: Budget | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }
  
  // Try to update existing budget first
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('month', month)
    .single()
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('budgets')
      .update({ total_budget: totalBudget })
      .eq('month', month)
      .select()
      .single()
    return { data, error }
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        month,
        total_budget: totalBudget,
      })
      .select()
      .single()
    return { data, error }
  }
}

// Create a new category
export async function createCategory(
  month: string,
  name: string,
  emoji: string,
  color: string,
  limitAmount: number
): Promise<{ data: BudgetCategory | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }
  
  const { data, error } = await supabase
    .from('budget_categories')
    .insert({
      user_id: user.id,
      month,
      name,
      emoji,
      color,
      limit_amount: limitAmount,
    })
    .select()
    .single()
  
  return { data: data ? { ...data, spent: 0 } : null, error }
}

// Delete a category (and all its expenses via cascade)
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error: any }> {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase not configured' } }
  
  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', categoryId)
  
  return { success: !error, error }
}

// Update category details
export async function updateCategory(
  categoryId: string,
  updates: { name?: string; emoji?: string; color?: string; limit_amount?: number }
): Promise<{ data: BudgetCategory | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase
    .from('budget_categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single()
  
  return { data, error }
}

// Reset month expenses - deletes all expenses for a given month
export async function resetMonthExpenses(month: string): Promise<{ success: boolean; deletedCount: number; error: any }> {
  if (!isSupabaseConfigured) return { success: false, deletedCount: 0, error: { message: 'Supabase not configured' } }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, deletedCount: 0, error: { message: 'Not authenticated' } }
  
  // Delete all expenses for this month
  // The month column stores the first day of the month (e.g., '2026-02-01')
  const { data, error } = await supabase
    .from('budget_expenses')
    .delete()
    .eq('user_id', user.id)
    .eq('month', month)
    .select('id') // Return deleted rows to count them
  
  if (error) {
    return { success: false, deletedCount: 0, error }
  }
  
  return { success: true, deletedCount: data?.length || 0, error: null }
}
