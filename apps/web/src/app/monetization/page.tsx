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

// Mock earnings data (would come from API in production)
const EARNINGS_DATA = {
  totalEarnings: 2847.50,
  thisMonth: 645.00,
  lastMonth: 892.30,
  growth: 12.5,
  sources: [
    { name: 'Affiliate Links', amount: 1245.00, icon: '🔗', color: 'from-violet-500 to-purple-500', percent: 44 },
    { name: 'Brand Deals', amount: 1102.50, icon: '🤝', color: 'from-cyan-500 to-blue-500', percent: 39 },
    { name: 'Digital Products', amount: 500.00, icon: '📦', color: 'from-emerald-500 to-teal-500', percent: 17 },
  ],
  monthly: [
    { month: 'Oct', amount: 320 }, { month: 'Nov', amount: 480 }, { month: 'Dec', amount: 560 },
    { month: 'Jan', amount: 720 }, { month: 'Feb', amount: 892 }, { month: 'Mar', amount: 645 },
  ]
}

const SPONSORS = [
  { id: '1', brand: 'FitGear Pro', status: 'active' as const, deal: '$500/post', posts: 3, remaining: 2, logo: '💪', startDate: '2026-01-15', endDate: '2026-04-15' },
  { id: '2', brand: 'NutriBlend', status: 'negotiating' as const, deal: '$300/post', posts: 0, remaining: 5, logo: '🥤', startDate: '2026-03-01', endDate: '2026-06-01' },
  { id: '3', brand: 'TechWear Co', status: 'completed' as const, deal: '$250/post', posts: 4, remaining: 0, logo: '👕', startDate: '2025-10-01', endDate: '2026-01-01' },
  { id: '4', brand: 'MindfulApp', status: 'active' as const, deal: '$400/post', posts: 1, remaining: 4, logo: '🧘', startDate: '2026-02-01', endDate: '2026-05-01' },
]

const PAYOUTS = [
  { id: '1', amount: 892.30, date: '2026-02-28', status: 'completed' as const, method: 'Bank Transfer' },
  { id: '2', amount: 720.00, date: '2026-01-31', status: 'completed' as const, method: 'Bank Transfer' },
  { id: '3', amount: 560.00, date: '2025-12-31', status: 'completed' as const, method: 'PayPal' },
  { id: '4', amount: 645.00, date: '2026-03-31', status: 'pending' as const, method: 'Bank Transfer' },
]

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
          <div className="space-y-6 animate-fade-in">
            {/* Top cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="vault-glass gold-accent rounded-xl p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Earnings</p>
                <p className="text-xl font-bold gold-text">${EARNINGS_DATA.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="glass-strong rounded-xl p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">This Month</p>
                <p className="text-xl font-bold text-white">${EARNINGS_DATA.thisMonth.toLocaleString()}</p>
              </div>
              <div className="glass-strong rounded-xl p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Last Month</p>
                <p className="text-xl font-bold text-white/60">${EARNINGS_DATA.lastMonth.toLocaleString()}</p>
              </div>
              <div className="glass-strong rounded-xl p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Growth</p>
                <p className="text-xl font-bold text-emerald-400">+{EARNINGS_DATA.growth}%</p>
              </div>
            </div>

            {/* Revenue chart (simple bar chart) */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Monthly Revenue</h2>
              <div className="flex items-end gap-3 h-40">
                {EARNINGS_DATA.monthly.map((m, i) => {
                  const maxAmt = Math.max(...EARNINGS_DATA.monthly.map(x => x.amount))
                  const height = (m.amount / maxAmt) * 100
                  const isLast = i === EARNINGS_DATA.monthly.length - 1
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-white/50 font-medium">${m.amount}</span>
                      <div className={`w-full rounded-t-lg transition-all duration-500 ${
                        isLast ? 'bg-gradient-to-t from-violet-500 to-cyan-500' : 'bg-white/10'
                      }`} style={{ height: `${height}%` }} />
                      <span className="text-[10px] text-white/30">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Revenue sources */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Revenue Sources</h2>
              <div className="space-y-4">
                {EARNINGS_DATA.sources.map(src => (
                  <div key={src.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span>{src.icon}</span>
                        <span className="text-sm font-medium text-white/70">{src.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">${src.amount.toLocaleString()} <span className="text-white/30 font-normal">({src.percent}%)</span></span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className={`bg-gradient-to-r ${src.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${src.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sponsors tab */}
        {tab === 'sponsors' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-strong rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{SPONSORS.filter(s => s.status === 'active').length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Active</p>
              </div>
              <div className="glass-strong rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{SPONSORS.filter(s => s.status === 'negotiating').length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Negotiating</p>
              </div>
              <div className="glass-strong rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white/40">{SPONSORS.filter(s => s.status === 'completed').length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Completed</p>
              </div>
            </div>

            {/* Sponsor cards */}
            <div className="space-y-3">
              {SPONSORS.map(sponsor => (
                <div key={sponsor.id} className="glass-strong rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">{sponsor.logo}</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{sponsor.brand}</p>
                        <p className="text-xs text-white/40">{sponsor.deal}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                      sponsor.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : sponsor.status === 'negotiating' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-white/5 border border-white/10 text-white/40'
                    }`}>{sponsor.status}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                    <span>📅 {new Date(sponsor.startDate).toLocaleDateString()} – {new Date(sponsor.endDate).toLocaleDateString()}</span>
                    <span>📸 {sponsor.posts} posted</span>
                    {sponsor.remaining > 0 && <span className="text-violet-400">{sponsor.remaining} remaining</span>}
                  </div>
                  {sponsor.status === 'active' && sponsor.remaining > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${(sponsor.posts / (sponsor.posts + sponsor.remaining)) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'payouts' && (
          <div className="space-y-6 animate-fade-in">
            {/* Payout summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-strong rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Available Balance</p>
                <p className="text-2xl font-bold gradient-text">${EARNINGS_DATA.thisMonth.toLocaleString()}</p>
                <button className="btn-premium rounded-lg px-4 py-2 text-xs font-semibold text-white mt-3 w-full">
                  Request Payout
                </button>
              </div>
              <div className="glass-strong rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Paid Out</p>
                <p className="text-2xl font-bold text-white">
                  ${PAYOUTS.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-white/30 mt-3">{PAYOUTS.filter(p => p.status === 'completed').length} payouts completed</p>
              </div>
            </div>

            {/* Payout history */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Payout History</h2>
              <div className="space-y-2">
                {PAYOUTS.map(payout => (
                  <div key={payout.id} className="flex items-center justify-between glass rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {payout.status === 'completed' ? '✓' : '⏳'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">${payout.amount.toLocaleString()}</p>
                        <p className="text-xs text-white/30">{payout.method} · {new Date(payout.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                      payout.status === 'completed'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}>{payout.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Payment Method</h2>
              <div className="flex items-center justify-between glass rounded-xl px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg">🏦</div>
                  <div>
                    <p className="text-sm font-medium text-white">Bank Transfer</p>
                    <p className="text-xs text-white/30">****4829 · Primary</p>
                  </div>
                </div>
                <button className="text-xs text-violet-400 hover:text-violet-300 transition">Edit</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
