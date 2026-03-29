'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiFetch, ApiError } from '@/lib/api'

interface Submission { id: string; url: string; submittedAt: string }
interface Breakdown { hookStrength: number; retentionPotential: number; shareability: number; trendAlignment: number }
interface Improvement { problem: string; fix: string; reason: string }
interface FixGuide { problem: string; fix: string; howToShoot: string[]; expectedResult: string }
interface Prediction {
  id: string; score: number; reachRange: { min: number; max: number }
  breakdown?: Breakdown; improvements?: Improvement[]; howToFix?: FixGuide[]
  suggestions: string[]; createdAt: string
}

const BREAKDOWN_LABELS: { key: keyof Breakdown; label: string; icon: string }[] = [
  { key: 'hookStrength', label: 'Hook Strength', icon: '🪝' },
  { key: 'retentionPotential', label: 'Retention', icon: '📊' },
  { key: 'shareability', label: 'Shareability', icon: '📤' },
  { key: 'trendAlignment', label: 'Trend Fit', icon: '📈' },
]

function scoreColor(s: number, max = 100) {
  const pct = max === 10 ? s * 10 : s
  return pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'
}
function scoreGradient(s: number) {
  return s >= 70 ? 'from-emerald-400 to-green-500' : s >= 40 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500'
}
function scoreEmoji(s: number) { return s >= 7 ? '✅' : s >= 5 ? '⚠️' : '❌' }
function psychMsg(score: number) {
  if (score >= 80) return { text: '🔥 Strong viral potential', cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' }
  if (score >= 60) return { text: '💪 Good foundation \u2014 a few tweaks could make this blow up', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/5' }
  if (score >= 40) return { text: '\u26a0\ufe0f May not perform well without changes', cls: 'text-orange-400 border-orange-500/20 bg-orange-500/5' }
  return { text: '🚨 Needs significant improvements before posting', cls: 'text-red-400 border-red-500/20 bg-red-500/5' }
}

export default function ViralityPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [reels, setReels] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFix, setShowFix] = useState(false)

  useEffect(() => {
    apiFetch<Submission[]>('/reel/history', getToken).then(setReels).catch(() => {}).finally(() => setLoading(false))
  }, [getToken])

  async function handlePredict(reelId: string) {
    setError(null); setPredicting(true); setSelectedId(reelId); setPrediction(null); setShowFix(false)
    try { setPrediction(await apiFetch<Prediction>(`/virality/predict/${reelId}`, getToken, { method: 'POST' })) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Prediction failed') }
    finally { setPredicting(false) }
  }

  function handleImproveScript() {
    if (!prediction) return
    const fixes = prediction.improvements?.map(i => i.fix).join(', ') || 'better hook, faster pacing'
    router.push(`/scripts?mode=improve&idea=${encodeURIComponent('Improved reel: ' + fixes)}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-amber-500 animate-spin" />
    </div>
  )

  const psych = prediction ? psychMsg(prediction.score) : null

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[450px] h-[450px] bg-amber-600 top-[-150px] right-[-100px] animate-float" />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">{"\u2190"} Dashboard</Link>
          <h1 className="text-3xl font-bold tracking-tight">Virality Improvement Engine</h1>
          <p className="text-sm text-white/40 mt-1">Analyze your reel, see exactly what to fix, and generate an improved script.</p>
        </div>

        {prediction && (
          <div className="space-y-4 mb-8 animate-slide-up">
            {psych && <div className={`glass rounded-2xl p-4 border ${psych.cls}`}><p className="text-sm font-medium">{psych.text}</p></div>}

            <div className="glass-strong rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex-shrink-0 w-28 h-28 rounded-full flex items-center justify-center">
                  <svg className="absolute inset-0 w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="56" cy="56" r="48" fill="none" strokeWidth="8" strokeLinecap="round" className={scoreColor(prediction.score)} stroke="currentColor" strokeDasharray={`${(prediction.score / 100) * 301.6} 301.6`} />
                  </svg>
                  <div className="text-center z-10">
                    <p className={`text-3xl font-bold ${scoreColor(prediction.score)}`}>{prediction.score}</p>
                    <p className="text-[10px] text-white/40 uppercase">Score</p>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-white/50">Reach: <span className="text-white/80 font-medium">{prediction.reachRange.min.toLocaleString()}</span> {"\u2013"} <span className="text-white/80 font-medium">{prediction.reachRange.max.toLocaleString()}</span> views</p>
                  <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(prediction.score)}`} style={{ width: `${prediction.score}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {prediction.breakdown && (
              <div className="glass rounded-2xl p-6">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Score Breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  {BREAKDOWN_LABELS.map(({ key, label, icon }) => {
                    const val = prediction.breakdown![key]
                    return (
                      <div key={key} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/50">{icon} {label}</span>
                          <span className={`text-sm font-bold ${scoreColor(val, 10)}`}>{val}/10 {scoreEmoji(val)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(val * 10)}`} style={{ width: `${val * 10}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {prediction.improvements && prediction.improvements.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">What to Improve</p>
                <div className="space-y-3">
                  {prediction.improvements.map((imp, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                      <p className="text-sm font-medium text-white/80 mb-1">{"\u274c"} {imp.problem}</p>
                      <p className="text-sm text-emerald-300/80">{"\u2192"} {imp.fix}</p>
                      <p className="text-xs text-white/30 italic mt-1">{imp.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prediction.howToFix && prediction.howToFix.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <button onClick={() => setShowFix(!showFix)} className="w-full flex items-center justify-between p-6 text-left">
                  <div>
                    <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">{"🔧"} How to Make This 9/10</p>
                    <p className="text-xs text-white/30 mt-0.5">Step-by-step guide for each weakness</p>
                  </div>
                  <span className={`text-xs text-white/30 transition-transform ${showFix ? 'rotate-90' : ''}`}>{"\u25b6"}</span>
                </button>
                {showFix && (
                  <div className="px-6 pb-6 space-y-4 animate-fade-in">
                    {prediction.howToFix.map((fix, i) => (
                      <div key={i} className="rounded-xl bg-white/[0.02] border border-amber-500/10 p-4">
                        <p className="text-sm font-medium text-white/80 mb-2">{"🚨"} {fix.problem}</p>
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 mb-3">
                          <p className="text-xs font-medium text-emerald-400 mb-1">{"\u2705"} Fix</p>
                          <p className="text-sm text-emerald-300/80">{fix.fix}</p>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs font-medium text-white/40 mb-2">{"🎬"} How to shoot:</p>
                          {fix.howToShoot.map((step: string, j: number) => (
                            <p key={j} className="text-xs text-white/60 ml-3">{j + 1}. {step}</p>
                          ))}
                        </div>
                        <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-2">
                          <p className="text-xs text-cyan-300/70">{"📈"} Expected: {fix.expectedResult}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="glass rounded-2xl p-6 border-violet-500/20 bg-violet-500/5">
              <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">{"🚀"} Viral Boost Mode</p>
              <p className="text-sm text-white/50 mb-4">Generate an improved script that applies all fixes automatically.</p>
              <button onClick={handleImproveScript} className="btn-premium w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-white">
                {"🎬"} Generate Improved Script
              </button>
            </div>
          </div>
        )}

        {error && <div role="alert" className="mb-6 glass rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center"><p className="text-sm text-red-300">{error}</p></div>}

        <h2 className="text-lg font-semibold text-white/90 mb-4">Your Reels</h2>
        {reels.length === 0 ? (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <div className="text-4xl mb-4">{"🎬"}</div>
            <h3 className="text-lg font-semibold text-white mb-2">No reels submitted yet</h3>
            <p className="text-sm text-white/40 mb-6">Submit a reel first to get virality analysis.</p>
            <Link href="/reels" className="btn-premium inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white">Submit a Reel {"\u2192"}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reels.map((r: Submission, idx: number) => (
              <div key={r.id} className={`glass rounded-2xl p-4 flex items-center justify-between transition-all animate-slide-up ${selectedId === r.id ? 'border-amber-500/30 bg-amber-500/5' : 'hover:border-white/10'}`} style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 truncate">{r.url}</p>
                  <p className="text-xs text-white/30 mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p>
                </div>
                <button onClick={() => handlePredict(r.id)} disabled={predicting && selectedId === r.id} className="ml-3 shrink-0 btn-premium rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {predicting && selectedId === r.id ? 'Analyzing...' : '🔍 Analyze'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
