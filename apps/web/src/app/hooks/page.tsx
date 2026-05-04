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
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Hook library</h1>
        <p className="text-sm text-white/40 mb-8">Browse proven viral hooks for your reels.</p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 items-end mb-6">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search hooks..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
          <button type="submit" className="btn-premium rounded-xl px-5 py-3 text-sm font-semibold text-white">Search</button>
        </form>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => { setNiche(''); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!niche ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 hover:text-white/60 border border-transparent hover:bg-white/[0.03]'}`}>
            All
          </button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => { setNiche(n); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${niche === n ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 hover:text-white/60 border border-transparent hover:bg-white/[0.03]'}`}>
              {n}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-16"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>
        ) : hooks.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-16">No hooks found.</p>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {hooks.map((h, idx) => (
              <div key={h.id} className={`flex items-start justify-between gap-4 p-5 ${idx < hooks.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/70 mb-2">{h.content}</p>
                  <div className="flex flex-wrap gap-1.5">{h.niches.map((n) => <span key={n} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 capitalize">{n}</span>)}</div>
                </div>
                <button type="button" onClick={() => handleSave(h.id)} disabled={savedIds.has(h.id) || savingId === h.id}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition ${
                    savedIds.has(h.id)
                      ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300 cursor-default'
                      : 'btn-premium text-white disabled:opacity-50'
                  }`}>
                  {savedIds.has(h.id) ? '✓ Saved' : savingId === h.id ? '...' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition disabled:opacity-30">Previous</button>
            <span className="text-sm text-white/40">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition disabled:opacity-30">Next</button>
          </div>
        )}
      </main>
    </div>
  )
}
