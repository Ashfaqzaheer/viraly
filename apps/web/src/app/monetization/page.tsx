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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex items-center gap-3">
        <span className="spinner" />
        <span className="text-sm text-text-muted">Loading...</span>
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

  // Lesson reader view
  if (activeLesson) return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <button type="button" onClick={() => setActiveLesson(null)} className="text-xs text-accent hover:text-white transition-colors mb-4 inline-block uppercase tracking-[1.5px]">{"\u2190"} Back to modules</button>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-3">
            <span className={`tag text-xs ${
              activeLesson.audienceLevel === 'beginner' ? 'tag-accent'
                : activeLesson.audienceLevel === 'intermediate' ? 'border-amber-500 text-amber-400'
                : 'border-red-500 text-red-400'
            }`}>{activeLesson.audienceLevel}</span>
            <span className="text-xs text-text-muted">{activeLesson.estimatedReadMin} min read</span>
          </div>
          <h1 className="text-title-lg uppercase font-bold text-white mb-5">{activeLesson.title}</h1>
          <div className="text-body-sm text-text-body leading-relaxed mb-6 whitespace-pre-wrap">{activeLesson.body}</div>
          {!activeLesson.completed ? (
            <button type="button" onClick={() => handleComplete(activeLesson.id)} disabled={completing}
              className="btn-primary">
              {completing ? 'MARKING...' : 'MARK AS COMPLETE'}
            </button>
          ) : <p className="text-sm text-emerald-400 font-bold">{"\u2713"} Completed</p>}
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
        <h1 className="text-display-md uppercase font-bold text-white mb-1">Monetization</h1>
        <p className="text-body-sm text-text-muted mb-6">Track earnings, manage sponsors, and learn to monetize.</p>

        {/* Tab bar */}
        <div className="bg-surface-soft border border-hairline p-1.5 flex gap-1 mb-8">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-[1.5px] transition-colors ${
                tab === t.key
                  ? 'bg-surface-card text-white border border-white'
                  : 'text-text-muted hover:text-white'
              }`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Learn tab */}
        {tab === 'learn' && (
          <div className="space-y-6">
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-2">
                <span className="spec-label">Overall Progress</span>
                <span className="text-sm font-bold text-white">{overallPercent}%</span>
              </div>
              <div className="w-full bg-hairline h-1 overflow-hidden">
                <div className="bg-accent h-1 transition-all duration-700" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>
            <div className="space-y-4">
              {modules.map((mod) => (
                <div key={mod.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-white uppercase">{mod.title}</h2>
                    <span className="text-xs text-text-muted">{mod.completionPercent}%</span>
                  </div>
                  <div className="w-full bg-hairline h-1 mb-4 overflow-hidden">
                    <div className="bg-accent h-1 transition-all duration-700" style={{ width: `${mod.completionPercent}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {mod.lessons.map(lesson => (
                      <button key={lesson.id} type="button" onClick={() => setActiveLesson(lesson)}
                        className="w-full flex items-center justify-between border border-hairline bg-surface-soft px-4 py-3 text-left hover:bg-surface-card hover:border-white transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                            lesson.completed ? 'bg-accent border-accent text-white' : 'border-hairline'
                          }`}>{lesson.completed && '\u2713'}</span>
                          <span className="text-sm text-text-body truncate">{lesson.title}</span>
                        </div>
                        <span className="shrink-0 ml-2 text-xs text-text-muted">{lesson.estimatedReadMin} min</span>
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
          <div className="card-elevated p-10 text-center">
            <div className="text-4xl mb-4">{"\u{1F4B0}"}</div>
            <h3 className="text-title-lg uppercase font-bold text-white mb-2">Earnings Tracking Coming Soon</h3>
            <p className="text-body-sm text-text-muted max-w-md mx-auto mb-4">Connect your monetization platforms to track real earnings, affiliate revenue, and brand deal income.</p>
            <span className="tag text-xs border-amber-500 text-amber-400">{"\u{1F6A7}"} IN DEVELOPMENT</span>
          </div>
        )}

        {/* Sponsors tab */}
        {tab === 'sponsors' && (
          <div className="card-elevated p-10 text-center">
            <div className="text-4xl mb-4">{"\u{1F91D}"}</div>
            <h3 className="text-title-lg uppercase font-bold text-white mb-2">Sponsor Management Coming Soon</h3>
            <p className="text-body-sm text-text-muted max-w-md mx-auto mb-4">Track brand deals, manage sponsorship pipelines, and organize your collaborations in one place.</p>
            <span className="tag text-xs border-amber-500 text-amber-400">{"\u{1F6A7}"} IN DEVELOPMENT</span>
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'payouts' && (
          <div className="card-elevated p-10 text-center">
            <div className="text-4xl mb-4">{"\u{1F4B3}"}</div>
            <h3 className="text-title-lg uppercase font-bold text-white mb-2">Payout History Coming Soon</h3>
            <p className="text-body-sm text-text-muted max-w-md mx-auto mb-4">View your payout history, manage payment methods, and track pending transfers.</p>
            <span className="tag text-xs border-amber-500 text-amber-400">{"\u{1F6A7}"} IN DEVELOPMENT</span>
          </div>
        )}
      </main>
    </div>
  )
}
