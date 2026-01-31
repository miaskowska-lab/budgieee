'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// ============================================
// MVP – State only. Supabase / Plaid later.
// ============================================

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
}

interface CategoryAllocation {
  id: string
  name: string
  emoji: string
  amount: number
  color: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(amount))
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 15)
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

const MOCK_USER_NAME = 'You'

// Vibrant, aesthetic color palette
const CATEGORY_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber/orange
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
]

const INITIAL_TOTAL_MONTHLY = 2000
const INITIAL_CATEGORIES: CategoryAllocation[] = [
  { id: 'c1', name: 'Food', emoji: '🛒', amount: 500, color: CATEGORY_COLORS[0] },
  { id: 'c2', name: 'Transport', emoji: '🚗', amount: 200, color: CATEGORY_COLORS[1] },
  { id: 'c3', name: 'Utilities', emoji: '💡', amount: 150, color: CATEGORY_COLORS[2] },
  { id: 'c4', name: 'Subscriptions', emoji: '📱', amount: 50, color: CATEGORY_COLORS[3] },
  { id: 'c5', name: 'Other', emoji: '📦', amount: 200, color: CATEGORY_COLORS[4] },
]

// Mock expenses spread across weeks
const now = new Date()
const thisMonth = now.getMonth()
const thisYear = now.getFullYear()
const INITIAL_EXPENSES: Expense[] = [
  { id: '1', description: 'Groceries', amount: 120, category: 'Food', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-03` },
  { id: '2', description: 'Coffee', amount: 25, category: 'Food', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-05` },
  { id: '3', description: 'Restaurant', amount: 85, category: 'Food', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-12` },
  { id: '4', description: 'Gas', amount: 60, category: 'Transport', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-02` },
  { id: '5', description: 'Uber', amount: 35, category: 'Transport', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-08` },
  { id: '6', description: 'Electricity', amount: 85, category: 'Utilities', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: '7', description: 'Water', amount: 30, category: 'Utilities', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: '8', description: 'Internet', amount: 55, category: 'Utilities', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: '9', description: 'Netflix', amount: 15, category: 'Subscriptions', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: '10', description: 'Spotify', amount: 10, category: 'Subscriptions', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: '11', description: 'Misc shopping', amount: 250, category: 'Other', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-10` },
]

const styles = `
  .budget-page {
    min-height: 100vh;
    padding-bottom: 120px;
    background: linear-gradient(180deg, #050d18 0%, #0a1628 15%, #142136 35%, #1a2d4a 50%, #142136 65%, #0a1628 85%, #050d18 100%);
    color: #e2e8f0;
  }
  .budget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(255,255,255,0.06);
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
  .budget-header-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem; font-weight: 600; color: #fff;
  }
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
    width: 100px;
    text-align: right;
  }
  .budget-total-edit:focus { outline: none; border-color: #3b82f6; }
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
  .budget-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .budget-legend-name { font-weight: 500; }
  .budget-legend-amount { color: #94a3b8; }
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
  .budget-view-toggle-btn.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }
  .budget-week-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .budget-week-nav-btn {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .budget-week-nav-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .budget-week-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .budget-week-label { font-size: 1rem; font-weight: 600; color: #e2e8f0; }
  .budget-category-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
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
  .budget-category-info {}
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
    margin-top: 8px;
  }
  .budget-category-progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .budget-expense-row {
    padding: 12px 0;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .budget-expense-row-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .budget-expense-name { font-size: 0.9375rem; color: #cbd5e1; }
  .budget-expense-amounts { text-align: right; }
  .budget-expense-spent { font-size: 0.9375rem; font-weight: 600; color: #e2e8f0; }
  .budget-expense-left { font-size: 0.75rem; color: #64748b; }
  .budget-expense-left.over { color: #f87171; }
  .budget-expense-progress {
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  .budget-expense-progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.2s;
  }
  .budget-empty-week {
    text-align: center;
    padding: 24px 20px;
    color: #64748b;
    font-size: 0.875rem;
  }
  .budget-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
  }
  .budget-modal {
    background: #0f172a;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 24px;
    border: 1px solid rgba(255,255,255,0.1);
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
  .budget-form-group { margin-bottom: 16px; }
  .budget-form-group label { display: block; font-size: 0.8125rem; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
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
  .budget-modal-error { font-size: 0.875rem; color: #f87171; margin-bottom: 12px; }
  
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
`

