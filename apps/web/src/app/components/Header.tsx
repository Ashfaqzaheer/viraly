'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, Creator } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/scripts', label: 'Scripts', icon: '📝' },
  { href: '/streak', label: 'Streak', icon: '🔥' },
  { href: '/reels', label: 'Reels', icon: '🎬' },
  { href: '/virality', label: 'Virality', icon: '🚀' },
  { href: '/trends', label: 'Trends', icon: '📡' },
  { href: '/hooks', label: 'Hooks', icon: '🪝' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/monetization', label: 'Monetize', icon: '💰' },
]

function getInitials(creator: Creator | null): string {
  if (creator?.displayName) {
    return creator.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }
  if (creator?.email) return creator.email[0].toUpperCase()
  return '?'
}

interface StreakData { current: number; highest: number }

export default function Header() {
  const { creator, logout, getToken } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [streak, setStreak] = useState<StreakData>({ current: 0, highest: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  // Dynamic light source on logo
  const handleLogoMouse = useCallback((e: React.MouseEvent) => {
    if (!logoRef.current) return
    const rect = logoRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6
    logoRef.current.style.boxShadow = `${-x}px ${-y}px 20px rgba(139,92,246,0.25), 0 1px 0 rgba(255,255,255,0.15) inset`
  }, [])

  const handleLogoLeave = useCallback(() => {
    if (!logoRef.current) return
    logoRef.current.style.boxShadow = '0 4px 20px rgba(139,92,246,0.2), 0 1px 0 rgba(255,255,255,0.15) inset'
  }, [])

  // Fetch streak data + listen for streak-updated events (fired after reel submission)
  const fetchStreak = useCallback(() => {
    if (!creator) return
    apiFetch<StreakData>('/streak', getToken)
      .then(data => setStreak({ current: data.current, highest: data.highest }))
      .catch(() => {})
  }, [creator, getToken])

  useEffect(() => { fetchStreak() }, [fetchStreak])

  useEffect(() => {
    function onStreakUpdated() { fetchStreak() }
    window.addEventListener('streak-updated', onStreakUpdated)
    return () => window.removeEventListener('streak-updated', onStreakUpdated)
  }, [fetchStreak])

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  // Don't render on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/onboarding' || pathname === '/' || pathname === '/auth/callback') return null

  return (
    <header className="glass-chrome sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Chrome Logo */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div ref={logoRef} onMouseMove={handleLogoMouse} onMouseLeave={handleLogoLeave}
              className="chrome-logo flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-[#1a1a2e] tracking-tight select-none">
              V
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block chrome-text">Viraly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-4">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20 shadow-sm shadow-violet-500/10'
                    : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Instagram badge */}
          {creator?.instagramHandle && (
            <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:border-white/15 transition-all duration-200">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              @{creator.instagramHandle}
            </a>
          )}

          {/* Floating Capsule Profile */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="profile-capsule flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-[25px] px-2.5 py-1.5 hover:border-violet-500/25">
              <div className="avatar-glow flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-bold text-white">
                {getInitials(creator)}
              </div>
              <span className="hidden sm:block text-xs text-white/50 max-w-[100px] truncate">
                {creator?.displayName || creator?.email?.split('@')[0]}
              </span>
              <svg className={`w-3 h-3 text-white/25 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Premium dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2.5 z-50 w-72 rounded-2xl dropdown-enter"
                style={{
                  background: 'rgba(10, 10, 18, 0.88)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.06)',
                }}>
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="avatar-glow flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 text-sm font-bold text-white shrink-0">
                      {getInitials(creator)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{creator?.displayName || 'Creator'}</p>
                      <p className="text-xs text-white/30 truncate">{creator?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
                      <p className="text-lg font-bold text-orange-400 counter-roll">{streak.current}</p>
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">Current</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
                      <p className="text-lg font-bold text-violet-400 counter-roll" style={{ animationDelay: '0.4s' }}>{streak.highest}</p>
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">Best</p>
                    </div>
                  </div>
                </div>
                <div className="mx-4 border-t border-white/[0.05]" />
                <div className="px-4 py-3 space-y-2">
                  {creator?.primaryNiche && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/25">Niche</span>
                      <span className="text-xs text-violet-400 capitalize rounded-lg bg-violet-500/10 px-2 py-0.5">{creator.primaryNiche}</span>
                    </div>
                  )}
                  {creator?.instagramHandle && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/25">Instagram</span>
                      <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors duration-200">@{creator.instagramHandle}</a>
                    </div>
                  )}
                </div>
                <div className="mx-4 border-t border-white/[0.05]" />
                <div className="p-2">
                  <Link href="/onboarding" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs text-white/40 hover:bg-white/[0.04] hover:text-white/70 transition-all duration-200 hover:translate-x-1 group">
                    <span className="text-sm group-hover:scale-110 transition-transform duration-200">⚙️</span>
                    <span>Edit Profile</span>
                  </Link>
                  <button onClick={() => { setProfileOpen(false); logout() }}
                    className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 hover:translate-x-1 group">
                    <span className="text-sm group-hover:scale-110 transition-transform duration-200">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden rounded-lg border border-white/[0.08] p-2 hover:bg-white/[0.04] transition-all duration-200" aria-label="Toggle menu">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-white/[0.06] px-4 py-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                    : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04]'
                }`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
