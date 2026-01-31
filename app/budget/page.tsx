import Link from 'next/link'

export default function BudgetPage() {
  return (
    <div className="subpage-container">
      <div className="subpage-header">
        <Link href="/" className="back-link">
          ← Back
        </Link>
        <h1 className="subpage-title">Life Budget</h1>
        <p className="subpage-description">
          Track your income, expenses, and savings goals in one place.
        </p>
      </div>
      <div className="content-card">
        <p className="placeholder-text">Budget features coming soon</p>
      </div>
    </div>
  )
}
