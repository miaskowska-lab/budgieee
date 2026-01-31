import Link from 'next/link'

export default function CommunityPage() {
  return (
    <div className="subpage-container">
      <div className="subpage-header">
        <Link href="/" className="back-link">
          ← Back
        </Link>
        <h1 className="subpage-title">Community</h1>
        <p className="subpage-description">
          Connect with others to share budgeting tips and travel stories.
        </p>
      </div>
      <div className="content-card">
        <p className="placeholder-text">Community features coming soon</p>
      </div>
    </div>
  )
}
