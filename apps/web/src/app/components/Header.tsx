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
    if (!profileOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  if (pathname === '/login' || pathname === '/register' || pathname === '/onboarding' || pathname === '/' || pathname === '/auth/callback') return null

  return (
    <header className="sticky top-0 z-50" style={{ height: '64px', background: '#000000', borderBottom: '1px solid #262626' }}>
      <div className="editorial-container flex items-center justify-between h-full">
        {/* Wordmark */}
        <div className="flex items-center gap-10">
          <Link href="/dashboard" className="wordmark">
            VIRALY
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center" style={{ gap: '40px' }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Streak tag */}
          {streak.current > 0 && (
            <span className="tag-accent">
              {streak.current}D
            </span>
          )}

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-hairline text-xs text-white transition-colors hover:border-white"
              style={{ fontWeight: 400, letterSpacing: '1px' }}>
              {getInitials(creator)}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64" style={{ background: '#141414', border: '1px solid #262626' }}>
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-xs text-white shrink-0" style={{ fontWeight: 400 }}>
                      {getInitials(creator)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate" style={{ fontWeight: 400 }}>{creator?.displayName || 'Creator'}</p>
                      <p className="text-xs text-muted truncate">{creator?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex gap-3">
                    <div className="flex-1 text-center" style={{ borderTop: '1px solid #262626', paddingTop: '12px' }}>
                      <p className="text-lg text-accent" style={{ fontWeight: 400 }}>{streak.current}</p>
                      <p className="spec-label">CURRENT</p>
                    </div>
                    <div className="flex-1 text-center" style={{ borderTop: '1px solid #262626', paddingTop: '12px' }}>
                      <p className="text-lg text-white" style={{ fontWeight: 400 }}>{streak.highest}</p>
                      <p className="spec-label">BEST</p>
                    </div>
                  </div>
                </div>
                <div style={{ height: '1px', background: '#262626', margin: '0 16px' }} />
                <div className="px-4 py-3 space-y-2">
                  {creator?.primaryNiche && (
                    <div className="flex items-center justify-between">
                      <span className="caption-upper">Niche</span>
                      <span className="tag-accent text-xs capitalize">{creator.primaryNiche}</span>
                    </div>
                  )}
                  {creator?.instagramHandle && (
                    <div className="flex items-center justify-between">
                      <span className="caption-upper">Instagram</span>
                      <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:text-white transition-colors">@{creator.instagramHandle}</a>
                    </div>
                  )}
                </div>
                <div style={{ height: '1px', background: '#262626', margin: '0 16px' }} />
                <div className="p-3">
                  <Link href="/onboarding" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-xs text-muted hover:text-white transition-colors" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 400 }}>
                    Edit Profile
                  </Link>
                  <button onClick={() => { setProfileOpen(false); logout() }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 400 }}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden btn-icon" aria-label="Toggle menu">
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
        <nav className="lg:hidden px-4 py-4" style={{ background: '#000000', borderTop: '1px solid #262626' }}>
          <div className="grid grid-cols-3 gap-px" style={{ background: '#262626' }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-center py-4 text-center transition-colors ${
                  pathname === item.href ? 'text-white' : 'text-muted hover:text-white'
                }`} style={{ background: '#000000', fontSize: '11px', fontWeight: 400, letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
