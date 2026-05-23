import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GershonCRM — Task Manager',
  description: 'Task management for Gershon Consulting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
