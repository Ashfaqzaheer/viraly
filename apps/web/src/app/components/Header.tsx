'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, Creator } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/scripts', label: 'Scripts' },
  { href: '/streak', label: 'Streak' },
  { href: '/reels', label: 'Reels' },
  { href: '/virality', label: 'Virality' },
  { href: '/trends', label: 'Trends' },
  { href: '/hooks', label: 'Hooks' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/monetization', label: 'Monetize' },
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
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function handleScroll() { setScrolled(window.scrollY > 10) }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  if (pathname === '/login' || pathname === '/register' || pathname === '/onboarding' || pathname === '/' || pathname === '/auth/callback') return null

  return (
    <header className={`sticky top-0 z-50 h-16 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent border-b border-white/[0.04]'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-full">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition group-hover:shadow-violet-500/30 group-hover:scale-105">
              V
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">Viraly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'text-white bg-white/[0.06]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Streak badge */}
          {streak.current > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium">
              🔥 {streak.current}
            </span>
          )}

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-white font-medium transition-all hover:bg-white/[0.08] hover:border-white/[0.12]">
              {getInitials(creator)}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-strong rounded-2xl overflow-hidden animate-fade-in">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white shrink-0">
                      {getInitials(creator)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{creator?.displayName || 'Creator'}</p>
                      <p className="text-xs text-white/40 truncate">{creator?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex gap-3">
                    <div className="flex-1 text-center glass rounded-xl p-3">
                      <p className="text-lg font-semibold text-violet-400">{streak.current}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Current</p>
                    </div>
                    <div className="flex-1 text-center glass rounded-xl p-3">
                      <p className="text-lg font-semibold text-white">{streak.highest}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Best</p>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-white/[0.06] mx-4" />
                <div className="px-4 py-3 space-y-2">
                  {creator?.primaryNiche && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Niche</span>
                      <span className="text-xs text-violet-300 capitalize">{creator.primaryNiche}</span>
                    </div>
                  )}
                  {creator?.instagramHandle && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Instagram</span>
                      <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:text-violet-300 transition">@{creator.instagramHandle}</a>
                    </div>
                  )}
                </div>
                <div className="h-px bg-white/[0.06] mx-4" />
                <div className="p-2">
                  <Link href="/onboarding" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition">
                    Edit profile
                  </Link>
                  <button onClick={() => { setProfileOpen(false); logout() }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.05] transition">
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white transition" aria-label="Toggle menu">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="lg:hidden glass-strong border-t border-white/[0.06] animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-3 gap-2">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-center py-3 rounded-xl text-sm transition-colors ${
                  pathname === item.href ? 'text-white bg-white/[0.06]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
