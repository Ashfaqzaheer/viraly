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
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
        <h1 className="text-display-md uppercase font-bold text-white mb-1">Hook Library</h1>
        <p className="text-body-sm text-text-muted mb-6">Browse proven viral hooks for your reels.</p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-5">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search hooks..."
            className="input flex-1" />
          <button type="submit" className="btn-primary">SEARCH</button>
        </form>

        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => { setNiche(''); setPage(1) }} className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-[1.5px] border transition-colors ${!niche ? 'border-white text-white' : 'border-hairline text-text-muted hover:text-white hover:border-white'}`}>All</button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => { setNiche(n); setPage(1) }} className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-[1.5px] border transition-colors ${niche === n ? 'border-white text-white' : 'border-hairline text-text-muted hover:text-white hover:border-white'}`}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="spinner" /><span className="text-sm text-text-muted">Loading...</span></div>
        ) : hooks.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm text-text-muted">No hooks found.</p></div>
        ) : (
          <div className="space-y-3">
            {hooks.map((h) => (
              <div key={h.id} className="card flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-body mb-2">{h.content}</p>
                  <div className="flex flex-wrap gap-1.5">{h.niches.map((n) => <span key={n} className="tag text-xs">{n}</span>)}</div>
                </div>
                <button type="button" onClick={() => handleSave(h.id)} disabled={savedIds.has(h.id) || savingId === h.id}
                  className={`shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-[1.5px] border transition-colors ${savedIds.has(h.id) ? 'border-accent text-accent cursor-default' : 'border-white text-white hover:bg-white hover:text-black disabled:opacity-50'}`}>
                  {savedIds.has(h.id) ? 'Saved \u2713' : savingId === h.id ? '...' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary h-10 px-4 text-xs disabled:opacity-30">PREVIOUS</button>
            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary h-10 px-4 text-xs disabled:opacity-30">NEXT</button>
          </div>
        )}
      </main>
    </div>
  )
}
