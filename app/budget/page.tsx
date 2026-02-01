'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import {
  ensureBudgetSeed,
  getBudget,
  getCategoriesWithSpent,
  getCategoryExpenses,
  addExpense,
  deleteExpense,
  updateCategoryBudget,
  updateTotalBudget,
  getCurrentMonth,
  createCategory,
  deleteCategory,
  updateCategory,
  type BudgetCategory,
  type BudgetExpense,
} from '@/lib/budgetRepo'
import type { User } from '@supabase/supabase-js'

// ============================================
// LIFE BUDGET - Personal Finance Tracker
// Connected to Supabase backend
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(amount))
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
    ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Get weeks in month with actual date ranges
function getWeeksInMonth(year: number, month: number): { label: string; start: Date; end: Date }[] {
  const weeks: { label: string; start: Date; end: Date }[] = []
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const monthName = first.toLocaleDateString('en-US', { month: 'short' })
  
  let startDay = 1
  while (startDay <= last.getDate()) {
    const endDay = Math.min(startDay + 6, last.getDate())
    const start = new Date(year, month, startDay)
    const end = new Date(year, month, endDay)
    weeks.push({
      label: `${monthName} ${startDay}-${endDay}`,
      start,
      end,
    })
    startDay += 7
  }
  return weeks
}

function getInitials(email: string): string {
  if (!email) return 'U'
  return email.charAt(0).toUpperCase()
}

function formatMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getAvailableMonths(): string[] {
  const months: string[] = []
  const now = new Date()
  // Show last 12 months + current + next month
  for (let i = -12; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}-01`)
  }
  return months.reverse() // Most recent first
}

// Color palette for categories
const COLOR_OPTIONS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
]

// Emoji options for categories
const EMOJI_OPTIONS = ['🛒', '🚗', '💡', '📱', '📦', '🏠', '🎮', '✈️', '🍔', '☕', '👕', '💊', '🎬', '📚', '💪', '🎁']

// ============ Custom Tooltip ============
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    if (data.isUnspent) {
      return (
        <div className="custom-tooltip">
          <div className="custom-tooltip-name">Unspent Budget</div>
          <div className="custom-tooltip-value">{formatCurrency(data.value)} remaining</div>
        </div>
      )
    }
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-name">{data.emoji} {data.name}</div>
        <div className="custom-tooltip-value">
          Spent: {formatCurrency(data.spent)} / {formatCurrency(data.budget)}
        </div>
      </div>
    )
  }
  return null
}

// ============ Main Component ============
export default function BudgetPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Data state
  const [totalBudget, setTotalBudget] = useState(2000)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [allLocalExpenses, setAllLocalExpenses] = useState<BudgetExpense[]>([]) // ALL expenses across all months
  const [allLocalCategories, setAllLocalCategories] = useState<BudgetCategory[]>([]) // ALL categories across all months
  const [dataLoading, setDataLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // UI state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false)
  const [showManageBudgetModal, setShowManageBudgetModal] = useState(false)
  const [editingTotal, setEditingTotal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)

  // Dev bypass
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' || !isSupabaseConfigured

  // Show toast
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load data from Supabase (only used when Supabase is configured)
  const loadData = useCallback(async () => {
    if (!user && !devBypass) return
    
    // In dev mode, don't fetch from Supabase - use local state instead
    if (!isSupabaseConfigured) {
      setDataLoading(false)
      return
    }
    
    setDataLoading(true)
    
    // Ensure budget row exists for this month (creates with $0 budget, no demo data)
    await ensureBudgetSeed(currentMonth)
    
    // Fetch budget
    const { data: budgetData } = await getBudget(currentMonth)
    if (budgetData) {
      setTotalBudget(Number(budgetData.total_budget))
    } else {
      // New user starts with $0 budget
      setTotalBudget(0)
    }
    
    // Fetch categories with spent (empty for new users)
    const { data: categoriesData, error } = await getCategoriesWithSpent(currentMonth)
    if (error) {
      console.error('Error loading categories:', error)
      showToast('Failed to load categories', 'error')
    } else if (categoriesData) {
      setCategories(categoriesData)
    } else {
      // New user has no categories
      setCategories([])
    }
    
    setDataLoading(false)
  }, [user, devBypass, currentMonth, showToast])

  // Initial load and when month changes (Supabase mode only)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading) {
      if (isSupabaseConfigured) {
        loadData()
      } else {
        // Dev mode: just mark as loaded, data is managed by local state
        setDataLoading(false)
      }
    }
  }, [authLoading, currentMonth]) // loadData excluded to prevent re-creation loop

  // Dev mode: update categories with spent amounts when month or local data changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Get categories for current month
      const monthCategories = allLocalCategories.filter(c => c.month === currentMonth)
      
      // Calculate spent for each category
      const monthExpenses = allLocalExpenses.filter(e => e.month === currentMonth)
      const categoriesWithSpent = monthCategories.map(cat => {
        const spent = monthExpenses
          .filter(e => e.category_id === cat.id)
          .reduce((sum, e) => sum + e.amount, 0)
        return { ...cat, spent }
      })
      
      setCategories(categoriesWithSpent)
    }
  }, [currentMonth, allLocalCategories, allLocalExpenses])

  // Computed: expenses for current month (from allLocalExpenses in dev mode)
  const localExpenses = useMemo(() => 
    allLocalExpenses.filter(e => e.month === currentMonth),
    [allLocalExpenses, currentMonth]
  )

  // Calculated values
  const totalSpent = useMemo(() => 
    categories.reduce((sum, cat) => sum + cat.spent, 0), 
    [categories]
  )

  const pieData = useMemo(() => {
    const categoryData = categories
      .filter(cat => cat.spent > 0)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color || '#64748b',
        budget: cat.limit_amount,
        spent: cat.spent,
        value: cat.spent,
        isUnspent: false,
      }))
    
    const unspent = totalBudget - totalSpent
    if (unspent > 0) {
      categoryData.push({
        id: 'unspent',
        name: 'Unspent',
        emoji: '',
        color: 'rgba(100, 116, 139, 0.4)',
        budget: unspent,
        spent: 0,
        value: unspent,
        isUnspent: true,
      })
    }
    
    return categoryData
  }, [categories, totalBudget, totalSpent])

  // Weeks in selected month
  const weeks = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number)
    return getWeeksInMonth(year, month - 1) // month is 0-indexed for Date
  }, [currentMonth])
  const selectedWeek = weeks[selectedWeekIdx]

  // Expenses for selected week (from localExpenses in dev mode)
  const weekExpenses = useMemo(() => {
    if (!selectedWeek) return []
    // Use local date comparison to avoid timezone issues
    const startTime = selectedWeek.start.getTime()
    const endTime = new Date(selectedWeek.end.getFullYear(), selectedWeek.end.getMonth(), selectedWeek.end.getDate(), 23, 59, 59, 999).getTime()
    
    return localExpenses.filter((e) => {
      const expDate = new Date(e.occurred_at)
      const expTime = expDate.getTime()
      return expTime >= startTime && expTime <= endTime
    })
  }, [localExpenses, selectedWeek])

  // Group week expenses by category
  const weekExpensesByCategory = useMemo(() => {
    const map: Record<string, BudgetExpense[]> = {}
    categories.forEach((c) => { map[c.id] = [] })
    weekExpenses.forEach((e) => {
      if (map[e.category_id]) map[e.category_id].push(e)
    })
    return map
  }, [weekExpenses, categories])

  // Weekly budget per category
  const weeklyBudgetPerCategory = useMemo(() => {
    const numWeeks = weeks.length || 1
    const map: Record<string, number> = {}
    categories.forEach((c) => { map[c.id] = c.limit_amount / numWeeks })
    return map
  }, [categories, weeks.length])

  // Weekly spent per category
  const weeklySpentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    categories.forEach((c) => { map[c.id] = 0 })
    weekExpenses.forEach((e) => {
      if (map[e.category_id] !== undefined) {
        map[e.category_id] += e.amount
      }
    })
    return map
  }, [weekExpenses, categories])

  // Handlers
  const handleCategoryClick = useCallback((cat: BudgetCategory) => {
    setSelectedCategory(cat)
  }, [])

  const handleUpdateTotalBudget = useCallback(async (newTotal: number) => {
    setTotalBudget(newTotal)
    setEditingTotal(false)
    
    if (user) {
      await updateTotalBudget(currentMonth, newTotal)
    }
  }, [user, currentMonth])

  const handleUpdateCategoryBudget = useCallback(async (categoryId: string, newLimit: number) => {
    // Optimistic update
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, limit_amount: newLimit } : c
    ))
    
    // Dev mode: also update in allLocalCategories
    if (!isSupabaseConfigured) {
      setAllLocalCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, limit_amount: newLimit } : c
      ))
      return
    }
    
    if (user) {
      const { error } = await updateCategoryBudget(categoryId, newLimit)
      if (error) {
        showToast('Failed to update budget', 'error')
        loadData() // Revert
      }
    }
  }, [user, loadData, showToast])

  const handleAddExpense = useCallback(async (
    categoryId: string,
    title: string,
    amount: number,
    date: string,
    note?: string
  ) => {
    if (!user && !devBypass) return
    
    // Dev mode: use local state (persists across month changes)
    if (!isSupabaseConfigured) {
      const newExpense: BudgetExpense = {
        id: `exp-${Date.now()}`,
        user_id: 'dev-user',
        category_id: categoryId,
        month: currentMonth,
        title,
        note: note || null,
        amount,
        occurred_at: date,
        created_at: new Date().toISOString(),
      }
      // Add to ALL expenses (persisted)
      setAllLocalExpenses(prev => [newExpense, ...prev])
      // Update category spent (will be recalculated by effect, but immediate update for UX)
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, spent: c.spent + amount } : c
      ))
      showToast('Expense added!')
      return
    }
    
    const { error } = await addExpense(categoryId, title, amount, date, note)
    
    if (error) {
      showToast('Failed to add expense', 'error')
    } else {
      showToast('Expense added!')
      loadData() // Refresh data
    }
  }, [user, devBypass, currentMonth, loadData, showToast])

  const handleDeleteExpense = useCallback(async (expenseId: string, categoryId: string, amount: number) => {
    if (!user && !devBypass) return
    
    // Dev mode: use local state (delete from ALL expenses)
    if (!isSupabaseConfigured) {
      setAllLocalExpenses(prev => prev.filter(e => e.id !== expenseId))
      // Update category spent (will be recalculated by effect, but immediate update for UX)
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, spent: Math.max(0, c.spent - amount) } : c
      ))
      showToast('Expense deleted')
      return
    }
    
    const { error } = await deleteExpense(expenseId)
    
    if (error) {
      showToast('Failed to delete expense', 'error')
    } else {
      showToast('Expense deleted')
      loadData() // Refresh data
    }
  }, [user, devBypass, loadData, showToast])

  const handleCreateCategory = useCallback(async (
    name: string,
    emoji: string,
    color: string,
    limitAmount: number
  ) => {
    if (!user && !devBypass) return
    
    // Dev mode: use local state (persisted across month changes)
    if (!isSupabaseConfigured) {
      const newCategory: BudgetCategory = {
        id: `cat-${Date.now()}`,
        user_id: 'dev-user',
        month: currentMonth,
        name,
        emoji,
        color,
        limit_amount: limitAmount,
        spent: 0,
      }
      // Add to ALL categories (persisted)
      setAllLocalCategories(prev => [...prev, newCategory])
      // Also update current view
      setCategories(prev => [...prev, newCategory])
      showToast('Category created!')
      setShowNewCategoryModal(false)
      return
    }
    
    const { data, error } = await createCategory(currentMonth, name, emoji, color, limitAmount)
    
    if (error) {
      showToast('Failed to create category', 'error')
    } else if (data) {
      setCategories(prev => [...prev, data])
      showToast('Category created!')
      setShowNewCategoryModal(false)
    }
  }, [user, devBypass, currentMonth, showToast])

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (!user && !devBypass) return
    
    // Dev mode: use local state (delete from ALL categories and related expenses)
    if (!isSupabaseConfigured) {
      setAllLocalCategories(prev => prev.filter(c => c.id !== categoryId))
      setAllLocalExpenses(prev => prev.filter(e => e.category_id !== categoryId))
      setCategories(prev => prev.filter(c => c.id !== categoryId))
      setSelectedCategory(null)
      showToast('Category deleted')
      return
    }
    
    const { error } = await deleteCategory(categoryId)
    
    if (error) {
      showToast('Failed to delete category', 'error')
    } else {
      setCategories(prev => prev.filter(c => c.id !== categoryId))
      setSelectedCategory(null)
      showToast('Category deleted')
    }
  }, [user, devBypass, showToast])

  const handleUpdateCategoryDetails = useCallback(async (
    categoryId: string,
    updates: { name?: string; emoji?: string; color?: string }
  ) => {
    if (!user && !devBypass) return
    
    // Dev mode: use local state (update in ALL categories)
    if (!isSupabaseConfigured) {
      setAllLocalCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ))
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ))
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(prev => prev ? { ...prev, ...updates } : null)
      }
      showToast('Category updated!')
      return
    }
    
    const { error } = await updateCategory(categoryId, updates)
    
    if (error) {
      showToast('Failed to update category', 'error')
    } else {
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ))
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(prev => prev ? { ...prev, ...updates } : null)
      }
    }
  }, [user, devBypass, showToast, selectedCategory])

  // Change month - categories and expenses are recalculated by the effect
  const handleMonthChange = useCallback((newMonth: string) => {
    setCurrentMonth(newMonth)
    setShowMonthPicker(false)
    // Reset view state
    setSelectedWeekIdx(0)
    setViewMode('month')
    // Note: Categories and expenses for the new month are recalculated 
    // automatically by the useEffect that watches currentMonth
  }, [])

  // Reset/Start new month - clears current month's expenses but keeps categories
  const handleResetBudget = useCallback(() => {
    // In dev mode: clear only current month's expenses
    if (!isSupabaseConfigured) {
      setAllLocalExpenses(prev => prev.filter(e => e.month !== currentMonth))
      setCategories(prev => prev.map(c => ({ ...c, spent: 0 })))
      showToast('Budget reset! Start fresh.')
      setShowResetConfirm(false)
      return
    }
    
    // With Supabase: just reload data for current month (expenses are per-month anyway)
    loadData()
    showToast('Budget refreshed!')
    setShowResetConfirm(false)
  }, [loadData, showToast, currentMonth])

  // Loading state
  if (authLoading) {
    return (
      <div className="budget-page">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="budget-loading">
          <div className="budget-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="budget-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Toast */}
      {toast && (
        <div className={`budget-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="budget-header">
        <div className="budget-header-left">
          <Link href="/" className="budget-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="budget-header-title">Life Budget</h1>
            <p className="budget-header-subtitle">
              {user?.email || (devBypass ? 'Dev Mode' : 'Not signed in')}
            </p>
          </div>
        </div>
        <div className="budget-header-actions">
          <button 
            className="budget-reset-btn"
            onClick={() => setShowResetConfirm(true)}
            title="Reset budget for new month"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
          <div className="budget-header-avatar">
            {getInitials(user?.email || 'U')}
          </div>
        </div>
      </header>

      {/* Month Selector Bar */}
      <div className="budget-month-bar">
        <button 
          className="budget-month-nav-btn"
          onClick={() => {
            const months = getAvailableMonths()
            const idx = months.indexOf(currentMonth)
            if (idx < months.length - 1) {
              handleMonthChange(months[idx + 1])
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button 
          className="budget-month-selector"
          onClick={() => setShowMonthPicker(!showMonthPicker)}
        >
          <span>{formatMonthDisplay(currentMonth)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button 
          className="budget-month-nav-btn"
          onClick={() => {
            const months = getAvailableMonths()
            const idx = months.indexOf(currentMonth)
            if (idx > 0) {
              handleMonthChange(months[idx - 1])
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Month Picker Dropdown */}
      {showMonthPicker && (
        <div className="budget-month-dropdown">
          {getAvailableMonths().map(month => (
            <button
              key={month}
              className={`budget-month-option ${month === currentMonth ? 'active' : ''}`}
              onClick={() => handleMonthChange(month)}
            >
              {formatMonthDisplay(month)}
              {month === getCurrentMonth() && <span className="budget-month-current-badge">Current</span>}
            </button>
          ))}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="budget-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="budget-modal budget-modal-small" onClick={e => e.stopPropagation()}>
            <div className="budget-modal-header">
              <h2>Reset Budget?</h2>
              <button className="budget-modal-close" onClick={() => setShowResetConfirm(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="budget-reset-content">
              <div className="budget-reset-icon">🔄</div>
              <p>This will clear all expenses for the current month and reset your spending to $0.</p>
              <p className="budget-reset-note">Your categories and budget limits will be kept.</p>
            </div>
            <div className="budget-reset-actions">
              <button 
                className="budget-cancel-btn"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="budget-confirm-reset-btn"
                onClick={handleResetBudget}
              >
                Reset Budget
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="budget-section">
        {/* Total Budget */}
        <div className="budget-total-row">
          <span className="budget-total-label">Monthly Budget</span>
          {editingTotal ? (
            <input
              type="number"
              className="budget-total-edit"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
              onBlur={() => handleUpdateTotalBudget(totalBudget)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTotalBudget(totalBudget)}
              autoFocus
              min={0}
              step={50}
            />
          ) : (
            <span 
              className="budget-total-value" 
              onClick={() => setEditingTotal(true)}
            >
              {formatCurrency(totalBudget)}
            </span>
          )}
        </div>

        {/* Pie Chart */}
        {dataLoading ? (
          <div className="budget-pie-loading">
            <div className="budget-spinner" />
          </div>
        ) : (
          <div className="budget-pie-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={3}
                  dataKey="value"
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="budget-pie-center">
              <div className="budget-pie-center-label">Total Spent</div>
              <div className="budget-pie-center-amount">{formatCurrency(totalSpent)}</div>
              <div className="budget-pie-center-sub">of {formatCurrency(totalBudget)}</div>
            </div>
          </div>
        )}

        {/* Add Expense Button */}
        <button className="budget-add-btn" onClick={() => setShowAddModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Expense
        </button>

        {/* Legend */}
        {categories.length > 0 && (
          <div className="budget-pie-legend">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="budget-legend-item"
                onClick={() => handleCategoryClick(cat)}
              >
                <div className="budget-legend-dot" style={{ background: cat.color || '#64748b' }} />
                <span className="budget-legend-name">{cat.emoji} {cat.name}</span>
                <span className="budget-legend-amount">{formatCurrency(cat.spent)}</span>
              </div>
            ))}
          </div>
        )}

        {/* View Toggle */}
        <div className="budget-view-toggle">
          <button
            type="button"
            className={`budget-view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Monthly Overview
          </button>
          <button
            type="button"
            className={`budget-view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            By Week
          </button>
        </div>

        {/* Category Header */}
        <div className="budget-categories-header">
          <div className="budget-categories-title">
            {viewMode === 'month' ? 'Categories' : 'Weekly Breakdown'}
          </div>
          <div className="budget-categories-actions">
            <button 
              className="budget-manage-btn"
              onClick={() => setShowManageBudgetModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Manage
            </button>
            <button 
              className="budget-new-category-btn"
              onClick={() => setShowNewCategoryModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>
        </div>

        {dataLoading ? (
          <div className="budget-loading-inline">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="budget-empty-categories">
            <div className="budget-empty-icon">📁</div>
            <h3>No categories yet</h3>
            <p>Create your first budget category to start tracking expenses</p>
            <button 
              className="budget-empty-btn"
              onClick={() => setShowNewCategoryModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Category
            </button>
          </div>
        ) : viewMode === 'month' ? (
          /* Monthly View - progress bars per category */
          <div>
            {categories.map((cat) => {
              const left = cat.limit_amount - cat.spent
              const pct = cat.limit_amount > 0 ? Math.min(100, (cat.spent / cat.limit_amount) * 100) : 0
              const over = cat.spent > cat.limit_amount

              return (
                <div 
                  key={cat.id} 
                  className="budget-category-card" 
                  onClick={() => handleCategoryClick(cat)}
                >
                  <div className="budget-category-header">
                    <div className="budget-category-left">
                      <div 
                        className="budget-category-icon" 
                        style={{ background: over ? '#ef4444' : (cat.color || '#64748b') }}
                      >
                        {cat.emoji}
                      </div>
                      <div className="budget-category-info">
                        <div className="budget-category-name">{cat.name}</div>
                        <div className="budget-category-budget">Budget: {formatCurrency(cat.limit_amount)}</div>
                      </div>
                    </div>
                    <div className="budget-category-right">
                      <div className="budget-category-spent" style={{ color: over ? '#f87171' : '#e2e8f0' }}>
                        {formatCurrency(cat.spent)}
                      </div>
                      <div className={`budget-category-left-amount ${over ? 'over' : ''}`}>
                        {over ? `Over by ${formatCurrency(cat.spent - cat.limit_amount)}` : `Left ${formatCurrency(left)}`}
                      </div>
                    </div>
                  </div>
                  <div className="budget-category-progress">
                    <div
                      className="budget-category-progress-fill"
                      style={{
                        width: `${over ? 100 : pct}%`,
                        background: over
                          ? 'linear-gradient(90deg, #f87171, #ef4444)'
                          : `linear-gradient(90deg, ${cat.color || '#64748b'}, ${cat.color || '#64748b'}dd)`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Weekly View */
          <div>
            {/* Week Navigation */}
            <div className="budget-week-nav">
              <button
                type="button"
                className="budget-week-nav-btn"
                onClick={() => setSelectedWeekIdx((i) => Math.max(0, i - 1))}
                disabled={selectedWeekIdx === 0}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="budget-week-label">{selectedWeek?.label ?? 'No weeks'}</span>
              <button
                type="button"
                className="budget-week-nav-btn"
                onClick={() => setSelectedWeekIdx((i) => Math.min(weeks.length - 1, i + 1))}
                disabled={selectedWeekIdx >= weeks.length - 1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Weekly Category Cards */}
            {categories.map((cat) => {
              const catExpenses = weekExpensesByCategory[cat.id] || []
              const weekBudget = weeklyBudgetPerCategory[cat.id] || 0
              const totalCatSpent = weeklySpentByCategory[cat.id] || 0
              const catLeft = weekBudget - totalCatSpent
              const catOver = totalCatSpent > weekBudget
              const catPct = weekBudget > 0 ? Math.min(100, (totalCatSpent / weekBudget) * 100) : 0

              return (
                <div key={cat.id} className="budget-category-card">
                  <div className="budget-category-header">
                    <div className="budget-category-left">
                      <div 
                        className="budget-category-icon" 
                        style={{ background: catOver ? '#ef4444' : (cat.color || '#64748b') }}
                      >
                        {cat.emoji}
                      </div>
                      <div className="budget-category-info">
                        <div className="budget-category-name">{cat.name}</div>
                        <div className="budget-category-budget">Weekly: {formatCurrency(weekBudget)}</div>
                      </div>
                    </div>
                    <div className="budget-category-right">
                      <div className="budget-category-spent" style={{ color: catOver ? '#f87171' : '#e2e8f0' }}>
                        {formatCurrency(totalCatSpent)}
                      </div>
                      <div className={`budget-category-left-amount ${catOver ? 'over' : ''}`}>
                        {catOver ? `Over by ${formatCurrency(totalCatSpent - weekBudget)}` : `Left ${formatCurrency(catLeft)}`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Category progress bar */}
                  <div className="budget-category-progress">
                    <div
                      className="budget-category-progress-fill"
                      style={{
                        width: `${catOver ? 100 : catPct}%`,
                        background: catOver
                          ? 'linear-gradient(90deg, #f87171, #ef4444)'
                          : `linear-gradient(90deg, ${cat.color || '#64748b'}, ${cat.color || '#64748b'}dd)`,
                      }}
                    />
                  </div>

                  {/* Expense items for this week */}
                  {catExpenses.length === 0 ? (
                    <div className="budget-week-empty">No expenses this week</div>
                  ) : (
                    catExpenses.map((exp) => (
                      <div key={exp.id} className="budget-week-expense">
                        <div className="budget-week-expense-info">
                          <span className="budget-week-expense-title">{exp.title}</span>
                          <span className="budget-week-expense-date">
                            {new Date(exp.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <span className="budget-week-expense-amount">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddExpense}
        />
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <NewCategoryModal
          onClose={() => setShowNewCategoryModal(false)}
          onSubmit={handleCreateCategory}
        />
      )}

      {/* Manage Budget Modal */}
      {showManageBudgetModal && (
        <ManageBudgetModal
          categories={categories}
          onClose={() => setShowManageBudgetModal(false)}
          onUpdateBudget={handleUpdateCategoryBudget}
        />
      )}

      {/* Category History Drawer */}
      {selectedCategory && (
        <CategoryHistoryDrawer
          category={selectedCategory}
          localExpenses={localExpenses}
          isDevMode={!isSupabaseConfigured}
          onClose={() => setSelectedCategory(null)}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          onUpdateBudget={handleUpdateCategoryBudget}
          onDeleteCategory={handleDeleteCategory}
          onUpdateCategoryDetails={handleUpdateCategoryDetails}
          onOpenAddExpenseModal={(categoryId) => {
            setSelectedCategory(null) // Close drawer first
            setShowAddModal(true) // Open main add expense modal
          }}
        />
      )}
    </div>
  )
}

// ============ Add Expense Modal ============
interface AddExpenseModalProps {
  categories: BudgetCategory[]
  onClose: () => void
  onSubmit: (categoryId: string, title: string, amount: number, date: string, note?: string) => void
  preselectedCategoryId?: string
}

function AddExpenseModal({ categories, onClose, onSubmit, preselectedCategoryId }: AddExpenseModalProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(preselectedCategoryId || categories[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const amountNum = parseFloat(amount)
    if (!title.trim()) { setError('Enter a title'); return }
    if (isNaN(amountNum) || amountNum <= 0) { setError('Enter a valid amount'); return }
    if (!categoryId) { setError('Select a category'); return }
    
    onSubmit(categoryId, title.trim(), amountNum, new Date(date).toISOString(), note.trim() || undefined)
    onClose()
  }

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={e => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>Add Expense</h2>
          <button className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="budget-modal-error">{error}</div>}
          
          <div className="budget-form-group">
            <label>Title / Merchant</label>
            <input
              type="text"
              placeholder="e.g., Groceries at Walmart"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="budget-input"
              autoFocus
            />
          </div>
          
          <div className="budget-form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="budget-input"
            />
          </div>
          
          <div className="budget-form-group">
            <label>Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="budget-select"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="budget-form-group">
            <label>Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="budget-input"
            />
          </div>
          
          <div className="budget-form-group">
            <label>Note (optional)</label>
            <input
              type="text"
              placeholder="Add a note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="budget-input"
            />
          </div>
          
          <button type="submit" className="budget-submit-btn">Add Expense</button>
        </form>
      </div>
    </div>
  )
}

// ============ New Category Modal ============
interface NewCategoryModalProps {
  onClose: () => void
  onSubmit: (name: string, emoji: string, color: string, limitAmount: number) => void
}

function NewCategoryModal({ onClose, onSubmit }: NewCategoryModalProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0])
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [limitAmount, setLimitAmount] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) { setError('Enter a category name'); return }
    const limit = parseFloat(limitAmount)
    if (isNaN(limit) || limit < 0) { setError('Enter a valid budget amount'); return }
    
    onSubmit(name.trim(), emoji, color, limit)
  }

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={e => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>New Category</h2>
          <button className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="budget-modal-error">{error}</div>}
          
          <div className="budget-form-group">
            <label>Category Name</label>
            <input
              type="text"
              placeholder="e.g., Entertainment"
              value={name}
              onChange={e => setName(e.target.value)}
              className="budget-input"
              autoFocus
            />
          </div>
          
          <div className="budget-form-group">
            <label>Icon</label>
            <div className="budget-emoji-picker">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`budget-emoji-btn ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          
          <div className="budget-form-group">
            <label>Color</label>
            <div className="budget-color-picker">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`budget-color-btn ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          
          <div className="budget-form-group">
            <label>Monthly Budget ($)</label>
            <input
              type="number"
              placeholder="0"
              step="10"
              min="0"
              value={limitAmount}
              onChange={e => setLimitAmount(e.target.value)}
              className="budget-input"
            />
          </div>
          
          <button type="submit" className="budget-submit-btn">Create Category</button>
        </form>
      </div>
    </div>
  )
}

// ============ Manage Budget Modal ============
interface ManageBudgetModalProps {
  categories: BudgetCategory[]
  onClose: () => void
  onUpdateBudget: (categoryId: string, newLimit: number) => void
}

function ManageBudgetModal({ categories, onClose, onUpdateBudget }: ManageBudgetModalProps) {
  const [budgets, setBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    categories.forEach(cat => {
      initial[cat.id] = String(cat.limit_amount)
    })
    return initial
  })

  const handleSave = () => {
    categories.forEach(cat => {
      const newLimit = parseFloat(budgets[cat.id])
      if (!isNaN(newLimit) && newLimit >= 0 && newLimit !== cat.limit_amount) {
        onUpdateBudget(cat.id, newLimit)
      }
    })
    onClose()
  }

  const totalBudget = Object.values(budgets).reduce((sum, val) => {
    const num = parseFloat(val)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={e => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>Manage Budgets</h2>
          <button className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="budget-manage-total">
          <span>Total allocated:</span>
          <span className="budget-manage-total-amount">{formatCurrency(totalBudget)}</span>
        </div>
        
        <div className="budget-manage-list">
          {categories.length === 0 ? (
            <div className="budget-manage-empty">No categories to manage. Create a category first.</div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="budget-manage-item">
                <div className="budget-manage-item-info">
                  <span className="budget-manage-item-emoji" style={{ background: (cat.color || '#64748b') + '33' }}>
                    {cat.emoji}
                  </span>
                  <span className="budget-manage-item-name">{cat.name}</span>
                </div>
                <div className="budget-manage-item-input">
                  <span className="budget-manage-currency">$</span>
                  <input
                    type="number"
                    value={budgets[cat.id]}
                    onChange={e => setBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    className="budget-input budget-manage-input"
                    min="0"
                    step="10"
                  />
                </div>
              </div>
            ))
          )}
        </div>
        
        <button type="button" className="budget-submit-btn" onClick={handleSave}>
          Save All Changes
        </button>
      </div>
    </div>
  )
}

// ============ Category History Drawer ============
interface CategoryHistoryDrawerProps {
  category: BudgetCategory
  localExpenses: BudgetExpense[]
  isDevMode: boolean
  onClose: () => void
  onAddExpense: (categoryId: string, title: string, amount: number, date: string, note?: string) => void
  onDeleteExpense: (expenseId: string, categoryId: string, amount: number) => void
  onUpdateBudget: (categoryId: string, newLimit: number) => void
  onDeleteCategory: (categoryId: string) => void
  onUpdateCategoryDetails: (categoryId: string, updates: { name?: string; emoji?: string; color?: string }) => void
  onOpenAddExpenseModal: (categoryId: string) => void
}

function CategoryHistoryDrawer({ 
  category,
  localExpenses,
  isDevMode,
  onClose, 
  onAddExpense, 
  onDeleteExpense, 
  onUpdateBudget,
  onDeleteCategory,
  onUpdateCategoryDetails,
  onOpenAddExpenseModal,
}: CategoryHistoryDrawerProps) {
  const [expenses, setExpenses] = useState<BudgetExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState(String(category.limit_amount))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Load expenses
  useEffect(() => {
    async function load() {
      // Dev mode: use local expenses
      if (isDevMode) {
        const categoryExpenses = localExpenses
          .filter(e => e.category_id === category.id)
          .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        setExpenses(categoryExpenses)
        setLoading(false)
        return
      }
      
      setLoading(true)
      const { data, error } = await getCategoryExpenses(category.id)
      if (error) {
        console.error('Error loading expenses:', error)
      } else if (data) {
        setExpenses(data)
      }
      setLoading(false)
    }
    load()
  }, [category.id, isDevMode, localExpenses])

  const handleDelete = async (exp: BudgetExpense) => {
    setDeletingId(exp.id)
    await onDeleteExpense(exp.id, exp.category_id, exp.amount)
    setExpenses(prev => prev.filter(e => e.id !== exp.id))
    setDeletingId(null)
  }

  const handleSaveBudget = () => {
    const value = parseFloat(newBudget)
    if (!isNaN(value) && value >= 0) {
      onUpdateBudget(category.id, value)
    }
    setEditingBudget(false)
  }

  const handleDeleteCategory = () => {
    if (confirmDelete) {
      onDeleteCategory(category.id)
    } else {
      setConfirmDelete(true)
    }
  }

  const left = category.limit_amount - category.spent
  const over = category.spent > category.limit_amount
  const catColor = category.color || '#64748b'

  return (
    <>
      <div className="budget-drawer-overlay" onClick={onClose} />
      <div className="budget-drawer">
        {/* Header */}
        <div className="budget-drawer-header">
          <div className="budget-drawer-title-row">
            <span className="budget-drawer-emoji" style={{ background: catColor + '33' }}>{category.emoji}</span>
            <h2>{category.name}</h2>
          </div>
          <div className="budget-drawer-header-actions">
            <button 
              className="budget-drawer-edit-btn"
              onClick={() => setShowEditModal(true)}
              title="Edit category"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button className="budget-modal-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="budget-drawer-summary">
          <div className="budget-drawer-stat">
            <span className="budget-drawer-stat-label">Budget</span>
            {editingBudget ? (
              <div className="budget-drawer-stat-edit">
                <input
                  type="number"
                  value={newBudget}
                  onChange={e => setNewBudget(e.target.value)}
                  className="budget-input"
                  autoFocus
                  onBlur={handleSaveBudget}
                  onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                />
              </div>
            ) : (
              <span 
                className="budget-drawer-stat-value clickable" 
                onClick={() => setEditingBudget(true)}
              >
                {formatCurrency(category.limit_amount)}
              </span>
            )}
          </div>
          <div className="budget-drawer-stat">
            <span className="budget-drawer-stat-label">Spent</span>
            <span className={`budget-drawer-stat-value ${over ? 'over' : ''}`}>
              {formatCurrency(category.spent)}
            </span>
          </div>
          <div className="budget-drawer-stat">
            <span className="budget-drawer-stat-label">{over ? 'Over' : 'Left'}</span>
            <span className={`budget-drawer-stat-value ${over ? 'over' : 'positive'}`}>
              {formatCurrency(Math.abs(left))}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="budget-drawer-progress">
          <div
            className="budget-drawer-progress-fill"
            style={{
              width: `${category.limit_amount > 0 ? Math.min(100, (category.spent / category.limit_amount) * 100) : 0}%`,
              background: over
                ? 'linear-gradient(90deg, #f87171, #ef4444)'
                : `linear-gradient(90deg, ${catColor}, ${catColor}dd)`,
            }}
          />
        </div>

        {/* Add Button */}
        <button 
          className="budget-drawer-add-btn"
          onClick={() => onOpenAddExpenseModal(category.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add expense to {category.name}
        </button>

        {/* Expenses List */}
        <div className="budget-drawer-list-title">
          Transactions ({expenses.length})
        </div>
        
        <div className="budget-drawer-list">
          {loading ? (
            <div className="budget-drawer-loading">
              <div className="budget-spinner-small" />
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="budget-drawer-empty">
              No expenses yet in this category.
            </div>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="budget-drawer-expense">
                <div className="budget-drawer-expense-main">
                  <div className="budget-drawer-expense-info">
                    <span className="budget-drawer-expense-title">{exp.title}</span>
                    {exp.note && <span className="budget-drawer-expense-note">{exp.note}</span>}
                    <span className="budget-drawer-expense-date">{formatDateTime(exp.occurred_at)}</span>
                  </div>
                  <span className="budget-drawer-expense-amount">{formatCurrency(exp.amount)}</span>
                </div>
                <button
                  className="budget-drawer-expense-delete"
                  onClick={() => handleDelete(exp)}
                  disabled={deletingId === exp.id}
                >
                  {deletingId === exp.id ? (
                    <div className="budget-spinner-tiny" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Delete Category */}
        <div className="budget-drawer-danger-zone">
          <button 
            className={`budget-drawer-delete-category ${confirmDelete ? 'confirm' : ''}`}
            onClick={handleDeleteCategory}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            {confirmDelete ? 'Click again to confirm' : 'Delete category'}
          </button>
          {confirmDelete && (
            <button 
              className="budget-drawer-cancel-delete"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Edit Category Modal */}
      {showEditModal && (
        <EditCategoryModal
          category={category}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) => {
            onUpdateCategoryDetails(category.id, updates)
            setShowEditModal(false)
          }}
        />
      )}
    </>
  )
}

// ============ Edit Category Modal ============
interface EditCategoryModalProps {
  category: BudgetCategory
  onClose: () => void
  onSave: (updates: { name?: string; emoji?: string; color?: string }) => void
}

function EditCategoryModal({ category, onClose, onSave }: EditCategoryModalProps) {
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [color, setColor] = useState(category.color || COLOR_OPTIONS[0])
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) { setError('Enter a category name'); return }
    
    onSave({ name: name.trim(), emoji, color })
  }

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={e => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>Edit Category</h2>
          <button className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="budget-modal-error">{error}</div>}
          
          <div className="budget-form-group">
            <label>Category Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="budget-input"
              autoFocus
            />
          </div>
          
          <div className="budget-form-group">
            <label>Icon</label>
            <div className="budget-emoji-picker">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`budget-emoji-btn ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          
          <div className="budget-form-group">
            <label>Color</label>
            <div className="budget-color-picker">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`budget-color-btn ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          
          <button type="submit" className="budget-submit-btn">Save Changes</button>
        </form>
      </div>
    </div>
  )
}

// ============ Styles ============
const styles = `
  .budget-page {
    min-height: 100vh;
    padding-bottom: 40px;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 15%, #142136 35%, #1a2d4a 50%, #142136 65%, #0a1628 85%, #050d18 100%);
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative;
  }

  /* Loading */
  .budget-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    color: #64748b;
  }
  .budget-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: budget-spin 0.8s linear infinite;
  }
  .budget-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: budget-spin 0.8s linear infinite;
  }
  .budget-spinner-tiny {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #f87171;
    border-radius: 50%;
    animation: budget-spin 0.8s linear infinite;
  }
  @keyframes budget-spin { to { transform: rotate(360deg); } }
  .budget-loading-inline {
    text-align: center;
    padding: 24px;
    color: #64748b;
  }
  .budget-pie-loading {
    height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Toast */
  .budget-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1000;
    animation: budget-toast-in 0.3s ease-out;
  }
  .budget-toast.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }
  .budget-toast.error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }
  @keyframes budget-toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* Header */
  .budget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(255,255,255,0.04);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .budget-header-left { display: flex; align-items: center; gap: 12px; }
  .budget-back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 12px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    color: #94a3b8; text-decoration: none;
  }
  .budget-back-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .budget-header-title { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .budget-header-subtitle { font-size: 0.75rem; color: #64748b; margin: 0; }
  .budget-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .budget-header-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem; font-weight: 600; color: #fff;
  }
  .budget-reset-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-reset-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: #60a5fa;
  }

  /* Month Selector Bar */
  .budget-month-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .budget-month-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    border: none;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-month-nav-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .budget-month-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 20px;
    color: #60a5fa;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-month-selector:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
  }

  /* Month Dropdown */
  .budget-month-dropdown {
    position: absolute;
    top: 140px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    max-height: 300px;
    overflow-y: auto;
    background: linear-gradient(180deg, #1a2942 0%, #0f1d2e 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 100;
    padding: 8px;
  }
  .budget-month-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 14px;
    background: none;
    border: none;
    border-radius: 10px;
    color: #cbd5e1;
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }
  .budget-month-option:hover {
    background: rgba(255,255,255,0.06);
  }
  .budget-month-option.active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    font-weight: 600;
  }
  .budget-month-current-badge {
    font-size: 0.65rem;
    padding: 2px 6px;
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border-radius: 4px;
    font-weight: 500;
  }

  /* Reset Modal Content */
  .budget-reset-content {
    padding: 20px;
    text-align: center;
  }
  .budget-reset-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  .budget-reset-content p {
    color: #94a3b8;
    font-size: 0.9375rem;
    line-height: 1.5;
    margin: 0 0 8px 0;
  }
  .budget-reset-note {
    font-size: 0.8125rem !important;
    color: #64748b !important;
  }
  .budget-reset-actions {
    display: flex;
    gap: 12px;
    padding: 0 20px 20px;
  }
  .budget-cancel-btn {
    flex: 1;
    padding: 12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #94a3b8;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-cancel-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .budget-confirm-reset-btn {
    flex: 1;
    padding: 12px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-confirm-reset-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
  .budget-modal-small {
    max-width: 360px;
  }

  /* Section */
  .budget-section { padding: 20px; }
  .budget-total-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .budget-total-label { font-size: 0.875rem; color: #94a3b8; }
  .budget-total-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #60a5fa;
    cursor: pointer;
  }
  .budget-total-edit {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 1.25rem;
    font-weight: 600;
    padding: 8px 12px;
    width: 120px;
    text-align: right;
  }
  .budget-total-edit:focus { outline: none; border-color: #3b82f6; }

  /* Pie Chart */
  .budget-pie-container {
    position: relative;
    width: 100%;
    max-width: 360px;
    height: 360px;
    margin: 0 auto 16px;
  }
  .budget-pie-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }
  .budget-pie-center-label { font-size: 0.75rem; color: #64748b; }
  .budget-pie-center-amount { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; }
  .budget-pie-center-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }

  /* Add Button */
  .budget-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 20px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
    margin: 0 auto 20px;
  }
  .budget-add-btn:hover { filter: brightness(1.1); }

  /* Legend */
  .budget-pie-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px 20px;
    margin-bottom: 24px;
  }
  .budget-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    color: #cbd5e1;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .budget-legend-item:hover { background: rgba(255,255,255,0.06); }
  .budget-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  .budget-legend-name { font-weight: 500; }
  .budget-legend-amount { color: #94a3b8; }

  /* View Toggle */
  .budget-view-toggle {
    display: flex;
    background: rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 20px;
  }
  .budget-view-toggle-btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-view-toggle-btn:hover {
    color: #cbd5e1;
  }
  .budget-view-toggle-btn.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }

  /* Week Navigation */
  .budget-week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
  }
  .budget-week-nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .budget-week-nav-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }
  .budget-week-nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .budget-week-label {
    font-size: 1rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  /* Weekly Expense Items */
  .budget-week-empty {
    text-align: center;
    padding: 16px;
    color: #64748b;
    font-size: 0.8125rem;
    font-style: italic;
  }
  .budget-week-expense {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .budget-week-expense:first-of-type {
    margin-top: 12px;
  }
  .budget-week-expense-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .budget-week-expense-title {
    font-size: 0.9375rem;
    color: #cbd5e1;
    font-weight: 500;
  }
  .budget-week-expense-date {
    font-size: 0.6875rem;
    color: #64748b;
  }
  .budget-week-expense-amount {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  /* Categories Header */
  .budget-categories-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .budget-categories-header .budget-categories-title {
    margin-bottom: 0;
  }
  .budget-categories-actions {
    display: flex;
    gap: 8px;
  }
  .budget-categories-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
  }
  .budget-manage-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #94a3b8;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-manage-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }

  /* Manage Budget Modal */
  .budget-manage-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 0.875rem;
    color: #94a3b8;
  }
  .budget-manage-total-amount {
    font-weight: 700;
    font-size: 1.125rem;
    color: #60a5fa;
  }
  .budget-manage-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
    max-height: 400px;
    overflow-y: auto;
  }
  .budget-manage-empty {
    text-align: center;
    padding: 24px;
    color: #64748b;
    font-size: 0.875rem;
  }
  .budget-manage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
  }
  .budget-manage-item-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .budget-manage-item-emoji {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.125rem;
  }
  .budget-manage-item-name {
    font-weight: 500;
    color: #e2e8f0;
  }
  .budget-manage-item-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .budget-manage-currency {
    color: #64748b;
    font-size: 0.875rem;
  }
  .budget-manage-input {
    width: 100px;
    text-align: right;
    padding: 8px 12px !important;
  }

  /* Category Card */
  .budget-category-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-category-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }
  .budget-category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .budget-category-left { display: flex; align-items: center; gap: 12px; }
  .budget-category-icon {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.25rem;
  }
  .budget-category-name { font-weight: 600; font-size: 1rem; color: #e2e8f0; }
  .budget-category-budget { font-size: 0.75rem; color: #64748b; }
  .budget-category-right { text-align: right; }
  .budget-category-spent { font-weight: 700; font-size: 1.125rem; color: #e2e8f0; }
  .budget-category-left-amount { font-size: 0.75rem; color: #64748b; }
  .budget-category-left-amount.over { color: #f87171; }
  .budget-category-progress {
    height: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  .budget-category-progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  /* Modal */
  .budget-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 200;
  }
  .budget-modal {
    background: linear-gradient(180deg, #0d1a2d 0%, #0a1628 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
  }
  @media (min-width: 640px) {
    .budget-modal-overlay { align-items: center; }
    .budget-modal { border-radius: 20px; }
  }
  .budget-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .budget-modal-header h2 { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; margin: 0; }
  .budget-modal-close {
    width: 40px; height: 40px; border-radius: 12px;
    background: rgba(255,255,255,0.06); border: none;
    color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .budget-modal-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .budget-modal-error {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.875rem;
    margin-bottom: 16px;
  }
  .budget-form-group { margin-bottom: 16px; }
  .budget-form-group label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
    margin-bottom: 6px;
  }
  .budget-input, .budget-select {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: #e2e8f0;
    font-size: 1rem;
  }
  .budget-input:focus, .budget-select:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .budget-input::placeholder { color: #475569; }
  .budget-select { cursor: pointer; }
  .budget-select option { background: #0d1a2d; color: #e2e8f0; }
  .budget-submit-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
  }
  .budget-submit-btn:hover { filter: brightness(1.1); }

  /* Drawer */
  .budget-drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 200;
  }
  .budget-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    max-width: 420px;
    height: 100%;
    background: linear-gradient(180deg, #0d1a2d 0%, #0a1628 100%);
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 201;
    overflow-y: auto;
    animation: budget-drawer-in 0.25s ease-out;
  }
  @keyframes budget-drawer-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .budget-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    position: sticky;
    top: 0;
    background: rgba(13, 26, 45, 0.95);
    backdrop-filter: blur(10px);
    z-index: 10;
  }
  .budget-drawer-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .budget-drawer-emoji {
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }
  .budget-drawer-header h2 { font-size: 1.125rem; font-weight: 600; color: #f1f5f9; margin: 0; }

  /* Drawer Summary */
  .budget-drawer-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .budget-drawer-stat { text-align: center; }
  .budget-drawer-stat-label {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .budget-drawer-stat-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #e2e8f0;
  }
  .budget-drawer-stat-value.over { color: #f87171; }
  .budget-drawer-stat-value.positive { color: #34d399; }
  .budget-drawer-stat-value.clickable {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dashed;
    text-underline-offset: 3px;
  }
  .budget-drawer-stat-edit input {
    width: 80px;
    text-align: center;
    font-size: 1rem;
    padding: 6px 8px;
  }

  /* Drawer Progress */
  .budget-drawer-progress {
    height: 6px;
    background: rgba(255,255,255,0.1);
    margin: 0 24px;
    border-radius: 3px;
    overflow: hidden;
  }
  .budget-drawer-progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;
  }

  /* Drawer Add Button */
  .budget-drawer-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: calc(100% - 48px);
    margin: 20px 24px;
    padding: 12px 20px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px dashed rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    color: #60a5fa;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-drawer-add-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }

  /* Drawer List */
  .budget-drawer-list-title {
    padding: 0 24px 12px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .budget-drawer-list {
    padding: 0 24px 24px;
  }
  .budget-drawer-loading, .budget-drawer-empty {
    text-align: center;
    padding: 24px;
    color: #64748b;
    font-size: 0.875rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .budget-drawer-expense {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    margin-bottom: 8px;
  }
  .budget-drawer-expense-main {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }
  .budget-drawer-expense-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .budget-drawer-expense-title {
    font-weight: 500;
    color: #e2e8f0;
    font-size: 0.9375rem;
  }
  .budget-drawer-expense-note {
    font-size: 0.75rem;
    color: #94a3b8;
    font-style: italic;
  }
  .budget-drawer-expense-date {
    font-size: 0.6875rem;
    color: #64748b;
  }
  .budget-drawer-expense-amount {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 1rem;
    white-space: nowrap;
  }
  .budget-drawer-expense-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(239, 68, 68, 0.1);
    border: none;
    border-radius: 8px;
    color: #f87171;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .budget-drawer-expense-delete:hover {
    background: rgba(239, 68, 68, 0.2);
  }
  .budget-drawer-expense-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Custom tooltip for recharts */
  .recharts-tooltip-wrapper { outline: none; }
  .custom-tooltip {
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .custom-tooltip-name { font-weight: 600; color: #f1f5f9; font-size: 0.875rem; }
  .custom-tooltip-value { color: #94a3b8; font-size: 0.8125rem; margin-top: 2px; }

  /* Categories Header */
  .budget-categories-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .budget-categories-header .budget-categories-title {
    margin-bottom: 0;
  }
  .budget-new-category-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    color: #60a5fa;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-new-category-btn:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }

  /* Empty State */
  .budget-empty-categories {
    text-align: center;
    padding: 48px 24px;
    background: rgba(255,255,255,0.02);
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 16px;
  }
  .budget-empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  .budget-empty-categories h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0 0 8px 0;
  }
  .budget-empty-categories p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 24px 0;
  }
  .budget-empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  }
  .budget-empty-btn:hover {
    filter: brightness(1.1);
  }

  /* Emoji Picker */
  .budget-emoji-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .budget-emoji-btn {
    width: 44px;
    height: 44px;
    background: rgba(255,255,255,0.04);
    border: 2px solid transparent;
    border-radius: 10px;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .budget-emoji-btn:hover {
    background: rgba(255,255,255,0.08);
  }
  .budget-emoji-btn.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  /* Color Picker */
  .budget-color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .budget-color-btn {
    width: 36px;
    height: 36px;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
  }
  .budget-color-btn:hover {
    transform: scale(1.1);
  }
  .budget-color-btn.selected {
    border-color: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  /* Drawer Header Actions */
  .budget-drawer-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .budget-drawer-edit-btn {
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.06);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .budget-drawer-edit-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e2e8f0;
  }

  /* Danger Zone */
  .budget-drawer-danger-zone {
    padding: 20px 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .budget-drawer-delete-category {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-drawer-delete-category:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.3);
  }
  .budget-drawer-delete-category.confirm {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
  .budget-drawer-cancel-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #94a3b8;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .budget-drawer-cancel-delete:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .budget-drawer { max-width: 100%; }
  }
`
