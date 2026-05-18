'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

interface FeedbackScores { hookStrength: number; pacing: number; captionQuality: number; hashtagRelevance: number; ctaEffectiveness: number }
interface FeedbackCommentary { hookStrength: string; pacing: string; captionQuality: string; hashtagRelevance: string; ctaEffectiveness: string }
interface ReelFeedback { scores: FeedbackScores; commentary: FeedbackCommentary }
interface Submission { id: string; url: string; feedback: ReelFeedback | null; submittedAt: string }
interface CountResponse { count: number; limit: number }

const SCORE_LABELS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'hookStrength', label: 'Hook strength' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'captionQuality', label: 'Caption quality' },
  { key: 'hashtagRelevance', label: 'Hashtag relevance' },
  { key: 'ctaEffectiveness', label: 'CTA effectiveness' },
]

const SUBMISSION_LIMIT = 10

export default function ReelsPage() {
  const { getToken } = useAuth()
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [count, setCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const limitReached = count >= SUBMISSION_LIMIT

  async function fetchCount() {
    try {
      const data = await apiFetch<CountResponse>('/reel/count', getToken)
      setCount(data.count)
    } catch {}
  }

  async function fetchHistory() {
    try {
      const data = await apiFetch<Submission[]>('/reel/history', getToken)
      setHistory(data)
    } catch {}
  }

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([fetchHistory(), fetchCount()])
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await apiFetch<Submission>('/reel/submit', getToken, { method: 'POST', body: JSON.stringify({ url }) })
      setHistory((prev) => [result, ...prev])
      setSelected(result)
      setUrl('')
      await fetchCount()
      window.dispatchEvent(new Event('streak-updated'))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Submission failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    setError(null)
    try {
      await apiFetch<{ success: boolean }>(`/reel/${id}`, getToken, { method: 'DELETE' })
      setHistory((prev) => prev.filter((s) => s.id !== id))
      if (selected?.id === id) setSelected(null)
      await fetchCount()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Reel feedback</h1>
        <p className="text-sm text-white/40 mb-8">Reel feedback submissions: {count} / {SUBMISSION_LIMIT}</p>

        {/* Limit reached warning */}
        {limitReached && (
          <div className="glass rounded-xl p-4 mb-6 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-300">You&apos;ve reached the 10 reel feedback limit. Delete an old submission to add a new one.</p>
          </div>
        )}

        {/* Submit form */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <label htmlFor="reel-url" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Reel URL (Instagram or TikTok)</label>
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <input id="reel-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
            <button type="submit" disabled={submitting || limitReached} className="btn-premium rounded-xl px-5 py-3 text-sm font-semibold text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        {/* Feedback detail */}
        {selected?.feedback && (
          <div className="glass rounded-2xl p-6 mb-8 animate-slide-up">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Feedback</p>
            <p className="text-xs text-white/30 mb-5 truncate">{selected.url}</p>
            {SCORE_LABELS.map(({ key, label }) => (
              <div key={key} className="py-3 border-b border-white/[0.06] last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/50">{label}</span>
                  <span className="text-sm font-medium text-white">{selected.feedback!.scores[key]}/100</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: `${selected.feedback!.scores[key]}%` }} />
                </div>
                <p className="text-xs text-white/30 mt-1.5">{selected.feedback!.commentary[key]}</p>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Submission history</p>
          {loading ? <div className="flex justify-center py-8"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div> : history.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No submissions yet. Submit your first reel above.</p>
          ) : (
            <div>
              {history.map((s) => (
                <div key={s.id} className={`flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0 transition rounded-lg px-2 -mx-2 ${
                  selected?.id === s.id ? 'bg-violet-500/5' : 'hover:bg-white/[0.02]'
                }`}>
                  <button type="button" onClick={() => setSelected(s)} className="min-w-0 flex-1 text-left">
                    <p className={`text-sm truncate ${selected?.id === s.id ? 'text-white' : 'text-white/60'}`}>{s.url}</p>
                    <p className="text-xs text-white/30 mt-0.5">{new Date(s.submittedAt).toLocaleString()}</p>
                  </button>

                  {/* Delete button */}
                  {confirmDelete === s.id ? (
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                        aria-label="Confirm delete"
                      >
                        {deleting === s.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-white/40 hover:text-white/60"
                        aria-label="Cancel delete"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(s.id)}
                      className="ml-3 shrink-0 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                      aria-label="Delete this submission"
                      title="Delete this submission? This action cannot be undone."
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
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
