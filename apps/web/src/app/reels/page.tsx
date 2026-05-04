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
  { key: 'hookStrength', label: 'Hook strength' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'captionQuality', label: 'Caption quality' },
  { key: 'hashtagRelevance', label: 'Hashtag relevance' },
  { key: 'ctaEffectiveness', label: 'CTA effectiveness' },
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
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Reel feedback</h1>
        <p className="text-sm text-white/40 mb-8">{remaining} of {MAX_DAILY} submissions remaining today</p>

        {/* Submit form */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <label htmlFor="reel-url" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Reel URL (Instagram or TikTok)</label>
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <input id="reel-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
            <button type="submit" disabled={submitting || remaining === 0} className="btn-premium rounded-xl px-5 py-3 text-sm font-semibold text-white shrink-0 disabled:opacity-50">
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
                <button key={s.id} type="button" onClick={() => setSelected(s)}
                  className={`w-full text-left flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0 transition rounded-lg px-2 -mx-2 ${
                    selected?.id === s.id ? 'bg-violet-500/5' : 'hover:bg-white/[0.02]'
                  }`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${selected?.id === s.id ? 'text-white' : 'text-white/60'}`}>{s.url}</p>
                    <p className="text-xs text-white/30 mt-0.5">{new Date(s.submittedAt).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
