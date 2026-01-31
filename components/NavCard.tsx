import Link from 'next/link'

interface NavCardProps {
  href: string
  title: string
  description: string
}

export default function NavCard({ href, title, description }: NavCardProps) {
  return (
    <Link href={href} className="nav-card">
      <h2 className="nav-card-title">{title}</h2>
      <p className="nav-card-description">{description}</p>
    </Link>
  )
}
