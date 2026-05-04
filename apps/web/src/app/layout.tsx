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
      <body className="min-h-screen antialiased font-sans bg-[#0a0a0f] text-white/70">
        {/* Subtle aurora blobs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600 opacity-[0.03] blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-purple-600 opacity-[0.04] blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500 opacity-[0.03] blur-3xl" />
        </div>
        <AuthProvider>
          <Header />
          <div className="relative z-10">{children}</div>
        </AuthProvider>
      </body>
    </html>
  )
}
