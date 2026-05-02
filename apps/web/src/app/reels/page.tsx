'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

interface FeedbackScores { hookStrength: number; pacing: number; captionQuality: number; hashtagRelevance: number; ctaEffectiveness: number }
interface FeedbackCommentary { hookStrength: string; pacing: string; captionQuality: string; hashtagRelevance: string; ctaEffectiveness: string }
interface ReelFeedback { scores: FeedbackScores; commentary: FeedbackCommentary }
interface Submission { id: string; url: string; feedback: ReelFeedback | null; submittedAt: string }

const SCORE_LABELS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'hookStrength', label: 'Hook Strength' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'captionQuality', label: 'Caption Quality' },
  { key: 'hashtagRelevance', label: 'Hashtag Relevance' },
  { key: 'ctaEffectiveness', label: 'CTA Effectiveness' },
]
const MAX_DAILY = 10

export default function ReelsPage() {
  const { getToken } = useAuth()
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Submission | null>(null)

  useEffect(() => {
    async function load() {
      try { const data = await apiFetch<Submission[]>('/reel/history', getToken); setHistory(data) } catch {} finally { setLoading(false) }
    }
    load()
  }, [getToken])

  const now = Date.now()
  const recentCount = history.filter((s) => now - new Date(s.submittedAt).getTime() < 86400000).length
  const remaining = Math.max(0, MAX_DAILY - recentCount)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setSubmitting(true)
    try {
      const result = await apiFetch<Submission>('/reel/submit', getToken, { method: 'POST', body: JSON.stringify({ url }) })
      setHistory((prev) => [result, ...prev]); setSelected(result); setUrl('')
      window.dispatchEvent(new Event('streak-updated'))
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Submission failed.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
        <h1 className="text-display-md uppercase font-bold text-white mb-1">Reel Feedback</h1>
        <p className="text-body-sm text-text-muted mb-8">{remaining} of {MAX_DAILY} submissions remaining today</p>

        {/* Submit form */}
        <div className="card-soft mb-8">
          <label htmlFor="reel-url" className="label">Reel URL (Instagram or TikTok)</label>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input id="reel-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required
              className="input flex-1" />
            <button type="submit" disabled={submitting || remaining === 0} className="btn-primary shrink-0">
              {submitting ? 'ANALYZING...' : 'ANALYZE'}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        </div>

        {/* Feedback detail */}
        {selected?.feedback && (
          <div className="card mb-8">
            <h2 className="text-title-lg uppercase font-bold text-white mb-1">Feedback</h2>
            <p className="text-xs text-text-muted mb-5 truncate">{selected.url}</p>
            <div className="space-y-5">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-text-body">{label}</span>
                    <span className="text-sm font-bold text-white">{selected.feedback!.scores[key]}<span className="text-text-muted">/100</span></span>
                  </div>
                  <div className="w-full bg-hairline h-1 overflow-hidden">
                    <div className="bg-accent h-1 transition-all duration-700" style={{ width: `${selected.feedback!.scores[key]}%` }} />
                  </div>
                  <p className="text-xs text-text-muted mt-1.5">{selected.feedback!.commentary[key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <h2 className="text-title-lg uppercase font-bold text-white mb-3">Submission History</h2>
        {loading ? <p className="text-sm text-text-muted">Loading...</p> : history.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm text-text-muted">No submissions yet. Submit your first reel above.</p></div>
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelected(s)}
                className={`w-full text-left p-4 transition-colors border ${selected?.id === s.id ? 'bg-surface-card border-white' : 'bg-surface-card border-hairline hover:border-white'}`}>
                <p className="text-sm text-text-body truncate">{s.url}</p>
                <p className="text-xs text-text-muted mt-1">{new Date(s.submittedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
