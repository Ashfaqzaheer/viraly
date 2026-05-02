'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

const features = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', desc: 'Your growth command center' },
  { name: 'Daily Scripts', href: '/scripts', icon: '📝', desc: 'Trend-powered viral scripts' },
  { name: 'Reel Feedback', href: '/reels', icon: '🎬', desc: 'Smart reel analysis' },
  { name: 'Virality Score', href: '/virality', icon: '🚀', desc: 'Predict before you post' },
  { name: 'Trend Radar', href: '/trends', icon: '📡', desc: 'What\'s trending right now' },
  { name: 'Hook Library', href: '/hooks', icon: '🪝', desc: 'Proven viral openers' },
  { name: 'Streak', href: '/streak', icon: '🔥', desc: 'Stay consistent, stay growing' },
  { name: 'Analytics', href: '/analytics', icon: '📈', desc: 'Deep growth insights' },
  { name: 'Monetization', href: '/monetization', icon: '💰', desc: 'Turn followers into income' },
]

const stats = [
  { value: '10K+', label: 'Creators' },
  { value: '3M+', label: 'Scripts Generated' },
  { value: '89%', label: 'Avg Growth Rate' },
  { value: '4.9★', label: 'Rating' },
]

export default function Home() {
  const { accessToken, creator, logout } = useAuth()

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-hairline" style={{ height: '64px' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-full">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-display-sm text-white font-bold uppercase">VIRALY</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/dashboard" className="text-sm font-bold uppercase tracking-[1.5px] text-text-muted transition-colors hover:text-white">Dashboard</Link>
            <Link href="/scripts" className="text-sm font-bold uppercase tracking-[1.5px] text-text-muted transition-colors hover:text-white">Scripts</Link>
            <Link href="/trends" className="text-sm font-bold uppercase tracking-[1.5px] text-text-muted transition-colors hover:text-white">Trends</Link>
            <Link href="/analytics" className="text-sm font-bold uppercase tracking-[1.5px] text-text-muted transition-colors hover:text-white">Analytics</Link>
          </nav>
          <div className="flex items-center gap-3">
            {accessToken ? (
              <>
                <span className="hidden text-sm text-text-muted sm:block">{creator?.email}</span>
                <button
                  onClick={logout}
                  className="btn-secondary h-10 px-4 text-xs"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold uppercase tracking-[1.5px] text-text-muted hover:text-white transition-colors px-4 py-2">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary h-10 px-5 text-xs">
                  GET STARTED
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-24 text-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 border border-hairline bg-surface-soft px-4 py-1.5 text-sm text-text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Trusted by 10,000+ creators worldwide
          </div>
          <h1 className="mx-auto max-w-4xl text-display-xl uppercase font-bold leading-[1.0] tracking-tight">
            Don&apos;t Guess Your Next Reel.{' '}
            <span className="text-accent">We Decide It.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-md text-text-muted">
            Trend-powered scripts, AI reel feedback, virality predictions, and growth analytics — your complete creator operating system.
          </p>
        </div>

        {!accessToken && (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-primary px-10 py-4 text-base h-auto"
            >
              START GROWING — IT&apos;S FREE
            </Link>
            <Link
              href="/login"
              className="btn-secondary px-8 py-4 text-base h-auto gap-2"
            >
              SIGN IN
              <span>{"\u2192"}</span>
            </Link>
          </div>
        )}

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="spec-cell text-center">
              <p className="spec-value">{s.value}</p>
              <p className="spec-label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-display-md uppercase font-bold">
            Everything You Need to <span className="text-accent">Go Viral</span>
          </h2>
          <p className="mt-3 text-text-muted">Nine powerful tools, one platform.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card group hover:border-white transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center bg-surface-soft border border-hairline text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-white uppercase group-hover:text-accent transition-colors">
                {f.name}
              </h3>
              <p className="mt-1.5 text-sm text-text-muted">
                {f.desc}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-text-muted uppercase tracking-[1.5px] opacity-0 transition-opacity group-hover:opacity-100">
                Explore <span>{"\u2192"}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-10 text-center text-sm text-text-muted">
        <p>&copy; 2026 Viraly. Built for creators who want to grow.</p>
      </footer>
    </div>
  )
}
