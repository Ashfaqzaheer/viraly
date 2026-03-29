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
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-indigo-600 top-[-100px] left-[-80px] animate-float" />
      <div className="orb w-[300px] h-[300px] bg-blue-500 bottom-[-50px] right-[-60px] animate-float-delayed" />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Hook Library</h1>
        <p className="text-sm text-white/40 mb-6">Browse proven viral hooks for your reels.</p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-5">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search hooks..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 backdrop-blur-sm transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
          <button type="submit" className="btn-premium rounded-xl px-6 py-3 text-sm font-semibold text-white">Search</button>
        </form>

        <div className="flex flex-wrap gap-2 mb-8">
          <button type="button" onClick={() => { setNiche(''); setPage(1) }} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${!niche ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white'}`}>All</button>
          {NICHES.map((n) => (
            <button key={n} type="button" onClick={() => { setNiche(n); setPage(1) }} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${niche === n ? 'btn-premium text-white' : 'glass text-white/50 hover:text-white'}`}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 justify-center py-12"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /><span className="text-sm text-white/40">Loading...</span></div>
        ) : hooks.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center"><p className="text-sm text-white/40">No hooks found.</p></div>
        ) : (
          <div className="space-y-3">
            {hooks.map((h) => (
              <div key={h.id} className="glass rounded-xl p-4 flex items-start justify-between gap-3 transition-all hover:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 mb-2">{h.content}</p>
                  <div className="flex flex-wrap gap-1.5">{h.niches.map((n) => <span key={n} className="inline-block rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-white/40">{n}</span>)}</div>
                </div>
                <button type="button" onClick={() => handleSave(h.id)} disabled={savedIds.has(h.id) || savingId === h.id}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${savedIds.has(h.id) ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default' : 'btn-premium text-white disabled:opacity-50'}`}>
                  {savedIds.has(h.id) ? 'Saved ✓' : savingId === h.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="glass rounded-lg px-4 py-2 text-xs font-medium text-white/50 hover:text-white disabled:opacity-30 transition">Previous</button>
            <span className="text-xs text-white/30">Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="glass rounded-lg px-4 py-2 text-xs font-medium text-white/50 hover:text-white disabled:opacity-30 transition">Next</button>
          </div>
        )}
      </main>
    </div>
  )
}
