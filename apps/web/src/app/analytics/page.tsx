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

  function growthBadge(v: number) {
    if (v > 0) return <span className="text-emerald-400">+{v}</span>
    if (v < 0) return <span className="text-red-400">{v}</span>
    return <span className="text-text-muted">0</span>
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="flex items-center gap-3"><span className="spinner" /><span className="text-sm text-text-muted">Loading analytics...</span></div></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4 bg-black"><div role="alert" className="card border-red-500/30 bg-red-500/10 p-6 text-center max-w-md"><p className="text-sm text-red-300">{error}</p></div></div>

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
            <h1 className="text-display-md uppercase font-bold text-white">Analytics</h1>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary h-10 px-4 text-xs disabled:opacity-50">
            {exporting ? 'EXPORTING...' : 'EXPORT CSV'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Followers', value: data?.followerCount?.toLocaleString() ?? '0' },
            { label: 'Growth (7d)', value: growthBadge(data?.followerGrowth7d ?? 0) },
            { label: 'Growth (30d)', value: growthBadge(data?.followerGrowth30d ?? 0) },
            { label: 'Consistency', value: `${data?.postingConsistency30d ?? 0}%` },
          ].map((m) => (
            <div key={m.label} className="spec-cell text-center">
              <p className="spec-value">{m.value}</p>
              <p className="spec-label">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="spec-cell text-center">
            <p className="spec-value text-accent streak-pulse">{data?.streak.current ?? 0}</p>
            <p className="spec-label">Current Streak</p>
          </div>
          <div className="spec-cell text-center">
            <p className="spec-value">{data?.streak.highest ?? 0}</p>
            <p className="spec-label">Best Streak</p>
          </div>
        </div>

        <h2 className="text-title-lg uppercase font-bold text-white mb-3">Submitted Reels</h2>
        {!data?.reels.length ? (
          <div className="card p-8 text-center"><p className="text-sm text-text-muted">No reels submitted yet.</p></div>
        ) : (
          <div className="space-y-2">{data.reels.map((r) => (
            <div key={r.id} className="card flex items-center justify-between hover:border-white transition-colors">
              <div className="min-w-0 flex-1"><p className="text-sm text-text-body truncate">{r.url}</p><p className="text-xs text-text-muted mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p></div>
              {r.viralityScore !== null && (
                <span className={`shrink-0 ml-3 text-sm font-bold ${r.viralityScore >= 70 ? 'text-emerald-400' : r.viralityScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{r.viralityScore}/100</span>
              )}
            </div>
          ))}</div>
        )}
      </main>
    </div>
  )
}
