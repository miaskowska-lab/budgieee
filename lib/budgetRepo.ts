import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================
// BUDGET REPOSITORY
// Queries for Life Budget feature
// ============================================

export interface BudgetCategory {
  id: string
  user_id: string
  month: string
  name: string
  emoji: string
  color: string
  limit_amount: number
  spent: number // computed
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

// Ensure budget is seeded with default categories
export async function ensureBudgetSeed(month: string = getCurrentMonth()) {
  if (!isSupabaseConfigured) return { error: null }
  
  const { error } = await supabase.rpc('ensure_budget_seed', { p_month: month })
  return { error }
}

// Get budget for a month
export async function getBudget(month: string = getCurrentMonth()): Promise<{ data: Budget | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: null }
  
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .single()
  
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

// Add expense
export async function addExpense(
  categoryId: string,
  title: string,
  amount: number,
  occurredAt: string = new Date().toISOString(),
  note?: string
): Promise<{ data: BudgetExpense | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase.rpc('add_budget_expense', {
    p_category_id: categoryId,
    p_title: title,
    p_amount: amount,
    p_occurred_at: occurredAt,
    p_note: note || null,
  })
  
  return { data, error }
}

// Delete expense
export async function deleteExpense(expenseId: string): Promise<{ success: boolean; error: any }> {
  if (!isSupabaseConfigured) return { success: false, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase.rpc('delete_budget_expense', {
    p_expense_id: expenseId,
  })
  
  return { success: !!data, error }
}

// Update category budget
export async function updateCategoryBudget(categoryId: string, limitAmount: number): Promise<{ data: BudgetCategory | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase.rpc('update_category_budget', {
    p_category_id: categoryId,
    p_limit_amount: limitAmount,
  })
  
  return { data, error }
}

// Update total budget
export async function updateTotalBudget(month: string, totalBudget: number): Promise<{ data: Budget | null; error: any }> {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  
  const { data, error } = await supabase.rpc('update_total_budget', {
    p_month: month,
    p_total_budget: totalBudget,
  })
  
  return { data, error }
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

// Delete a category (and all its expenses)
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
