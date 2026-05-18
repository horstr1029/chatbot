import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'MST Chatbot',
  description: 'Department-scoped AI assistant',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MST Chatbot' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
