'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

interface Trend { id: string; title: string; description: string; exampleFormat: string; engagementLiftPercent: number; niche: string; updatedAt: string }
const NICHES = ['fitness','finance','comedy','beauty','fashion','food','travel','tech','education','lifestyle']
function isStale(updatedAt: string) { return Date.now() - new Date(updatedAt).getTime() > 48 * 3600000 }

export default function TrendsPage() {
  const { getToken } = useAuth()
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [niche, setNiche] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const q = niche ? `?niche=${encodeURIComponent(niche)}` : ''
        const res = await apiFetch<{ trends: Trend[]; isFallback?: boolean }>(`/trends${q}`, getToken)
        setTrends(res.trends); setIsFallback(res.isFallback ?? false)
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load trends') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken, niche])

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Trend radar</h1>
        <p className="text-sm text-white/40 mb-8">Trending content formats updated daily.</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => setNiche('')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!niche ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 hover:text-white/60 border border-transparent hover:bg-white/[0.03]'}`}>
            All
          </button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => setNiche(n)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${niche === n ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 hover:text-white/60 border border-transparent hover:bg-white/[0.03]'}`}>
              {n}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-6 glass rounded-2xl border-red-500/20 bg-red-500/5 p-4"><p className="text-sm text-red-300">{error}</p></div>}

        {isFallback && !loading && trends.length > 0 && (
          <div className="mb-6 glass rounded-2xl border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">Showing recent trends (auto-refresh pending)</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-16"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /><span className="text-sm text-white/40">Loading trends...</span></div>
        ) : trends.length === 0 ? (
          <div className="text-center py-16"><p className="text-sm text-white/40">No trends found{niche ? ` for "${niche}"` : ''}.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trends.map((t) => {
              const stale = isStale(t.updatedAt)
              return (
                <div key={t.id} className={`glass rounded-2xl p-5 transition-all card-3d ${stale ? 'opacity-40' : ''}`}>
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 uppercase">{t.niche}</span>
                  <h3 className="text-sm font-semibold text-white mt-3 mb-1">{t.title}</h3>
                  <p className="text-xs text-white/50 mb-3">{t.description}</p>
                  <div className="border-t border-white/[0.06] pt-3 mb-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Example format</p>
                    <p className="text-xs text-white/50">{t.exampleFormat}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-400">+{t.engagementLiftPercent}%</span>
                    <Link href={`/scripts?mode=trend&idea=${encodeURIComponent(t.title + ' - ' + t.exampleFormat)}`}
                      className="btn-premium rounded-xl px-4 py-2 text-xs font-semibold text-white">
                      Script →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
