import type { Metadata } from 'next'
import './globals.css'
import './unified-theme.css'

export const metadata: Metadata = {
  title: 'Task by Gershon.AI',
  description: 'What every Gershon Consulting team member has to do, client by client.',
  applicationName: 'Task by Gershon.AI',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-[#fafafa] text-[#1d1d1f]">{children}</body>
    </html>
  )
}
