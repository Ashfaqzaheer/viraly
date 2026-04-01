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
        setTrends(res.trends)
        setIsFallback(res.isFallback ?? false)
      }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load trends') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken, niche])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-emerald-600 top-[-100px] right-[-80px] animate-float" />
      <div className="orb w-[300px] h-[300px] bg-teal-500 bottom-[-50px] left-[-60px] animate-float-delayed" />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Trend Radar</h1>
        <p className="text-sm text-white/40 mb-6">Trending content formats updated daily.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => setNiche('')} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${!niche ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white hover:border-white/20'}`}>All</button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => setNiche(n)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${niche === n ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white hover:border-white/20'}`}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-6 glass rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {isFallback && !loading && trends.length > 0 && (
          <div className="mb-4 glass rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-300">🔥 Showing recent trends (auto-refresh pending)</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /><span className="text-sm text-white/40">Loading trends...</span></div>
        ) : trends.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center"><p className="text-sm text-white/40">No trends found{niche ? ` for "${niche}"` : ''}.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trends.map((t, i) => {
              const stale = isStale(t.updatedAt)
              return (
                <div key={t.id} className={`card-3d glass rounded-2xl p-5 transition-all animate-slide-up ${stale ? 'opacity-40' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white/90">{t.title}</h3>
                    <span className="shrink-0 ml-2 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">+{t.engagementLiftPercent}%</span>
                  </div>
                  <p className="text-sm text-white/50 mb-3">{t.description}</p>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 mb-3">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Example Format</p>
                    <p className="text-sm text-white/60">{t.exampleFormat}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-white/40">{t.niche}</span>
                    <div className="flex items-center gap-2">
                      {stale && <span className="text-xs text-amber-400 font-medium">Stale</span>}
                      <Link href={`/scripts?mode=trend&idea=${encodeURIComponent(t.title + ' - ' + t.exampleFormat)}`} className="btn-premium rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white">
                        🎬 Generate Script
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-violet-500/5 border border-violet-500/10 p-2.5">
                    <p className="text-xs text-violet-300/70">💡 Why it works: {t.description.split('.')[0]}.</p>
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
