'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

const features = [
  { name: 'Dashboard', href: '/dashboard', desc: 'Your growth command center', icon: '🏠' },
  { name: 'Daily scripts', href: '/scripts', desc: 'Trend-powered viral scripts', icon: '✍️' },
  { name: 'Reel feedback', href: '/reels', desc: 'Smart reel analysis', icon: '🎬' },
  { name: 'Virality score', href: '/virality', desc: 'Predict before you post', icon: '🚀' },
  { name: 'Trend radar', href: '/trends', desc: 'What\'s trending right now', icon: '📈' },
  { name: 'Hook library', href: '/hooks', desc: 'Proven viral openers', icon: '🪝' },
  { name: 'Streak', href: '/streak', desc: 'Stay consistent, stay growing', icon: '🔥' },
  { name: 'Analytics', href: '/analytics', desc: 'Deep growth insights', icon: '📊' },
  { name: 'Monetization', href: '/monetization', desc: 'Turn followers into income', icon: '💰' },
]

const stats = [
  { value: '10K+', label: 'Creators' },
  { value: '3M+', label: 'Scripts' },
  { value: '89%', label: 'Growth rate' },
  { value: '4.9', label: 'Rating' },
]

export default function Home() {
  const { accessToken, creator, logout } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white shadow-lg shadow-violet-500/20">
              V
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">Viraly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition">Dashboard</Link>
            <Link href="/scripts" className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition">Scripts</Link>
            <Link href="/trends" className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition">Trends</Link>
          </nav>
          <div className="flex items-center gap-3">
            {accessToken ? (
              <>
                <span className="text-sm text-white/40 hidden sm:block">{creator?.email}</span>
                <button onClick={logout} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition">Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition">Sign in</Link>
                <Link href="/register" className="btn-premium rounded-xl px-5 py-2 text-sm font-semibold text-white">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 text-center pt-24 pb-20">
        <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-6">Trusted by 10,000+ creators</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
          Don&apos;t guess your next reel.{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">We decide it.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-white/50">
          Trend-powered scripts, AI reel feedback, virality predictions, and growth analytics — your complete creator operating system.
        </p>

        {!accessToken && (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-premium rounded-xl px-8 py-3.5 text-sm font-semibold text-white">
              Start growing — free
            </Link>
            <Link href="/login" className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 transition">
              Sign in
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-3">Platform</p>
          <h2 className="text-3xl font-bold text-white">Everything you need to <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">go viral</span></h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link key={f.href} href={f.href}
              className="card-3d glass rounded-2xl p-6 group transition-all hover:bg-white/[0.05] hover:border-white/[0.12]">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="text-sm font-medium text-white group-hover:text-violet-300 transition">{f.name}</h3>
              <p className="text-xs text-white/40 mt-1">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-xs text-white/30">&copy; 2026 Viraly. Built for creators who want to grow.</p>
      </footer>
    </div>
  )
}
