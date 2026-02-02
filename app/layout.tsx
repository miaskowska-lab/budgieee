import '@/styles/globals.css'
import AppShell from '@/components/AppShell'

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
