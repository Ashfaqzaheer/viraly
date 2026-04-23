'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Lesson { id: string; title: string; body: string; estimatedReadMin: number; audienceLevel: string; completed: boolean }
interface Module { id: string; title: string; lessons: Lesson[]; completionPercent: number }

type Tab = 'learn' | 'earnings' | 'sponsors' | 'payouts'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'learn', label: 'Learn', icon: '📚' },
  { key: 'earnings', label: 'Earnings', icon: '💰' },
  { key: 'sponsors', label: 'Sponsors', icon: '🤝' },
  { key: 'payouts', label: 'Payouts', icon: '💳' },
]

export default function MonetizationPage() {
  const { getToken } = useAuth()
  const [tab, setTab] = useState<Tab>('learn')
  const [modules, setModules] = useState<Module[]>([])
  const [overallPercent, setOverallPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completing, setCompleting] = useState(false)

  async function loadData() {
    try {
      const [modData, progressData] = await Promise.all([
        apiFetch<{ modules: Module[] }>('/monetization/modules', getToken),
        apiFetch<{ percent: number }>('/monetization/progress', getToken),
      ])
      setModules(modData.modules)
      setOverallPercent(progressData.percent)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load modules') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [getToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete(lessonId: string) {
    setCompleting(true)
    try {
      await apiFetch(`/monetization/lessons/${lessonId}/complete`, getToken, { method: 'POST' })
      await loadData()
      setActiveLesson(prev => prev ? { ...prev, completed: true } : null)
    } catch {} finally { setCompleting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" />
        <span className="text-sm text-white/40">Loading...</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div role="alert" className="glass rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center max-w-md">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    </div>
  )

  // Lesson reader view
  if (activeLesson) return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 py-8 animate-fade-in">
        <button type="button" onClick={() => setActiveLesson(null)} className="text-xs text-violet-400 hover:text-violet-300 transition mb-4 inline-block">← Back to modules</button>
        <div className="glass-strong rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              activeLesson.audienceLevel === 'beginner' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : activeLesson.audienceLevel === 'intermediate' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>{activeLesson.audienceLevel}</span>
            <span className="text-xs text-white/30">{activeLesson.estimatedReadMin} min read</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-5">{activeLesson.title}</h1>
          <div className="text-sm text-white/60 leading-relaxed mb-6 whitespace-pre-wrap">{activeLesson.body}</div>
          {!activeLesson.completed ? (
            <button type="button" onClick={() => handleComplete(activeLesson.id)} disabled={completing}
              className="btn-premium rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {completing ? 'Marking...' : 'Mark as complete'}
            </button>
          ) : <p className="text-sm text-emerald-400 font-medium">✓ Completed</p>}
        </div>
      </main>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-8 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-3xl font-bold tracking-tight mb-1 gold-text">Monetization</h1>
        <p className="text-sm text-white/35 mb-6">Track earnings, manage sponsors, and learn to monetize.</p>

        {/* Tab bar */}
        <div className="vault-glass rounded-xl p-1.5 flex gap-1 mb-8">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Learn tab */}
        {tab === 'learn' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Overall Progress</span>
                <span className="text-sm font-bold text-white">{overallPercent}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>
            <div className="space-y-4">
              {modules.map((mod, mi) => (
                <div key={mod.id} className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: `${mi * 80}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-white">{mod.title}</h2>
                    <span className="text-xs text-white/40">{mod.completionPercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${mod.completionPercent}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {mod.lessons.map(lesson => (
                      <button key={lesson.id} type="button" onClick={() => setActiveLesson(lesson)}
                        className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left hover:bg-white/[0.05] hover:border-white/10 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                            lesson.completed ? 'bg-violet-500 border-violet-500 text-white' : 'border-white/20'
                          }`}>{lesson.completed && '✓'}</span>
                          <span className="text-sm text-white/70 truncate">{lesson.title}</span>
                        </div>
                        <span className="shrink-0 ml-2 text-xs text-white/30">{lesson.estimatedReadMin} min</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Earnings tab */}
        {tab === 'earnings' && (
          <div className="glass-strong rounded-2xl p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-white mb-2">Earnings Tracking Coming Soon</h3>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-4">Connect your monetization platforms to track real earnings, affiliate revenue, and brand deal income.</p>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs text-amber-300">🚧 In Development</span>
          </div>
        )}

        {/* Sponsors tab */}
        {tab === 'sponsors' && (
          <div className="glass-strong rounded-2xl p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-lg font-semibold text-white mb-2">Sponsor Management Coming Soon</h3>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-4">Track brand deals, manage sponsorship pipelines, and organize your collaborations in one place.</p>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs text-amber-300">🚧 In Development</span>
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'payouts' && (
          <div className="glass-strong rounded-2xl p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-white mb-2">Payout History Coming Soon</h3>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-4">View your payout history, manage payment methods, and track pending transfers.</p>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs text-amber-300">🚧 In Development</span>
          </div>
                )}
      </main>
    </div>
  )
}