// Custom tooltip for pie chart
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

// Custom label for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent, isUnspent }: any) => {
  // Don't show label for very small segments or unspent
  if (percent < 0.08 || isUnspent) return null
  
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      style={{ fontSize: '11px', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
    >
      {name}
    </text>
  )
}

export default function BudgetPage() {
  const now = new Date()
  const [totalMonthly, setTotalMonthly] = useState(INITIAL_TOTAL_MONTHLY)
  const [categories, setCategories] = useState<CategoryAllocation[]>(INITIAL_CATEGORIES)
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTotal, setEditingTotal] = useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryAllocation | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  // Calculate spent per category for the whole month
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    categories.forEach((c) => { map[c.name] = 0 })
    expenses.forEach((e) => {
      if (map[e.category] !== undefined) {
        map[e.category] += e.amount
      }
    })
    return map
  }, [expenses, categories])

  const totalSpent = useMemo(() => Object.values(spentByCategory).reduce((s, v) => s + v, 0), [spentByCategory])

  // Pie chart data - shows actual spending + unspent as grey
  const pieData = useMemo(() => {
    const categoryData = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      budget: cat.amount,
      spent: spentByCategory[cat.name] || 0,
      value: spentByCategory[cat.name] || 0,
      isUnspent: false,
    })).filter(d => d.value > 0) // only show categories with spending
    
    // Add unspent segment if budget > spent
    const unspent = totalMonthly - totalSpent
    if (unspent > 0) {
      categoryData.push({
        id: 'unspent',
        name: 'Unspent',
        emoji: '',
        color: 'rgba(100, 116, 139, 0.4)', // grey
        budget: unspent,
        spent: 0,
        value: unspent,
        isUnspent: true,
      })
    }
    
    return categoryData
  }, [categories, spentByCategory, totalMonthly, totalSpent])

  // Weeks in current month
  const weeks = useMemo(() => getWeeksInMonth(now.getFullYear(), now.getMonth()), [])
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const selectedWeek = weeks[selectedWeekIdx]

  // Expenses for selected week
  const weekExpenses = useMemo(() => {
    if (!selectedWeek) return []
    const startStr = selectedWeek.start.toISOString().slice(0, 10)
    const endStr = selectedWeek.end.toISOString().slice(0, 10)
    return expenses.filter((e) => e.date >= startStr && e.date <= endStr)
  }, [expenses, selectedWeek])

  // Group expenses by category for selected week
  const weekExpensesByCategory = useMemo(() => {
    const map: Record<string, Expense[]> = {}
    categories.forEach((c) => { map[c.name] = [] })
    weekExpenses.forEach((e) => {
      if (map[e.category]) map[e.category].push(e)
    })
    return map
  }, [weekExpenses, categories])

  // Weekly budget per category
  const weeklyBudgetPerCategory = useMemo(() => {
    const numWeeks = weeks.length || 1
    const map: Record<string, number> = {}
    categories.forEach((c) => { map[c.name] = c.amount / numWeeks })
    return map
  }, [categories, weeks.length])

  const handlePieClick = useCallback(
    (data: any) => {
      if (!data || !data.id || data.isUnspent) return // ignore unspent segment clicks
      const cat = categories.find((c) => c.id === data.id)
      if (cat) {
        setEditingCategory(cat)
        setShowEditCategoryModal(true)
      }
    },
    [categories]
  )

  const handleUpdateCategoryBudget = useCallback((categoryId: string, newAmount: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, amount: Math.max(0, newAmount) } : c))
    )
    setShowEditCategoryModal(false)
    setEditingCategory(null)
  }, [])

  const handleAddExpense = useCallback(
    (description: string, amount: number, category: string, date?: string) => {
      setExpenses((prev) => [
        { id: generateId(), description, amount, category, date: date ?? now.toISOString().slice(0, 10) },
        ...prev,
      ])
    },
    []
  )

  const handleLegendClick = useCallback(
    (cat: CategoryAllocation) => {
      setEditingCategory(cat)
      setShowEditCategoryModal(true)
    },
    []
  )

  return (
    <div className="budget-page">
      <style>{styles}</style>

      <header className="budget-header">
        <div className="budget-header-left">
          <Link href="/" className="budget-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="budget-header-title">Life Budget</h1>
            <p className="budget-header-subtitle">{MOCK_USER_NAME} • Demo Mode</p>
          </div>
        </div>
        <div className="budget-header-avatar">{getInitials(MOCK_USER_NAME)}</div>
      </header>

      <section className="budget-section">
        <div className="budget-total-row">
          <span className="budget-total-label">Monthly Budget</span>
          {editingTotal ? (
            <input
              type="number"
              className="budget-total-edit"
              value={totalMonthly}
              onChange={(e) => setTotalMonthly(Number(e.target.value) || 0)}
              onBlur={() => setEditingTotal(false)}
              autoFocus
              min={0}
              step={50}
            />
          ) : (
            <span className="budget-total-value" onClick={() => setEditingTotal(true)} role="button" tabIndex={0}>
              {formatCurrency(totalMonthly)}
            </span>
          )}
        </div>

        {/* Pie chart */}
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
                onClick={handlePieClick}
                label={renderCustomizedLabel}
                labelLine={false}
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
            <div className="budget-pie-center-sub">of {formatCurrency(totalMonthly)}</div>
          </div>
        </div>

        {/* Add expense button */}
        <button type="button" className="budget-add-btn" onClick={() => setShowAddModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Expense
        </button>

        {/* Legend */}
        <div className="budget-pie-legend">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="budget-legend-item"
              onClick={() => handleLegendClick(cat)}
            >
              <div className="budget-legend-dot" style={{ background: cat.color }} />
              <span className="budget-legend-name">{cat.emoji} {cat.name}</span>
              <span className="budget-legend-amount">{formatCurrency(spentByCategory[cat.name] || 0)}</span>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="budget-view-toggle" style={{ marginTop: 24 }}>
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

        {viewMode === 'month' ? (
          /* Monthly view - progress bars per category */
          <div>
            {categories.map((cat) => {
              const spent = spentByCategory[cat.name] || 0
              const budget = cat.amount
              const left = budget - spent
              const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
              const over = spent > budget

              return (
                <div key={cat.id} className="budget-category-card" onClick={() => handleLegendClick(cat)} style={{ cursor: 'pointer' }}>
                  <div className="budget-category-header">
                    <div className="budget-category-left">
                      <div className="budget-category-icon" style={{ background: over ? '#ef4444' : cat.color }}>{cat.emoji}</div>
                      <div className="budget-category-info">
                        <div className="budget-category-name">{cat.name}</div>
                        <div className="budget-category-budget">Budget: {formatCurrency(budget)}</div>
                      </div>
                    </div>
                    <div className="budget-category-right">
                      <div className="budget-category-spent" style={{ color: over ? '#f87171' : '#e2e8f0' }}>{formatCurrency(spent)}</div>
                      <div className={`budget-category-left-amount ${over ? 'over' : ''}`}>
                        {over ? `Over by ${formatCurrency(spent - budget)}` : `Left ${formatCurrency(left)}`}
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
                          : `linear-gradient(90deg, ${cat.color}, ${cat.color}dd)`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Weekly view */
          <div>
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

            {categories.map((cat) => {
              const catExpenses = weekExpensesByCategory[cat.name] || []
              const weekBudget = weeklyBudgetPerCategory[cat.name] || 0
              const totalCatSpent = catExpenses.reduce((s, e) => s + e.amount, 0)
              const catLeft = weekBudget - totalCatSpent
              const catOver = totalCatSpent > weekBudget
              const catPct = weekBudget > 0 ? Math.min(100, (totalCatSpent / weekBudget) * 100) : 0

              return (
                <div key={cat.id} className="budget-category-card">
                  <div className="budget-category-header">
                    <div className="budget-category-left">
                      <div className="budget-category-icon" style={{ background: catOver ? '#ef4444' : cat.color }}>{cat.emoji}</div>
                      <div className="budget-category-info">
                        <div className="budget-category-name">{cat.name}</div>
                        <div className="budget-category-budget">Weekly: {formatCurrency(weekBudget)}</div>
                      </div>
                    </div>
                    <div className="budget-category-right">
                      <div className="budget-category-spent" style={{ color: catOver ? '#f87171' : '#e2e8f0' }}>{formatCurrency(totalCatSpent)}</div>
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
                          : `linear-gradient(90deg, ${cat.color}, ${cat.color}dd)`,
                      }}
                    />
                  </div>

                  {catExpenses.length === 0 ? (
                    <div className="budget-empty-week">No expenses this week</div>
                  ) : (
                    catExpenses.map((exp) => {
                      const expPct = weekBudget > 0 ? Math.min(100, (exp.amount / weekBudget) * 100) : 0
                      return (
                        <div key={exp.id} className="budget-expense-row">
                          <div className="budget-expense-row-top">
                            <span className="budget-expense-name">{exp.description}</span>
                            <div className="budget-expense-amounts">
                              <div className="budget-expense-spent">{formatCurrency(exp.amount)}</div>
                            </div>
                          </div>
                          <div className="budget-expense-progress">
                            <div
                              className="budget-expense-progress-fill"
                              style={{ 
                                width: `${expPct}%`,
                                background: catOver
                                  ? 'linear-gradient(90deg, #f87171, #ef4444)'
                                  : `linear-gradient(90deg, ${cat.color}, ${cat.color}dd)`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {showAddModal && (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddExpense}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          defaultDate={now.toISOString().slice(0, 10)}
        />
      )}

      {showEditCategoryModal && editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => { setShowEditCategoryModal(false); setEditingCategory(null) }}
          onSave={handleUpdateCategoryBudget}
        />
      )}
    </div>
  )
}

interface AddExpenseModalProps {
  onClose: () => void
  onSubmit: (description: string, amount: number, category: string, date?: string) => void
  categories: { id: string; name: string }[]
  defaultDate: string
}

function AddExpenseModal({ onClose, onSubmit, categories, defaultDate }: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[0]?.id ?? '')
  const [date, setDate] = useState(defaultDate)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amountNum = parseFloat(amount)
    if (!description.trim()) { setError('Enter a description'); return }
    if (isNaN(amountNum) || amountNum <= 0) { setError('Enter a valid amount'); return }
    const categoryName = categories.find((c) => c.id === category)?.name ?? category
    onSubmit(description.trim(), amountNum, categoryName, date)
    onClose()
  }

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={(e) => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>Add expense</h2>
          <button type="button" className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="budget-modal-error">{error}</div>}
          <div className="budget-form-group">
            <label>Description</label>
            <input type="text" placeholder="e.g. Groceries" value={description} onChange={(e) => setDescription(e.target.value)} className="budget-input" autoFocus />
          </div>
          <div className="budget-form-group">
            <label>Amount ($)</label>
            <input type="number" placeholder="0.00" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="budget-input" />
          </div>
          <div className="budget-form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="budget-select">
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="budget-form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="budget-input" />
          </div>
          <button type="submit" className="budget-submit-btn">Add expense</button>
        </form>
      </div>
    </div>
  )
}

interface EditCategoryModalProps {
  category: CategoryAllocation
  onClose: () => void
  onSave: (categoryId: string, newAmount: number) => void
}

function EditCategoryModal({ category, onClose, onSave }: EditCategoryModalProps) {
  const [amount, setAmount] = useState(String(category.amount))
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 0) { setError('Enter a valid amount'); return }
    onSave(category.id, amountNum)
    onClose()
  }

  return (
    <div className="budget-modal-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={(e) => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h2>Edit {category.emoji} {category.name}</h2>
          <button type="button" className="budget-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="budget-modal-error">{error}</div>}
          <div className="budget-form-group">
            <label>Monthly budget ($)</label>
            <input type="number" placeholder="0" step="10" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="budget-input" autoFocus />
          </div>
          <button type="submit" className="budget-submit-btn">Save</button>
        </form>
      </div>
    </div>
  )
}
