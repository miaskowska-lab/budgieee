import Link from 'next/link'

interface NavCardProps {
  href: string
  title: string
  description: string
  icon: string
}

export default function NavCard({ href, title, description, icon }: NavCardProps) {
  return (
    <Link href={href} className="nav-card">
      <div className="nav-card-icon">{icon}</div>
      <h2 className="nav-card-title">{title}</h2>
      <p className="nav-card-description">{description}</p>
    </Link>
  )
}
