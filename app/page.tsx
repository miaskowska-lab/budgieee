import NavCard from '@/components/NavCard'

export default function Home() {
  return (
    <main className="container">
      <h1 className="page-title">Budgieee</h1>
      <div className="nav-grid">
        <NavCard
          href="/budget"
          title="Life Budget"
          description="Track and manage your personal finances"
        />
        <NavCard
          href="/trips"
          title="Trips & Splits"
          description="Plan trips and split expenses with friends"
        />
        <NavCard
          href="/community"
          title="Community"
          description="Connect with others and share tips"
        />
      </div>
    </main>
  )
}
