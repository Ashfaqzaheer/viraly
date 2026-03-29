'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

const features = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', desc: 'Your growth command center', color: 'from-violet-500/20 to-purple-600/20', border: 'hover:border-violet-500/30' },
  { name: 'Daily Scripts', href: '/scripts', icon: '📝', desc: 'Trend-powered viral scripts', color: 'from-blue-500/20 to-cyan-500/20', border: 'hover:border-blue-500/30' },
  { name: 'Reel Feedback', href: '/reels', icon: '🎬', desc: 'Smart reel analysis', color: 'from-pink-500/20 to-rose-500/20', border: 'hover:border-pink-500/30' },
  { name: 'Virality Score', href: '/virality', icon: '🚀', desc: 'Predict before you post', color: 'from-amber-500/20 to-orange-500/20', border: 'hover:border-amber-500/30' },
  { name: 'Trend Radar', href: '/trends', icon: '📡', desc: 'What\'s trending right now', color: 'from-emerald-500/20 to-teal-500/20', border: 'hover:border-emerald-500/30' },
  { name: 'Hook Library', href: '/hooks', icon: '🪝', desc: 'Proven viral openers', color: 'from-indigo-500/20 to-blue-600/20', border: 'hover:border-indigo-500/30' },
  { name: 'Streak', href: '/streak', icon: '🔥', desc: 'Stay consistent, stay growing', color: 'from-red-500/20 to-orange-500/20', border: 'hover:border-red-500/30' },
  { name: 'Analytics', href: '/analytics', icon: '📈', desc: 'Deep growth insights', color: 'from-cyan-500/20 to-sky-500/20', border: 'hover:border-cyan-500/30' },
  { name: 'Monetization', href: '/monetization', icon: '💰', desc: 'Turn followers into income', color: 'from-yellow-500/20 to-amber-500/20', border: 'hover:border-yellow-500/30' },
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background orbs */}
      <div className="orb w-[600px] h-[600px] bg-violet-600 top-[-200px] left-[-100px] animate-float" />
      <div className="orb w-[500px] h-[500px] bg-cyan-500 top-[200px] right-[-150px] animate-float-delayed" />
      <div className="orb w-[400px] h-[400px] bg-pink-500 bottom-[-100px] left-[30%] animate-float-slow" />
      <div className="orb w-[300px] h-[300px] bg-indigo-600 top-[60%] left-[-50px] animate-float-delayed" />

      {/* Noise texture overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
              V
            </div>
            <span className="text-xl font-bold tracking-tight">Viraly</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/dashboard" className="text-sm text-white/50 transition hover:text-white">Dashboard</Link>
            <Link href="/scripts" className="text-sm text-white/50 transition hover:text-white">Scripts</Link>
            <Link href="/trends" className="text-sm text-white/50 transition hover:text-white">Trends</Link>
            <Link href="/analytics" className="text-sm text-white/50 transition hover:text-white">Analytics</Link>
          </nav>
          <div className="flex items-center gap-3">
            {accessToken ? (
              <>
                <span className="hidden text-sm text-white/40 sm:block">{creator?.email}</span>
                <button
                  onClick={logout}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-white">
                  Sign In
                </Link>
                <Link href="/register" className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-24 text-center">
        <div className="animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Trusted by 10,000+ creators worldwide
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-7xl">
            Don&apos;t Guess Your Next Reel.{' '}
            <span className="gradient-text">We Decide It.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/40">
            Trend-powered scripts, AI reel feedback, virality predictions, and growth analytics — your complete creator operating system.
          </p>
        </div>

        {!accessToken && (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up">
            <Link
              href="/register"
              className="btn-premium rounded-2xl px-10 py-4 text-base font-semibold text-white shadow-2xl shadow-violet-500/20"
            >
              Start Growing — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white/70 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
            >
              Sign In
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4 animate-slide-up">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-6 py-5 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to <span className="gradient-text">Go Viral</span>
          </h2>
          <p className="mt-3 text-white/40">Nine powerful tools, one platform.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className={`card-3d glass group relative rounded-2xl p-6 transition-all ${f.border}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.color} opacity-0 transition-opacity group-hover:opacity-100`} />
              <div className="relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white/90 group-hover:text-white">
                  {f.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/35 group-hover:text-white/50">
                  {f.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-violet-400 opacity-0 transition group-hover:opacity-100">
                  Explore <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 text-center text-sm text-white/25">
        <p>© 2026 Viraly. Built for creators who want to grow.</p>
      </footer>
    </div>
  )
}
