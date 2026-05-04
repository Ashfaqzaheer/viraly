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

  function growthColor(v: number) { return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-white/40' }
  function growthText(v: number) { return v > 0 ? `+${v}` : `${v}` }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4"><div className="glass rounded-2xl border-red-500/20 bg-red-500/5 p-6 text-center max-w-md"><p className="text-sm text-red-300">{error}</p></div></div>

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-white/40 mt-1">Your growth metrics at a glance</p>
          </div>
          <button type="button" onClick={handleExport} disabled={exporting}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-white">{data?.followerCount?.toLocaleString() ?? '0'}</p>
            <p className="text-xs text-white/40 mt-1">Followers</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className={`text-2xl font-bold ${growthColor(data?.followerGrowth7d ?? 0)}`}>{growthText(data?.followerGrowth7d ?? 0)}</p>
            <p className="text-xs text-white/40 mt-1">Growth (7d)</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className={`text-2xl font-bold ${growthColor(data?.followerGrowth30d ?? 0)}`}>{growthText(data?.followerGrowth30d ?? 0)}</p>
            <p className="text-xs text-white/40 mt-1">Growth (30d)</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-white">{data?.postingConsistency30d ?? 0}%</p>
            <p className="text-xs text-white/40 mt-1">Consistency</p>
          </div>
        </div>

        {/* Streak */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <p className="text-3xl font-bold text-violet-400">{data?.streak.current ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Current streak</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-3xl font-bold text-white">{data?.streak.highest ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Best streak</p>
          </div>
        </div>

        {/* Reels */}
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Submitted reels</p>
          {!data?.reels.length ? (
            <p className="text-sm text-white/40 text-center py-8">No reels submitted yet.</p>
          ) : (
            <div>
              {data.reels.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{r.url}</p>
                    <p className="text-xs text-white/30 mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p>
                  </div>
                  {r.viralityScore !== null && (
                    <span className={`text-sm font-medium ${r.viralityScore >= 70 ? 'text-emerald-400' : r.viralityScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{r.viralityScore}/100</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
