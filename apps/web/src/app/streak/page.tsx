'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MilestoneAchievement { days: number; achievedAt: string }
interface StreakState { current: number; highest: number; milestones: MilestoneAchievement[]; lastActionDate: string | null }
interface FeedbackScores { hookStrength: number; pacing: number; captionQuality: number; hashtagRelevance: number; ctaEffectiveness: number }
interface FeedbackCommentary { hookStrength: string; pacing: string; captionQuality: string; hashtagRelevance: string; ctaEffectiveness: string }
interface ReelFeedback { scores: FeedbackScores; commentary: FeedbackCommentary }
interface Submission { id: string; url: string; feedback: ReelFeedback | null; submittedAt: string }
interface ViralityPrediction { score: number; reachRange: { min: number; max: number }; suggestions: string[] }

type Stage = 'scripts' | 'upload' | 'analysis' | 'feedback'

const MILESTONES = [
  { days: 7, icon: '🔥', label: '1 Week' },
  { days: 30, icon: '⭐', label: '1 Month' },
  { days: 60, icon: '💎', label: '2 Months' },
  { days: 100, icon: '🏆', label: '100 Days' },
]

const STAGES: { key: Stage; label: string; icon: string; desc: string }[] = [
  { key: 'scripts', label: 'Script & Shoot', icon: '📝', desc: 'Get your daily script and plan your shoot' },
  { key: 'upload', label: 'Submit Reel', icon: '📤', desc: 'Upload your reel for AI analysis' },
  { key: 'analysis', label: 'AI Analysis', icon: '🤖', desc: 'Get feedback + virality prediction' },
  { key: 'feedback', label: 'Dashboard', icon: '📊', desc: 'View all feedback and track progress' },
]

const SCORE_LABELS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'hookStrength', label: 'Hook Strength' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'captionQuality', label: 'Caption Quality' },
  { key: 'hashtagRelevance', label: 'Hashtag Relevance' },
  { key: 'ctaEffectiveness', label: 'CTA Effectiveness' },
]

