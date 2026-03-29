'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

interface FeedbackScores { hookStrength: number; pacing: number; captionQuality: number; hashtagRelevance: number; ctaEffectiveness: number }
interface FeedbackCommentary { hookStrength: string; pacing: string; captionQuality: string; hashtagRelevance: string; ctaEffectiveness: string }
interface ReelFeedback { scores: FeedbackScores; commentary: FeedbackCommentary }
interface Submission { id: string; url: string; feedback: ReelFeedback | null; submittedAt: string }

const SCORE_LABELS: { key: keyof FeedbackScores; label: string; color: string }[] = [
  { key: 'hookStrength', label: 'Hook Strength', color: 'from-violet-500 to-purple-500' },
  { key: 'pacing', label: 'Pacing', color: 'from-blue-500 to-cyan-500' },
  { key: 'captionQuality', label: 'Caption Quality', color: 'from-emerald-500 to-teal-500' },
  { key: 'hashtagRelevance', label: 'Hashtag Relevance', color: 'from-amber-500 to-orange-500' },
  { key: 'ctaEffectiveness', label: 'CTA Effectiveness', color: 'from-pink-500 to-rose-500' },
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
      // Notify Header to refresh streak counter
      window.dispatchEvent(new Event('streak-updated'))
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Submission failed.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-pink-600 top-[-100px] right-[-80px] animate-float" />
      <div className="orb w-[300px] h-[300px] bg-rose-500 bottom-[-50px] left-[-60px] animate-float-delayed" />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Reel Feedback</h1>
        <p className="text-sm text-white/40 mb-8">{remaining} of {MAX_DAILY} submissions remaining today</p>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 mb-8">
          <label htmlFor="reel-url" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Reel URL (Instagram or TikTok)</label>
          <div className="flex gap-3">
            <input id="reel-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 backdrop-blur-sm transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
            <button type="submit" disabled={submitting || remaining === 0} className="btn-premium rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        </form>

        {/* Feedback detail */}
        {selected?.feedback && (
          <div className="glass rounded-2xl p-6 mb-8 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-1">Feedback</h2>
            <p className="text-xs text-white/30 mb-5 truncate">{selected.url}</p>
            <div className="space-y-5">
              {SCORE_LABELS.map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white/70">{label}</span>
                    <span className="text-sm font-bold text-white">{selected.feedback!.scores[key]}<span className="text-white/30">/100</span></span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${selected.feedback!.scores[key]}%` }} />
                  </div>
                  <p className="text-xs text-white/40 mt-1.5">{selected.feedback!.commentary[key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <h2 className="text-lg font-semibold text-white mb-3">Submission History</h2>
        {loading ? <p className="text-sm text-white/40">Loading...</p> : history.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center"><p className="text-sm text-white/40">No submissions yet. Submit your first reel above.</p></div>
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelected(s)}
                className={`w-full text-left rounded-xl p-4 transition-all ${selected?.id === s.id ? 'glass-strong border border-violet-500/30' : 'glass hover:border-white/10'}`}>
                <p className="text-sm text-white/80 truncate">{s.url}</p>
                <p className="text-xs text-white/30 mt-1">{new Date(s.submittedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
