import '@/styles/globals.css'
import BottomNav, { NavVisibilityProvider } from '@/components/BottomNav'

export const metadata = {
  title: 'Budgieee',
  description: 'Budget, trips, and community',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <NavVisibilityProvider>
          {children}
          <BottomNav />
        </NavVisibilityProvider>
      </body>
    </html>
  )
}
