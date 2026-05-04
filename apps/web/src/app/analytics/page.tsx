'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

interface ReelSummary { id: string; url: string; viralityScore: number | null; submittedAt: string }
interface StreakState { current: number; highest: number }
interface DashboardData { followerCount: number; followerGrowth7d: number; followerGrowth30d: number; postingConsistency30d: number; streak: StreakState; reels: ReelSummary[]; cachedAt: string }

export default function AnalyticsPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function load() {
      try { setData(await apiFetch<DashboardData>('/analytics/dashboard', getToken)) }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load analytics') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken])

  async function handleExport() {
    setExporting(true)
    try {
      const token = await getToken(); if (!token) return
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${API_BASE}/analytics/export-csv`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click(); URL.revokeObjectURL(url)
    } catch {} finally { setExporting(false) }
  }

  function growthColor(v: number) { return v > 0 ? '#34d399' : v < 0 ? '#ef4444' : '#666666' }
  function growthText(v: number) { return v > 0 ? `+${v}` : `${v}` }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}><span className="spinner" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}><div className="border border-red-500/30 p-6 text-center max-w-md"><p className="text-sm text-red-400">{error}</p></div></div>

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
            <p className="section-label mb-2">GROWTH METRICS</p>
            <h3>Analytics</h3>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting} className="btn-ghost">
            {exporting ? 'EXPORTING...' : 'EXPORT CSV'}
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-10" style={{ background: '#262626' }}>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value" style={{ fontSize: '36px' }}>{data?.followerCount?.toLocaleString() ?? '0'}</p>
            <p className="spec-label">FOLLOWERS</p>
          </div>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value" style={{ fontSize: '36px', color: growthColor(data?.followerGrowth7d ?? 0) }}>{growthText(data?.followerGrowth7d ?? 0)}</p>
            <p className="spec-label">GROWTH (7D)</p>
          </div>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value" style={{ fontSize: '36px', color: growthColor(data?.followerGrowth30d ?? 0) }}>{growthText(data?.followerGrowth30d ?? 0)}</p>
            <p className="spec-label">GROWTH (30D)</p>
          </div>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value" style={{ fontSize: '36px' }}>{data?.postingConsistency30d ?? 0}%</p>
            <p className="spec-label">CONSISTENCY</p>
          </div>
        </div>

        {/* Streak */}
        <div className="grid grid-cols-2 gap-px mb-10" style={{ background: '#262626' }}>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value text-accent" style={{ fontSize: '36px' }}>{data?.streak.current ?? 0}</p>
            <p className="spec-label">CURRENT STREAK</p>
          </div>
          <div style={{ background: '#141414', padding: '24px' }}>
            <p className="spec-value" style={{ fontSize: '36px' }}>{data?.streak.highest ?? 0}</p>
            <p className="spec-label">BEST STREAK</p>
          </div>
        </div>

        {/* Reels */}
        <p className="caption-upper mb-4">SUBMITTED REELS</p>
        {!data?.reels.length ? (
          <p className="text-sm text-muted text-center py-8" style={{ fontWeight: 300 }}>No reels submitted yet.</p>
        ) : (
          <div>
            {data.reels.map((r) => (
              <div key={r.id} className="flex items-center justify-between" style={{ borderBottom: '1px solid #262626', padding: '16px 0' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate" style={{ fontWeight: 300 }}>{r.url}</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p>
                </div>
                {r.viralityScore !== null && (
                  <span className="text-sm" style={{ fontWeight: 400, color: r.viralityScore >= 70 ? '#34d399' : r.viralityScore >= 40 ? '#f59e0b' : '#ef4444' }}>{r.viralityScore}/100</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
