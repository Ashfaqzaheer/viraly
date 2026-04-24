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
    return <span className="text-white/40">0</span>
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /><span className="text-sm text-white/40">Loading analytics...</span></div></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4"><div role="alert" className="glass rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center max-w-md"><p className="text-sm text-red-300">{error}</p></div></div>

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-cyan-600 top-[-100px] left-[-80px] animate-float" />
      <div className="orb w-[300px] h-[300px] bg-sky-500 bottom-[-50px] right-[-60px] animate-float-delayed" />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting} className="glass rounded-xl px-4 py-2.5 text-xs font-medium text-white/50 hover:text-white hover:border-white/20 transition disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Followers', value: data?.followerCount?.toLocaleString() ?? '0' },
            { label: 'Growth (7d)', value: growthBadge(data?.followerGrowth7d ?? 0) },
            { label: 'Growth (30d)', value: growthBadge(data?.followerGrowth30d ?? 0) },
            { label: 'Consistency', value: `${data?.postingConsistency30d ?? 0}%` },
          ].map((m, i) => (
            <div key={m.label} className="card-3d glass rounded-2xl p-5 text-center animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-2xl font-bold text-white">{m.value}</p>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-4xl font-bold gradient-text">{data?.streak.current ?? 0}</p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Current Streak</p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-4xl font-bold text-white">{data?.streak.highest ?? 0}</p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Best Streak</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-3">Submitted Reels</h2>
        {!data?.reels.length ? (
          <div className="glass rounded-2xl p-8 text-center"><p className="text-sm text-white/40">No reels submitted yet.</p></div>
        ) : (
          <div className="space-y-2">{data.reels.map((r) => (
            <div key={r.id} className="glass rounded-xl p-4 flex items-center justify-between transition-all hover:border-white/10">
              <div className="min-w-0 flex-1"><p className="text-sm text-white/80 truncate">{r.url}</p><p className="text-xs text-white/30 mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p></div>
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
