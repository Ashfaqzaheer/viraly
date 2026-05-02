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
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
        <h1 className="text-display-md uppercase font-bold text-white mb-1">Trend Radar</h1>
        <p className="text-body-sm text-text-muted mb-6">Trending content formats updated daily.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => setNiche('')} className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-[1.5px] border transition-colors ${!niche ? 'border-white text-white' : 'border-hairline text-text-muted hover:text-white hover:border-white'}`}>All</button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => setNiche(n)} className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-[1.5px] border transition-colors ${niche === n ? 'border-white text-white' : 'border-hairline text-text-muted hover:text-white hover:border-white'}`}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-6 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {isFallback && !loading && trends.length > 0 && (
          <div className="mb-4 border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-300">{"\u{1F525}"} Showing recent trends (auto-refresh pending)</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="spinner" /><span className="text-sm text-text-muted">Loading trends...</span></div>
        ) : trends.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm text-text-muted">No trends found{niche ? ` for "${niche}"` : ''}.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trends.map((t) => {
              const stale = isStale(t.updatedAt)
              return (
                <div key={t.id} className={`card transition-all ${stale ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-white uppercase">{t.title}</h3>
                    <span className="shrink-0 ml-2 tag tag-accent text-xs">+{t.engagementLiftPercent}%</span>
                  </div>
                  <p className="text-sm text-text-body mb-3">{t.description}</p>
                  <div className="bg-surface-soft border border-hairline p-3 mb-3">
                    <p className="spec-label mb-1">Example Format</p>
                    <p className="text-sm text-text-body">{t.exampleFormat}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="tag text-xs">{t.niche}</span>
                    <div className="flex items-center gap-2">
                      {stale && <span className="text-xs text-amber-400 font-bold uppercase">Stale</span>}
                      <Link href={`/scripts?mode=trend&idea=${encodeURIComponent(t.title + ' - ' + t.exampleFormat)}`} className="btn-primary text-xs h-8 px-3 tracking-[1px]">
                        {"\u{1F3AC}"} SCRIPT
                      </Link>
                    </div>
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