export default function StreakPage() {
  const { getToken } = useAuth()
  const [streak, setStreak] = useState<StreakState | null>(null)
  const [stage, setStage] = useState<Stage>('scripts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload stage
  const [reelUrl, setReelUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null)

  // Analysis stage
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<ViralityPrediction | null>(null)

  // Feedback dashboard
  const [history, setHistory] = useState<Submission[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<StreakState>('/streak', getToken)
        setStreak(data)
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load streak') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken])

  // Load history when switching to feedback stage
  useEffect(() => {
    if (stage === 'feedback') {
      setHistoryLoading(true)
      apiFetch<Submission[]>('/reel/history', getToken)
        .then(setHistory)
        .catch(() => {})
        .finally(() => setHistoryLoading(false))
    }
  }, [stage, getToken])

  async function handleSubmitReel(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const result = await apiFetch<Submission>('/reel/submit', getToken, {
        method: 'POST', body: JSON.stringify({ url: reelUrl })
      })
      setCurrentSubmission(result)
      setReelUrl('')
      try {
        const updated = await apiFetch<StreakState>('/streak/action', getToken, { method: 'POST' })
        setStreak(updated)
      } catch {}
      setStage('analysis')
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed')
    } finally { setSubmitting(false) }
  }

  async function handlePredict() {
    if (!currentSubmission) return
    setPredicting(true)
    try {
      const result = await apiFetch<ViralityPrediction>(
        `/virality/predict/${currentSubmission.id}`, getToken, { method: 'POST' }
      )
      setPrediction(result)
    } catch {} finally { setPredicting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex items-center gap-3">
        <span className="spinner" />
        <span className="text-sm text-text-muted">Loading streak...</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div role="alert" className="card border-red-500/30 bg-red-500/10 p-6 text-center max-w-md">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    </div>
  )

  const achieved = new Set(streak?.milestones.map(m => m.days) ?? [])

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Streak header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
            <h1 className="text-display-md uppercase font-bold text-white">Streak Workflow</h1>
            <p className="text-body-sm text-text-muted mt-1">Your daily reel creation pipeline</p>
          </div>
          <div className="flex gap-3">
            <div className="spec-cell text-center min-w-[80px] relative overflow-hidden">
              {(streak?.current ?? 0) > 0 && <div className="absolute inset-0 streak-pulse" />}
              <p className="spec-value text-accent relative z-10">{streak?.current ?? 0}</p>
              <p className="spec-label relative z-10">Current</p>
            </div>
            <div className="spec-cell text-center min-w-[80px]">
              <p className="spec-value">{streak?.highest ?? 0}</p>
              <p className="spec-label">Best</p>
            </div>
          </div>
        </div>

        {/* Milestones row */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {MILESTONES.map(m => {
            const unlocked = achieved.has(m.days)
            return (
              <div key={m.days} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border transition-colors ${
                unlocked ? 'border-accent bg-accent/10 text-white' : 'border-hairline bg-surface-soft text-text-muted opacity-40'
              }`}>
                <span className="text-lg">{m.icon}</span>
                <div>
                  <p className="text-xs font-bold">{m.label}</p>
                  <p className="text-[10px] text-text-muted">{m.days}d</p>
                </div>
                {unlocked && <span className="text-emerald-400 text-xs ml-1">{"\u2713"}</span>}
              </div>
            )
          })}
        </div>

        {/* Stage indicator */}
        <div className="card-elevated p-4 mb-8">
          <div className="flex items-center gap-1 sm:gap-2">
            {STAGES.map((s, i) => (
              <button key={s.key} onClick={() => setStage(s.key)}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 transition-colors border ${
                  stage === s.key
                    ? 'bg-surface-card border-white text-white'
                    : 'border-transparent text-text-muted hover:text-white'
                }`}>
                <span className="text-lg sm:text-xl">{s.icon}</span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[1px]">{s.label}</span>
                {i < STAGES.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-text-muted text-xs hidden sm:block">{"\u2192"}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stage 1: Script & Shoot */}
        {stage === 'scripts' && (
          <div className="space-y-6">
            <div className="card-elevated">
              <h2 className="text-title-lg uppercase font-bold text-white mb-2">{"\u{1F4DD}"} Today&apos;s Game Plan</h2>
              <p className="text-body-sm text-text-muted mb-5">Get your daily script, plan your shoot, then head to the upload stage.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/scripts" className="card group hover:border-white transition-colors">
                  <span className="text-2xl mb-2 block">{"\u{1F4DD}"}</span>
                  <p className="text-sm font-bold text-white uppercase">Generate Scripts</p>
                  <p className="text-xs text-text-muted mt-1">Get AI-powered reel scripts for today</p>
                </Link>
                <Link href="/hooks" className="card group hover:border-white transition-colors">
                  <span className="text-2xl mb-2 block">{"\u{1FA9D}"}</span>
                  <p className="text-sm font-bold text-white uppercase">Browse Hooks</p>
                  <p className="text-xs text-text-muted mt-1">Find the perfect opening line</p>
                </Link>
              </div>
              <div className="mt-5 bg-surface-soft border border-hairline p-4">
                <h3 className="spec-label mb-3">Shoot Checklist</h3>
                <div className="space-y-2">
                  {['Pick your script & hook', 'Set up lighting (natural or ring light)', 'Frame your shot (vertical 9:16)', 'Record 2-3 takes', 'Edit with trending audio'].map((item, i) => (
                    <label key={i} className="flex items-center gap-3 text-sm text-text-body cursor-pointer hover:text-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-accent" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => setStage('upload')} className="btn-primary w-full mt-5">
                READY TO UPLOAD {"\u2192"}
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: Submit Reel */}
        {stage === 'upload' && (
          <div className="space-y-6">
            <div className="card-elevated">
              <h2 className="text-title-lg uppercase font-bold text-white mb-2">{"\u{1F4E4}"} Submit Your Reel</h2>
              <p className="text-body-sm text-text-muted mb-5">Paste your Instagram or TikTok reel URL for AI analysis. This also counts toward your streak.</p>
              <form onSubmit={handleSubmitReel}>
                <label htmlFor="reel-url" className="label">Reel URL</label>
                <div className="flex gap-3">
                  <input id="reel-url" type="url" value={reelUrl} onChange={e => setReelUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..." required
                    className="input flex-1" />
                  <button type="submit" disabled={submitting}
                    className="btn-primary shrink-0">
                    {submitting ? 'ANALYZING...' : 'SUBMIT'}
                  </button>
                </div>
                {submitError && <p role="alert" className="mt-3 text-sm text-red-300">{submitError}</p>}
              </form>
            </div>
          </div>
        )}

        {/* Stage 3: AI Analysis */}
        {stage === 'analysis' && (
          <div className="space-y-6">
            {!currentSubmission ? (
              <div className="card-elevated p-8 text-center">
                <span className="text-4xl mb-3 block">{"\u{1F4E4}"}</span>
                <p className="text-body-sm text-text-muted mb-4">No reel submitted yet. Submit a reel first to get AI analysis.</p>
                <button onClick={() => setStage('upload')} className="btn-primary">
                  GO TO UPLOAD
                </button>
              </div>
            ) : (
              <>
                {/* Feedback scores */}
                {currentSubmission.feedback && (
                  <div className="card-elevated">
                    <h2 className="text-title-lg uppercase font-bold text-white mb-1">{"\u{1F916}"} AI Feedback</h2>
                    <p className="text-xs text-text-muted mb-5 truncate">{currentSubmission.url}</p>
                    <div className="space-y-4">
                      {SCORE_LABELS.map(({ key, label }) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-text-body">{label}</span>
                            <span className="text-sm font-bold text-white">{currentSubmission.feedback!.scores[key]}<span className="text-text-muted">/100</span></span>
                          </div>
                          <div className="w-full bg-hairline h-1 overflow-hidden">
                            <div className="bg-accent h-1 transition-all duration-700" style={{ width: `${currentSubmission.feedback!.scores[key]}%` }} />
                          </div>
                          <p className="text-xs text-text-muted mt-1">{currentSubmission.feedback!.commentary[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Virality prediction */}
                <div className="card-elevated">
                  <h2 className="text-title-lg uppercase font-bold text-white mb-4">{"\u{1F680}"} Virality Prediction</h2>
                  {!prediction ? (
                    <div className="text-center py-4">
                      <p className="text-body-sm text-text-muted mb-4">Get an AI prediction of how your reel will perform.</p>
                      <button onClick={handlePredict} disabled={predicting}
                        className="btn-primary">
                        {predicting ? 'PREDICTING...' : 'PREDICT VIRALITY'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-display-sm font-bold ${prediction.score >= 70 ? 'text-emerald-400' : prediction.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{prediction.score}</p>
                          <p className="spec-label">Score</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Expected Reach</p>
                          <p className="text-lg font-bold text-white">
                            {prediction.reachRange.min.toLocaleString()} {"\u2013"} {prediction.reachRange.max.toLocaleString()}
                          </p>
                          <p className="text-xs text-text-muted mt-1">estimated views</p>
                        </div>
                      </div>
                      {prediction.suggestions.length > 0 && (
                        <div>
                          <h3 className="spec-label mb-2">Improvement Tips</h3>
                          <div className="space-y-2">
                            {prediction.suggestions.map((s, i) => (
                              <div key={i} className="flex items-start gap-2 bg-surface-soft border border-hairline px-3 py-2">
                                <span className="text-accent text-xs mt-0.5">{"\u{1F4A1}"}</span>
                                <p className="text-xs text-text-body">{s}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={() => setStage('feedback')} className="btn-primary w-full">
                  VIEW FULL DASHBOARD {"\u2192"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Stage 4: Feedback Dashboard */}
        {stage === 'feedback' && (
          <div className="space-y-6">
            {/* Stats overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="spec-cell text-center">
                <p className="spec-value text-accent">{streak?.current ?? 0}</p>
                <p className="spec-label">Streak</p>
              </div>
              <div className="spec-cell text-center">
                <p className="spec-value">{history.length}</p>
                <p className="spec-label">Reels</p>
              </div>
              <div className="spec-cell text-center">
                <p className="spec-value text-emerald-400">
                  {history.length > 0 && history.some(h => h.feedback)
                    ? Math.round(history.filter(h => h.feedback).reduce((sum, h) => {
                        const scores = h.feedback!.scores
                        return sum + (scores.hookStrength + scores.pacing + scores.captionQuality + scores.hashtagRelevance + scores.ctaEffectiveness) / 5
                      }, 0) / history.filter(h => h.feedback).length)
                    : '\u2014'}
                </p>
                <p className="spec-label">Avg Score</p>
              </div>
              <div className="spec-cell text-center">
                <p className="spec-value text-amber-400">{achieved.size}/{MILESTONES.length}</p>
                <p className="spec-label">Milestones</p>
              </div>
            </div>

            {/* Recent submissions */}
            <div className="card-elevated">
              <h2 className="text-title-lg uppercase font-bold text-white mb-4">Recent Submissions</h2>
              {historyLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <span className="spinner" />
                  <span className="text-sm text-text-muted">Loading...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl mb-3 block">{"\u{1F3AC}"}</span>
                  <p className="text-body-sm text-text-muted mb-4">No reels submitted yet. Start your streak today.</p>
                  <button onClick={() => setStage('upload')} className="btn-primary">
                    SUBMIT FIRST REEL
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 10).map(sub => {
                    const avgScore = sub.feedback
                      ? Math.round((sub.feedback.scores.hookStrength + sub.feedback.scores.pacing + sub.feedback.scores.captionQuality + sub.feedback.scores.hashtagRelevance + sub.feedback.scores.ctaEffectiveness) / 5)
                      : null
                    return (
                      <div key={sub.id} className="card flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text-body truncate">{sub.url}</p>
                          <p className="text-xs text-text-muted mt-0.5">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                        </div>
                        {avgScore !== null && (
                          <div className={`shrink-0 flex items-center justify-center w-10 h-10 border text-sm font-bold ${
                            avgScore >= 70 ? 'border-emerald-500 text-emerald-400'
                              : avgScore >= 40 ? 'border-amber-500 text-amber-400'
                              : 'border-red-500 text-red-400'
                          }`}>
                            {avgScore}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
