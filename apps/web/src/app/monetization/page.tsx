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

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}><span className="spinner" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}><div className="border border-red-500/30 p-6 text-center max-w-md"><p className="text-sm text-red-400">{error}</p></div></div>

  // Lesson reader
  if (activeLesson) return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '720px' }}>
        <button type="button" onClick={() => setActiveLesson(null)} className="nav-item text-xs mb-6 inline-block">{"\u2190"} BACK TO MODULES</button>
        <div style={{ background: '#141414', border: '1px solid #262626', padding: '48px' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="tag-accent">{activeLesson.audienceLevel}</span>
            <span className="caption-upper">{activeLesson.estimatedReadMin} MIN READ</span>
          </div>
          <h4 className="mb-6">{activeLesson.title}</h4>
          <div className="text-sm text-body leading-relaxed mb-8 whitespace-pre-wrap" style={{ fontWeight: 300 }}>{activeLesson.body}</div>
          {!activeLesson.completed ? (
            <button type="button" onClick={() => handleComplete(activeLesson.id)} disabled={completing} className="btn-primary">
              {completing ? 'MARKING...' : 'MARK AS COMPLETE'}
            </button>
          ) : <p className="text-sm text-emerald-400" style={{ fontWeight: 400 }}>{"\u2713"} COMPLETED</p>}
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
        <p className="section-label mb-2">REVENUE</p>
        <h3 className="mb-2">Monetization</h3>
        <p className="text-sm text-muted mb-10" style={{ fontWeight: 300 }}>Track earnings, manage sponsors, and learn to monetize.</p>

        {/* Tab bar */}
        <div className="flex gap-px mb-10" style={{ background: '#262626' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 text-center transition-colors" style={{
                background: '#000000', padding: '14px 8px',
                borderBottom: tab === t.key ? '1px solid #ffffff' : '1px solid transparent'
              }}>
              <span className="nav-item" style={{ color: tab === t.key ? '#ffffff' : '#666666' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Learn tab */}
        {tab === 'learn' && (
          <div>
            {/* Overall progress */}
            <div className="mb-8" style={{ borderBottom: '1px solid #262626', paddingBottom: '24px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="caption-upper">OVERALL PROGRESS</span>
                <span className="text-sm text-white" style={{ fontWeight: 400 }}>{overallPercent}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${overallPercent}%` }} /></div>
            </div>

            {/* Modules */}
            {modules.map((mod) => (
              <div key={mod.id} className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h5>{mod.title}</h5>
                  <span className="caption-upper">{mod.completionPercent}%</span>
                </div>
                <div className="progress-track mb-4"><div className="progress-fill" style={{ width: `${mod.completionPercent}%` }} /></div>
                <div>
                  {mod.lessons.map(lesson => (
                    <button key={lesson.id} type="button" onClick={() => setActiveLesson(lesson)}
                      className="w-full flex items-center justify-between text-left transition-colors hover:bg-surface-card" style={{ borderBottom: '1px solid #262626', padding: '14px 0' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{
                          border: lesson.completed ? '1.5px solid #8b5cf6' : '1.5px solid #262626',
                          color: lesson.completed ? '#8b5cf6' : '#262626',
                          background: lesson.completed ? 'rgba(139,92,246,0.1)' : 'transparent'
                        }}>{lesson.completed && '\u2713'}</span>
                        <span className="text-sm truncate" style={{ fontWeight: 300, color: lesson.completed ? '#999999' : '#ffffff' }}>{lesson.title}</span>
                      </div>
                      <span className="shrink-0 ml-2 caption-upper">{lesson.estimatedReadMin} MIN</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Placeholder tabs */}
        {tab === 'earnings' && (
          <div className="text-center py-16">
            <h5 className="mb-3">Earnings tracking coming soon</h5>
            <p className="text-sm text-muted" style={{ fontWeight: 300 }}>Connect your monetization platforms to track real earnings.</p>
            <span className="tag mt-4 inline-block text-amber-400" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>IN DEVELOPMENT</span>
          </div>
        )}
        {tab === 'sponsors' && (
          <div className="text-center py-16">
            <h5 className="mb-3">Sponsor management coming soon</h5>
            <p className="text-sm text-muted" style={{ fontWeight: 300 }}>Track brand deals and manage sponsorship pipelines.</p>
            <span className="tag mt-4 inline-block text-amber-400" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>IN DEVELOPMENT</span>
          </div>
        )}
        {tab === 'payouts' && (
          <div className="text-center py-16">
            <h5 className="mb-3">Payout history coming soon</h5>
            <p className="text-sm text-muted" style={{ fontWeight: 300 }}>View payout history and manage payment methods.</p>
            <span className="tag mt-4 inline-block text-amber-400" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>IN DEVELOPMENT</span>
          </div>
        )}
      </main>
    </div>
  )
}
