'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

interface Lesson { id: string; title: string; body: string; estimatedReadMin: number; audienceLevel: string; completed: boolean }
interface Module { id: string; title: string; lessons: Lesson[]; completionPercent: number }

type Tab = 'learn' | 'earnings' | 'sponsors' | 'payouts'

const TABS: { key: Tab; label: string }[] = [
  { key: 'learn', label: 'Learn' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'payouts', label: 'Payouts' },
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
      setModules(modData.modules); setOverallPercent(progressData.percent)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load modules') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [getToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete(lessonId: string) {
    setCompleting(true)
    try { await apiFetch(`/monetization/lessons/${lessonId}/complete`, getToken, { method: 'POST' }); await loadData(); setActiveLesson(prev => prev ? { ...prev, completed: true } : null) }
    catch {} finally { setCompleting(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4"><div className="glass rounded-2xl border-red-500/20 bg-red-500/5 p-6 text-center max-w-md"><p className="text-sm text-red-300">{error}</p></div></div>

  // Lesson reader
  if (activeLesson) return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <button type="button" onClick={() => setActiveLesson(null)} className="text-xs text-white/30 hover:text-white/50 transition mb-6 inline-block">← Back to modules</button>
        <div className="glass-strong rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-medium">{activeLesson.audienceLevel}</span>
            <span className="text-xs text-white/40">{activeLesson.estimatedReadMin} min read</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-6">{activeLesson.title}</h1>
          <div className="text-sm text-white/60 leading-relaxed mb-8 whitespace-pre-wrap">{activeLesson.body}</div>
          {!activeLesson.completed ? (
            <button type="button" onClick={() => handleComplete(activeLesson.id)} disabled={completing}
              className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {completing ? 'Marking...' : 'Mark as complete'}
            </button>
          ) : <p className="text-sm text-emerald-400 font-medium">✓ Completed</p>}
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mb-1">Monetization</h1>
        <p className="text-sm text-white/40 mb-8">Track earnings, manage sponsors, and learn to monetize.</p>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                tab === t.key ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' : 'text-white/40 border border-transparent hover:bg-white/[0.03] hover:text-white/60'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Learn tab */}
        {tab === 'learn' && (
          <div>
            {/* Overall progress */}
            <div className="glass rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Overall progress</span>
                <span className="text-sm font-medium text-white">{overallPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all" style={{ width: `${overallPercent}%` }} />
              </div>
            </div>

            {/* Modules */}
            {modules.map((mod) => (
              <div key={mod.id} className="glass rounded-2xl p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-white">{mod.title}</h2>
                  <span className="text-xs text-white/40">{mod.completionPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: `${mod.completionPercent}%` }} />
                </div>
                <div>
                  {mod.lessons.map(lesson => (
                    <button key={lesson.id} type="button" onClick={() => setActiveLesson(lesson)}
                      className="w-full flex items-center justify-between text-left py-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          lesson.completed ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400' : 'border border-white/[0.12] text-transparent'
                        }`}>{lesson.completed && '✓'}</span>
                        <span className={`text-sm truncate ${lesson.completed ? 'text-white/50' : 'text-white'}`}>{lesson.title}</span>
                      </div>
                      <span className="shrink-0 ml-2 text-xs text-white/30">{lesson.estimatedReadMin} min</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Placeholder tabs */}
        {tab === 'earnings' && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <p className="text-3xl mb-4">💰</p>
            <h2 className="text-lg font-semibold text-white mb-2">Earnings tracking coming soon</h2>
            <p className="text-sm text-white/40 mb-4">Connect your monetization platforms to track real earnings.</p>
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">In development</span>
          </div>
        )}
        {tab === 'sponsors' && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <p className="text-3xl mb-4">🤝</p>
            <h2 className="text-lg font-semibold text-white mb-2">Sponsor management coming soon</h2>
            <p className="text-sm text-white/40 mb-4">Track brand deals and manage sponsorship pipelines.</p>
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">In development</span>
          </div>
        )}
        {tab === 'payouts' && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <p className="text-3xl mb-4">📋</p>
            <h2 className="text-lg font-semibold text-white mb-2">Payout history coming soon</h2>
            <p className="text-sm text-white/40 mb-4">View payout history and manage payment methods.</p>
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">In development</span>
          </div>
        )}
      </main>
    </div>
  )
}
