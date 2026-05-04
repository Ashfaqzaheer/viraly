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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
        <p className="section-label mb-2">CONTENT INTELLIGENCE</p>
        <h3 className="mb-2">Trend radar</h3>
        <p className="text-sm text-muted mb-8" style={{ fontWeight: 300 }}>Trending content formats updated daily.</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button type="button" onClick={() => setNiche('')}
            className={`nav-item px-3 py-1.5 transition-colors ${!niche ? 'text-white' : ''}`}
            style={{ borderBottom: !niche ? '1px solid #ffffff' : '1px solid transparent' }}>
            ALL
          </button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => setNiche(n)}
              className={`nav-item px-3 py-1.5 transition-colors ${niche === n ? 'text-white' : ''}`}
              style={{ borderBottom: niche === n ? '1px solid #ffffff' : '1px solid transparent' }}>
              {n.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-6 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>}

        {isFallback && !loading && trends.length > 0 && (
          <div className="mb-6 border border-amber-500/30 px-4 py-3">
            <p className="text-xs text-amber-300" style={{ fontWeight: 300 }}>Showing recent trends (auto-refresh pending)</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="spinner" /><span className="text-sm text-muted">Loading trends...</span></div>
        ) : trends.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm text-muted">No trends found{niche ? ` for "${niche}"` : ''}.</p></div>
        ) : (
          <div className="grid gap-px sm:grid-cols-2" style={{ background: '#262626' }}>
            {trends.map((t) => {
              const stale = isStale(t.updatedAt)
              return (
                <div key={t.id} className={`transition-all ${stale ? 'opacity-40' : ''}`} style={{ background: '#141414', padding: '24px' }}>
                  <p className="caption-upper mb-2">{t.niche}</p>
                  <h5 className="mb-2">{t.title}</h5>
                  <p className="text-sm text-body mb-3" style={{ fontWeight: 300 }}>{t.description}</p>
                  <div style={{ borderTop: '1px solid #262626', paddingTop: '12px', marginBottom: '12px' }}>
                    <p className="caption-upper mb-1">EXAMPLE FORMAT</p>
                    <p className="text-sm text-body" style={{ fontWeight: 300 }}>{t.exampleFormat}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-white" style={{ fontWeight: 400, letterSpacing: '2px' }}>+{t.engagementLiftPercent}%</span>
                    <Link href={`/scripts?mode=trend&idea=${encodeURIComponent(t.title + ' - ' + t.exampleFormat)}`} className="btn-primary text-xs h-8 px-4">
                      SCRIPT
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
