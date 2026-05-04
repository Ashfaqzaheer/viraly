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
  { days: 7, label: '1 week' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 100, label: '100 days' },
]

const STAGES: { key: Stage; label: string; desc: string }[] = [
  { key: 'scripts', label: 'Script & Shoot', desc: 'Get your daily script' },
  { key: 'upload', label: 'Submit Reel', desc: 'Upload for AI analysis' },
  { key: 'analysis', label: 'AI Analysis', desc: 'Get feedback + prediction' },
  { key: 'feedback', label: 'Dashboard', desc: 'View all feedback' },
]

const SCORE_LABELS: { key: keyof FeedbackScores; label: string }[] = [
  { key: 'hookStrength', label: 'Hook strength' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'captionQuality', label: 'Caption quality' },
  { key: 'hashtagRelevance', label: 'Hashtag relevance' },
  { key: 'ctaEffectiveness', label: 'CTA effectiveness' },
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4"><div className="glass rounded-2xl border-red-500/20 bg-red-500/5 p-6 text-center max-w-md"><p className="text-sm text-red-300">{error}</p></div></div>

  const achieved = new Set(streak?.milestones.map(m => m.days) ?? [])

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Streak workflow</h1>
        <p className="text-sm text-white/40 mb-6">Stay consistent, track progress, get feedback.</p>

        {/* Streak stats */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-4xl font-bold text-violet-400">{streak?.current ?? 0}</p>
              <p className="text-xs text-white/40 mt-1">Current streak</p>
            </div>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div>
              <p className="text-2xl font-semibold text-white">{streak?.highest ?? 0}</p>
              <p className="text-xs text-white/40 mt-1">All-time best</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {MILESTONES.map(m => {
            const unlocked = achieved.has(m.days)
            return (
              <div key={m.days} className={`glass rounded-xl p-3 text-center transition-all ${unlocked ? 'border-violet-500/30 bg-violet-500/5' : 'opacity-40'}`}>
                <p className={`text-lg font-semibold ${unlocked ? 'text-violet-400' : 'text-white/30'}`}>{m.days}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{m.label}</p>
                {unlocked && <p className="text-xs text-emerald-400 mt-1">✓</p>}
              </div>
            )
          })}
        </div>

        {/* Stage tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {STAGES.map((s) => (
            <button key={s.key} onClick={() => setStage(s.key)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                stage === s.key ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 border border-transparent hover:bg-white/[0.03] hover:text-white/60'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Stage: Scripts */}
        {stage === 'scripts' && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <p className="text-3xl mb-4">✍️</p>
            <h2 className="text-lg font-semibold text-white mb-2">Get your daily script</h2>
            <p className="text-sm text-white/40 mb-6">Head to the script generator to create today&apos;s content.</p>
            <Link href="/scripts" className="btn-premium inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white">Generate script</Link>
          </div>
        )}

        {/* Stage: Upload */}
        {stage === 'upload' && (
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Submit your reel</p>
            <form onSubmit={handleSubmitReel} className="flex gap-3 items-end">
              <input type="url" value={reelUrl} onChange={(e) => setReelUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." required
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" />
              <button type="submit" disabled={submitting} className="btn-premium rounded-xl px-5 py-3 text-sm font-semibold text-white shrink-0 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
            {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}
          </div>
        )}

        {/* Stage: Analysis */}
        {stage === 'analysis' && (
          <div>
            {currentSubmission ? (
              <div className="glass rounded-2xl p-6">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Submitted</p>
                <p className="text-sm text-white mb-4 truncate">{currentSubmission.url}</p>

                {currentSubmission.feedback && (
                  <div className="mb-6 space-y-3">
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Feedback scores</p>
                    {SCORE_LABELS.map(({ key, label }) => (
                      <div key={key} className="py-3 border-b border-white/[0.06] last:border-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-white/50">{label}</span>
                          <span className="text-sm font-medium text-white">{currentSubmission.feedback!.scores[key]}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: `${currentSubmission.feedback!.scores[key]}%` }} />
                        </div>
                        <p className="text-xs text-white/30 mt-1">{currentSubmission.feedback!.commentary[key]}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!prediction && (
                  <button onClick={handlePredict} disabled={predicting} className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {predicting ? 'Predicting...' : 'Get virality prediction'}
                  </button>
                )}

                {prediction && (
                  <div className="mt-6 pt-6 border-t border-white/[0.06]">
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <p className="text-3xl font-bold text-white">{prediction.score}</p>
                        <p className="text-xs text-white/40">Score</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{prediction.reachRange.min.toLocaleString()} – {prediction.reachRange.max.toLocaleString()}</p>
                        <p className="text-xs text-white/40">Reach</p>
                      </div>
                    </div>
                    {prediction.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Suggestions</p>
                        {prediction.suggestions.map((s, i) => <p key={i} className="text-sm text-white/60 py-2 border-b border-white/[0.06] last:border-0">{s}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-strong rounded-2xl p-10 text-center">
                <p className="text-sm text-white/40">Submit a reel first to get analysis.</p>
                <button onClick={() => setStage('upload')} className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition">Go to upload</button>
              </div>
            )}
          </div>
        )}

        {/* Stage: Feedback history */}
        {stage === 'feedback' && (
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Submission history</p>
            {historyLoading ? (
              <div className="flex items-center gap-3 justify-center py-8"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">No submissions yet.</p>
            ) : (
              <div>
                {history.map((s) => (
                  <div key={s.id} className="py-3 border-b border-white/[0.06] last:border-0">
                    <p className="text-sm text-white truncate">{s.url}</p>
                    <p className="text-xs text-white/30 mt-0.5">{new Date(s.submittedAt).toLocaleString()}</p>
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
