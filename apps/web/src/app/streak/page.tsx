'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

interface MilestoneAchievement { days: number; achievedAt: string }
interface StreakState { current: number; highest: number; milestones: MilestoneAchievement[]; lastActionDate: string | null }
interface FeedbackScores { hookStrength: number; pacing: number; captionQuality: number; hashtagRelevance: number; ctaEffectiveness: number }
interface FeedbackCommentary { hookStrength: string; pacing: string; captionQuality: string; hashtagRelevance: string; ctaEffectiveness: string }
interface ReelFeedback { scores: FeedbackScores; commentary: FeedbackCommentary }
interface Submission { id: string; url: string; feedback: ReelFeedback | null; submittedAt: string }
interface ViralityPrediction { score: number; reachRange: { min: number; max: number }; suggestions: string[] }

type Stage = 'scripts' | 'upload' | 'analysis' | 'feedback'

const MILESTONES = [
  { days: 7, label: '1 WEEK' },
  { days: 30, label: '1 MONTH' },
  { days: 60, label: '2 MONTHS' },
  { days: 100, label: '100 DAYS' },
]

const STAGES: { key: Stage; label: string; desc: string }[] = [
  { key: 'scripts', label: 'Script & Shoot', desc: 'Get your daily script' },
  { key: 'upload', label: 'Submit Reel', desc: 'Upload for AI analysis' },
  { key: 'analysis', label: 'AI Analysis', desc: 'Get feedback + prediction' },
  { key: 'feedback', label: 'Dashboard', desc: 'View all feedback' },
]

const SCORE_LABELS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'hookStrength', label: 'HOOK STRENGTH' },
  { key: 'pacing', label: 'PACING' },
  { key: 'captionQuality', label: 'CAPTION QUALITY' },
  { key: 'hashtagRelevance', label: 'HASHTAG RELEVANCE' },
  { key: 'ctaEffectiveness', label: 'CTA EFFECTIVENESS' },
]

