import Link from 'next/link'

export default function TripsPage() {
  return (
    <div className="subpage-container">
      <div className="subpage-header">
        <Link href="/" className="back-link">
          ← Back
        </Link>
        <h1 className="subpage-title">Trips & Splits</h1>
        <p className="subpage-description">
          Organize group trips and fairly split shared expenses.
        </p>
      </div>
      <div className="content-card">
        <p className="placeholder-text">Trip features coming soon</p>
      </div>
    </div>
  )
}
