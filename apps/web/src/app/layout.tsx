import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Header from './components/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Viraly — AI Creator Growth Coach',
  description: 'Don\'t guess your next reel. We decide it. Trend-powered scripts, reel feedback, and growth intelligence.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased font-sans bg-canvas text-text-body" style={{ background: '#000000' }}>
        <AuthProvider>
          <Header />
          <div className="relative z-10">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
}
