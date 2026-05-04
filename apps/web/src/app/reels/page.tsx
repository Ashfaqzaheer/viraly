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
  { key: 'hookStrength', label: 'HOOK STRENGTH' },
  { key: 'pacing', label: 'PACING' },
  { key: 'captionQuality', label: 'CAPTION QUALITY' },
  { key: 'hashtagRelevance', label: 'HASHTAG RELEVANCE' },
  { key: 'ctaEffectiveness', label: 'CTA EFFECTIVENESS' },
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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '800px' }}>
        <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
        <p className="section-label mb-2">AI FEEDBACK</p>
        <h3 className="mb-2">Reel feedback</h3>
        <p className="text-sm text-muted mb-8" style={{ fontWeight: 300 }}>{remaining} of {MAX_DAILY} submissions remaining today</p>

        {/* Submit form */}
        <div style={{ background: '#0d0d0d', borderTop: '1px solid #262626', borderBottom: '1px solid #262626', padding: '32px 0' }} className="mb-10">
          <label htmlFor="reel-url" className="field-label">REEL URL (INSTAGRAM OR TIKTOK)</label>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <input id="reel-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required className="input flex-1" />
            <button type="submit" disabled={submitting || remaining === 0} className="btn-primary shrink-0">
              {submitting ? 'ANALYZING...' : 'ANALYZE'}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        {/* Feedback detail */}
        {selected?.feedback && (
          <div className="mb-10">
            <p className="caption-upper mb-2">FEEDBACK</p>
            <p className="text-xs text-muted mb-6 truncate" style={{ fontWeight: 300 }}>{selected.url}</p>
            {SCORE_LABELS.map(({ key, label }) => (
              <div key={key} style={{ borderBottom: '1px solid #262626', padding: '16px 0' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-upper">{label}</span>
                  <span className="text-sm text-white" style={{ fontWeight: 400 }}>{selected.feedback!.scores[key]}/100</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${selected.feedback!.scores[key]}%` }} /></div>
                <p className="text-xs text-muted mt-2" style={{ fontWeight: 300 }}>{selected.feedback!.commentary[key]}</p>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <p className="caption-upper mb-4">SUBMISSION HISTORY</p>
        {loading ? <div className="flex justify-center py-8"><span className="spinner" /></div> : history.length === 0 ? (
          <p className="text-sm text-muted text-center py-8" style={{ fontWeight: 300 }}>No submissions yet. Submit your first reel above.</p>
        ) : (
          <div>
            {history.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelected(s)}
                className="w-full text-left flex items-center justify-between transition-colors hover:bg-surface-card" style={{
                  borderBottom: '1px solid #262626', padding: '16px 0',
                  background: selected?.id === s.id ? '#141414' : 'transparent'
                }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ fontWeight: 300, color: selected?.id === s.id ? '#ffffff' : '#999999' }}>{s.url}</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(s.submittedAt).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
