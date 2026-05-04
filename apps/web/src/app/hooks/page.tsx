'use client'

import { useEffect, useState, FormEvent, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

interface Hook { id: string; content: string; niches: string[]; relevanceScore: number }
interface SearchResult { data: Hook[]; total: number; page: number; pageSize: number }
const NICHES = ['fitness','finance','comedy','beauty','fashion','food','travel','tech','education','lifestyle']

export default function HooksPage() {
  const { getToken } = useAuth()
  const [hooks, setHooks] = useState<Hook[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [niche, setNiche] = useState('')
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadHooks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (niche) params.set('niche', niche)
      if (query) params.set('query', query)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const result = await apiFetch<SearchResult>(`/hooks/search?${params}`, getToken)
      setHooks(result.data); setTotal(result.total)
    } catch {} finally { setLoading(false) }
  }, [getToken, niche, query, page, pageSize])

  useEffect(() => { loadHooks() }, [loadHooks])
  useEffect(() => {
    async function loadSaved() { try { const d = await apiFetch<{ hooks: Hook[] }>('/hooks/saved', getToken); setSavedIds(new Set(d.hooks.map(h => h.id))) } catch {} }
    loadSaved()
  }, [getToken])

  async function handleSave(hookId: string) {
    setSavingId(hookId)
    try { await apiFetch('/hooks/save', getToken, { method: 'POST', body: JSON.stringify({ hookId }) }); setSavedIds(prev => new Set(prev).add(hookId)) } catch {} finally { setSavingId(null) }
  }
  function handleSearch(e: FormEvent) { e.preventDefault(); setPage(1); setQuery(searchInput) }
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
        <p className="section-label mb-2">CONTENT LIBRARY</p>
        <h3 className="mb-2">Hook library</h3>
        <p className="text-sm text-muted mb-8" style={{ fontWeight: 300 }}>Browse proven viral hooks for your reels.</p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-4 items-end mb-6">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search hooks..." className="input flex-1" />
          <button type="submit" className="btn-primary">SEARCH</button>
        </form>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button type="button" onClick={() => { setNiche(''); setPage(1) }}
            className={`nav-item px-3 py-1.5 ${!niche ? 'text-white' : ''}`}
            style={{ borderBottom: !niche ? '1px solid #ffffff' : '1px solid transparent' }}>
            ALL
          </button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => { setNiche(n); setPage(1) }}
              className={`nav-item px-3 py-1.5 ${niche === n ? 'text-white' : ''}`}
              style={{ borderBottom: niche === n ? '1px solid #ffffff' : '1px solid transparent' }}>
              {n.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="spinner" /></div>
        ) : hooks.length === 0 ? (
          <p className="text-sm text-muted text-center py-12" style={{ fontWeight: 300 }}>No hooks found.</p>
        ) : (
          <div>
            {hooks.map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-4" style={{ borderBottom: '1px solid #262626', padding: '20px 0' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-body mb-2" style={{ fontWeight: 300 }}>{h.content}</p>
                  <div className="flex flex-wrap gap-1.5">{h.niches.map((n) => <span key={n} className="tag">{n}</span>)}</div>
                </div>
                <button type="button" onClick={() => handleSave(h.id)} disabled={savedIds.has(h.id) || savingId === h.id}
                  className={`shrink-0 ${savedIds.has(h.id) ? 'tag-accent' : 'btn-primary text-xs h-8 px-4'}`}
                  style={savedIds.has(h.id) ? { cursor: 'default' } : {}}>
                  {savedIds.has(h.id) ? 'SAVED' : savingId === h.id ? '...' : 'SAVE'}
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs h-8 px-4 disabled:opacity-30">PREVIOUS</button>
            <span className="caption-upper">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost text-xs h-8 px-4 disabled:opacity-30">NEXT</button>
          </div>
        )}
      </main>
    </div>
  )
}