export default function StreakPage() {
  const { getToken } = useAuth()
  const [streak, setStreak] = useState<StreakState | null>(null)
  const [stage, setStage] = useState<Stage>('scripts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reelUrl, setReelUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<ViralityPrediction | null>(null)
  const [history, setHistory] = useState<Submission[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try { setStreak(await apiFetch<StreakState>('/streak', getToken)) }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load streak') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken])

  useEffect(() => {
    if (stage === 'feedback') {
      setHistoryLoading(true)
      apiFetch<Submission[]>('/reel/history', getToken).then(setHistory).catch(() => {}).finally(() => setHistoryLoading(false))
    }
  }, [stage, getToken])

  async function handleSubmitReel(e: FormEvent) {
    e.preventDefault(); setSubmitError(null); setSubmitting(true)
    try {
      const result = await apiFetch<Submission>('/reel/submit', getToken, { method: 'POST', body: JSON.stringify({ url: reelUrl }) })
      setCurrentSubmission(result); setReelUrl('')
      try { setStreak(await apiFetch<StreakState>('/streak/action', getToken, { method: 'POST' })) } catch {}
      setStage('analysis')
    } catch (err) { setSubmitError(err instanceof ApiError ? err.message : 'Submission failed') }
    finally { setSubmitting(false) }
  }

  async function handlePredict() {
    if (!currentSubmission) return; setPredicting(true)
    try { setPrediction(await apiFetch<ViralityPrediction>(`/virality/predict/${currentSubmission.id}`, getToken, { method: 'POST' })) }
    catch {} finally { setPredicting(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}><span className="spinner" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}><div className="border border-red-500/30 p-6 text-center max-w-md"><p className="text-sm text-red-400">{error}</p></div></div>

  const achieved = new Set(streak?.milestones.map(m => m.days) ?? [])

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
        <p className="section-label mb-2">CONSISTENCY ENGINE</p>
        <h3 className="mb-2">Streak workflow</h3>

        {/* Streak stats */}
        <div className="flex items-center gap-8 mt-6 mb-10" style={{ borderBottom: '1px solid #262626', paddingBottom: '32px' }}>
          <div className="spec-cell">
            <p className="spec-value text-accent">{streak?.current ?? 0}</p>
            <p className="spec-label">CURRENT</p>
          </div>
          <div className="spec-cell">
            <p className="spec-value">{streak?.highest ?? 0}</p>
            <p className="spec-label">BEST</p>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex gap-px mb-10" style={{ background: '#262626' }}>
          {MILESTONES.map(m => {
            const unlocked = achieved.has(m.days)
            return (
              <div key={m.days} className="flex-1 text-center" style={{ background: '#000000', padding: '16px 8px', opacity: unlocked ? 1 : 0.3 }}>
                <p className="text-sm" style={{ fontWeight: 400, color: unlocked ? '#8b5cf6' : '#666666' }}>{m.days}</p>
                <p className="caption-upper mt-1">{m.label}</p>
                {unlocked && <p className="text-xs text-emerald-400 mt-1">{"\u2713"}</p>}
              </div>
            )
          })}
        </div>

        {/* Stage tabs */}
        <div className="flex gap-px mb-10" style={{ background: '#262626' }}>
          {STAGES.map((s) => (
            <button key={s.key} onClick={() => setStage(s.key)}
              className="flex-1 text-center transition-colors" style={{
                background: stage === s.key ? '#141414' : '#000000',
                padding: '16px 8px',
                borderBottom: stage === s.key ? '1px solid #ffffff' : '1px solid transparent'
              }}>
              <span className="nav-item" style={{ color: stage === s.key ? '#ffffff' : '#666666' }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Stage: Scripts */}
        {stage === 'scripts' && (
          <div className="text-center py-12">
            <h5 className="mb-3">Get your daily script</h5>
            <p className="text-sm text-muted mb-6" style={{ fontWeight: 300 }}>Head to the script generator to create today's content.</p>
            <Link href="/scripts" className="btn-primary">GENERATE SCRIPT</Link>
          </div>
        )}

        {/* Stage: Upload */}
        {stage === 'upload' && (
          <div>
            <p className="caption-upper mb-4">SUBMIT YOUR REEL</p>
            <form onSubmit={handleSubmitReel} className="flex gap-4 items-end">
              <input type="url" value={reelUrl} onChange={(e) => setReelUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required className="input flex-1" />
              <button type="submit" disabled={submitting} className="btn-primary shrink-0">
                {submitting ? 'SUBMITTING...' : 'SUBMIT'}
              </button>
            </form>
            {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}
          </div>
        )}

        {/* Stage: Analysis */}
        {stage === 'analysis' && (
          <div>
            {currentSubmission ? (
              <div>
                <p className="caption-upper mb-2">SUBMITTED</p>
                <p className="text-sm text-white mb-4 truncate" style={{ fontWeight: 300 }}>{currentSubmission.url}</p>

                {currentSubmission.feedback && (
                  <div className="mb-6">
                    <p className="caption-upper mb-4">FEEDBACK SCORES</p>
                    {SCORE_LABELS.map(({ key, label }) => (
                      <div key={key} style={{ borderBottom: '1px solid #262626', padding: '12px 0' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="caption-upper">{label}</span>
                          <span className="text-sm text-white" style={{ fontWeight: 400 }}>{currentSubmission.feedback!.scores[key]}/100</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${currentSubmission.feedback!.scores[key]}%` }} />
                        </div>
                        <p className="text-xs text-muted mt-1" style={{ fontWeight: 300 }}>{currentSubmission.feedback!.commentary[key]}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!prediction && (
                  <button onClick={handlePredict} disabled={predicting} className="btn-accent">
                    {predicting ? 'PREDICTING...' : 'GET VIRALITY PREDICTION'}
                  </button>
                )}

                {prediction && (
                  <div className="mt-6" style={{ borderTop: '1px solid #262626', paddingTop: '24px' }}>
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <p className="spec-value" style={{ fontSize: '36px' }}>{prediction.score}</p>
                        <p className="spec-label">SCORE</p>
                      </div>
                      <div>
                        <p className="text-sm text-white" style={{ fontWeight: 400 }}>{prediction.reachRange.min.toLocaleString()} – {prediction.reachRange.max.toLocaleString()}</p>
                        <p className="spec-label">REACH</p>
                      </div>
                    </div>
                    {prediction.suggestions.length > 0 && (
                      <div>
                        <p className="caption-upper mb-2">SUGGESTIONS</p>
                        {prediction.suggestions.map((s, i) => <p key={i} className="text-sm text-body" style={{ fontWeight: 300, borderBottom: '1px solid #262626', padding: '8px 0' }}>{s}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted" style={{ fontWeight: 300 }}>Submit a reel first to get analysis.</p>
                <button onClick={() => setStage('upload')} className="btn-ghost mt-4">GO TO UPLOAD</button>
              </div>
            )}
          </div>
        )}

        {/* Stage: Feedback history */}
        {stage === 'feedback' && (
          <div>
            <p className="caption-upper mb-4">SUBMISSION HISTORY</p>
            {historyLoading ? (
              <div className="flex items-center gap-3 justify-center py-8"><span className="spinner" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted text-center py-8" style={{ fontWeight: 300 }}>No submissions yet.</p>
            ) : (
              <div>
                {history.map((s) => (
                  <div key={s.id} style={{ borderBottom: '1px solid #262626', padding: '16px 0' }}>
                    <p className="text-sm text-white truncate" style={{ fontWeight: 300 }}>{s.url}</p>
                    <p className="text-xs text-muted mt-1">{new Date(s.submittedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
