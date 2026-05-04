'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

const features = [
  { name: 'Dashboard', href: '/dashboard', desc: 'Your growth command center' },
  { name: 'Daily Scripts', href: '/scripts', desc: 'Trend-powered viral scripts' },
  { name: 'Reel Feedback', href: '/reels', desc: 'Smart reel analysis' },
  { name: 'Virality Score', href: '/virality', desc: 'Predict before you post' },
  { name: 'Trend Radar', href: '/trends', desc: 'What\'s trending right now' },
  { name: 'Hook Library', href: '/hooks', desc: 'Proven viral openers' },
  { name: 'Streak', href: '/streak', desc: 'Stay consistent, stay growing' },
  { name: 'Analytics', href: '/analytics', desc: 'Deep growth insights' },
  { name: 'Monetization', href: '/monetization', desc: 'Turn followers into income' },
]

const stats = [
  { value: '10K+', label: 'CREATORS' },
  { value: '3M+', label: 'SCRIPTS' },
  { value: '89%', label: 'GROWTH RATE' },
  { value: '4.9', label: 'RATING' },
]

export default function Home() {
  const { accessToken, creator, logout } = useAuth()

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ height: '64px', background: '#000000', borderBottom: '1px solid #262626' }}>
        <div className="editorial-container flex items-center justify-between h-full">
          <Link href="/" className="wordmark">VIRALY</Link>
          <nav className="hidden md:flex items-center" style={{ gap: '40px' }}>
            <Link href="/dashboard" className="nav-item">DASHBOARD</Link>
            <Link href="/scripts" className="nav-item">SCRIPTS</Link>
            <Link href="/trends" className="nav-item">TRENDS</Link>
          </nav>
          <div className="flex items-center gap-4">
            {accessToken ? (
              <>
                <span className="text-sm text-muted hidden sm:block" style={{ fontWeight: 300 }}>{creator?.email}</span>
                <button onClick={logout} className="btn-ghost">LOGOUT</button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-item">SIGN IN</Link>
                <Link href="/register" className="btn-primary">GET STARTED</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="editorial-container text-center" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
        <p className="caption-upper mb-6">TRUSTED BY 10,000+ CREATORS</p>
        <h1 className="mx-auto max-w-4xl">
          Don&apos;t guess your next reel.{' '}
          <span className="text-accent">We decide it.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-sm text-muted" style={{ fontWeight: 300 }}>
          Trend-powered scripts, AI reel feedback, virality predictions, and growth analytics — your complete creator operating system.
        </p>

        {!accessToken && (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary px-10" style={{ height: '52px' }}>
              START GROWING — FREE
            </Link>
            <Link href="/login" className="btn-ghost px-8" style={{ height: '52px' }}>
              SIGN IN
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: '#262626' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#000000', padding: '24px' }} className="text-center">
              <p className="spec-value" style={{ fontSize: '36px' }}>{s.value}</p>
              <p className="spec-label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ paddingBottom: '120px' }}>
        <div className="editorial-container">
          <div className="text-center mb-16">
            <p className="section-label mb-3">PLATFORM</p>
            <h2>Everything you need to <span className="text-accent">go viral</span></h2>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: '#262626' }}>
            {features.map((f) => (
              <Link key={f.href} href={f.href}
                className="group p-8 transition-colors hover:bg-surface-elevated" style={{ background: '#141414' }}>
                <h6 className="group-hover:text-accent transition-colors">{f.name}</h6>
                <p className="text-xs text-muted mt-2" style={{ fontWeight: 300 }}>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #262626', padding: '40px 0' }} className="text-center">
        <p className="caption-upper">&copy; 2026 VIRALY. BUILT FOR CREATORS WHO WANT TO GROW.</p>
      </footer>
    </div>
  )
}
