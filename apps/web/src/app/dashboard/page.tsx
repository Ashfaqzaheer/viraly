"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import GlassCard3D from "../components/GlassCard3D"
import DashboardSkeleton from "../components/DashboardSkeleton"

interface Mission { id: string; date: string; hook: string; concept: string; completed: boolean }
interface StreakData { current: number; highest: number; lastActionDate: string }
interface Reward { days: number; label: string; unlocks: string }
interface MissionResponse { mission: Mission; streak: StreakData; rewards: { unlocked: Reward[]; next: Reward | null } }

const features = [
  { href: "/scripts", label: "Scripts", desc: "Trend-powered viral scripts", icon: "\u{1F4DD}", color: "from-blue-500/15 to-cyan-500/15", glow: "rgba(59,130,246,0.06)" },
  { href: "/reels", label: "Reel Feedback", desc: "Submit reels for AI analysis", icon: "\u{1F3AC}", color: "from-pink-500/15 to-rose-500/15", glow: "rgba(236,72,153,0.06)" },
  { href: "/virality", label: "Virality Engine", desc: "Analyze and improve your reels", icon: "\u{1F680}", color: "from-amber-500/15 to-orange-500/15", glow: "rgba(245,158,11,0.06)" },
  { href: "/trends", label: "Trend Radar", desc: "See what\u2019s trending now", icon: "\u{1F4E1}", color: "from-emerald-500/15 to-teal-500/15", glow: "rgba(16,185,129,0.06)" },
  { href: "/hooks", label: "Hook Library", desc: "Browse proven viral hooks", icon: "\u{1FA9D}", color: "from-indigo-500/15 to-blue-600/15", glow: "rgba(99,102,241,0.06)" },
  { href: "/analytics", label: "Analytics", desc: "View your growth metrics", icon: "\u{1F4C8}", color: "from-cyan-500/15 to-sky-500/15", glow: "rgba(6,182,212,0.06)" },
  { href: "/monetization", label: "Monetization", desc: "Learn to monetize your audience", icon: "\u{1F4B0}", color: "from-yellow-500/15 to-amber-500/15", glow: "rgba(234,179,8,0.06)" },
  { href: "/streak", label: "Streak", desc: "Track your posting consistency", icon: "\u{1F525}", color: "from-red-500/15 to-orange-500/15", glow: "rgba(239,68,68,0.06)" },
]

const REWARD_MILESTONES = [
  { days: 3, label: "2nd script", icon: "\u{1F513}" },
  { days: 7, label: "Advanced hooks", icon: "\u{1FA9D}" },
  { days: 14, label: "Trend scripts", icon: "\u{1F4E1}" },
  { days: 30, label: "Monetization", icon: "\u{1F4B0}" },
]

export default function DashboardPage() {
  const { creator, isLoading, accessToken, getToken } = useAuth()
  const router = useRouter()
  const [missionData, setMissionData] = useState<MissionResponse | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!isLoading && !accessToken) router.replace("/login")
  }, [isLoading, accessToken, router])

  useEffect(() => {
    if (!accessToken) return
    apiFetch<MissionResponse>("/mission/today", getToken).then(setMissionData).catch(() => {})
  }, [accessToken, getToken])

  async function handleCompleteMission() {
    setCompleting(true)
    try {
      const res = await apiFetch<{ mission: Mission; streak: StreakData }>("/mission/complete", getToken, { method: "POST" })
      setMissionData(prev => prev ? { ...prev, mission: res.mission, streak: res.streak } : prev)
      window.dispatchEvent(new Event("streak-updated"))
    } catch {}
    setCompleting(false)
  }

  if (isLoading) return <DashboardSkeleton />

  if (!accessToken) return null

  const mission = missionData?.mission
  const streak = missionData?.streak
  const nextReward = missionData?.rewards?.next

  return (
    <div className="relative min-h-screen overflow-hidden">
      {creator?.onboardingComplete === false && (
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 flex items-center justify-between backdrop-blur-sm">
            <span className="text-sm text-amber-200/80">Your profile is incomplete. Finish setup to unlock all features.</span>
            <Link href="/onboarding" className="ml-4 text-sm font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap transition">Complete profile {"\u2192"}</Link>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{creator?.displayName ? `, ${creator.displayName}` : creator?.email ? `, ${creator.email.split("@")[0]}` : ""} {"\u{1F44B}"}
          </h1>
          <p className="mt-2 text-white/35 text-sm">Don{"\u2019"}t guess your next reel. We decide it.</p>
        </div>

        {/* ═══ TODAY'S MISSION ═══ */}
        {mission && (
          <div className={`glass-strong rounded-2xl p-6 mb-6 border ${mission.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"} animate-slide-up`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{mission.completed ? "\u2705" : "\u{1F525}"}</span>
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Today{"\u2019"}s Mission</span>
                  {mission.completed && <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">Completed</span>}
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">{mission.hook}</h2>
                <p className="text-sm text-white/50">{mission.concept}</p>
              </div>
              {streak && (
                <div className="text-center shrink-0 ml-4">
                  <p className="text-2xl font-bold text-orange-400">{streak.current}</p>
                  <p className="text-[10px] text-white/30 uppercase">Day Streak</p>
                </div>
              )}
            </div>

            {/* Reward progress */}
            {streak && (
              <div className="mb-4">
                <div className="flex items-center gap-1 mb-2">
                  {REWARD_MILESTONES.map((r) => (
                    <div key={r.days} className="flex-1">
                      <div className={`h-1.5 rounded-full ${streak.current >= r.days ? "bg-gradient-to-r from-violet-500 to-cyan-500" : "bg-white/[0.06]"}`} />
                      <div className="flex items-center justify-center mt-1">
                        <span className={`text-[10px] ${streak.current >= r.days ? "text-violet-400" : "text-white/20"}`}>{r.icon} {r.days}d</span>
                      </div>
                    </div>
                  ))}
                </div>
                {nextReward && !mission.completed && (
                  <p className="text-xs text-white/30">{"\u{1F513}"} Next unlock: {nextReward.label} at Day {nextReward.days}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {!mission.completed ? (
                <>
                  <button onClick={handleCompleteMission} disabled={completing} className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {completing ? "Completing..." : "\u2705 I Posted This"}
                  </button>
                  <Link href={`/scripts?idea=${encodeURIComponent(mission.hook)}`} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/60 hover:text-white hover:border-white/20 transition">
                    {"\u{1F4DD}"} Generate Script
                  </Link>
                </>
              ) : (
                <p className="text-sm text-emerald-400/80">{"\u{1F389}"} Great work! Come back tomorrow for your next mission.</p>
              )}
            </div>

            {/* Streak loss warning */}
            {streak && streak.current === 0 && streak.highest > 0 && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">{"\u26A0\uFE0F"} You lost your {streak.highest}-day streak! Complete today{"\u2019"}s mission to start rebuilding.</p>
              </div>
            )}
          </div>
        )}

        {/* Feature grid */}
        <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => (
            <Link key={item.href} href={item.href}>
              <GlassCard3D glareColor={item.glow}
                className="glass group rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] hover:shadow-lg hover:shadow-violet-500/5 h-full"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-xl mb-3 border border-white/[0.04]">{item.icon}</div>
                  <p className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors duration-300">{item.label}</p>
                  <p className="text-xs text-white/25 mt-1 group-hover:text-white/45 transition-colors duration-300">{item.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-400/70 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Open <span className="transition-transform duration-300 group-hover:translate-x-1">{"\u2192"}</span>
                  </div>
                </div>
              </GlassCard3D>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  )
}
