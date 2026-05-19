import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import { SwRegister } from '@/components/SwRegister'
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
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MST Chatbot' },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('theme');if(s==='dark'||(s==null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()` }} />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
