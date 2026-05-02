"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import DashboardSkeleton from "../components/DashboardSkeleton"

interface Mission { id: string; date: string; hook: string; concept: string; completed: boolean }
interface StreakData { current: number; highest: number; lastActionDate: string }
interface Reward { days: number; label: string; unlocks: string }
interface MissionResponse { mission: Mission; streak: StreakData; rewards: { unlocked: Reward[]; next: Reward | null } }

const features = [
  { href: "/scripts", label: "Scripts", desc: "Trend-powered viral scripts", icon: "\u{1F4DD}" },
  { href: "/reels", label: "Reel Feedback", desc: "Submit reels for AI analysis", icon: "\u{1F3AC}" },
  { href: "/virality", label: "Virality Engine", desc: "Analyze and improve your reels", icon: "\u{1F680}" },
  { href: "/trends", label: "Trend Radar", desc: "See what\u2019s trending now", icon: "\u{1F4E1}" },
  { href: "/hooks", label: "Hook Library", desc: "Browse proven viral hooks", icon: "\u{1FA9D}" },
  { href: "/analytics", label: "Analytics", desc: "View your growth metrics", icon: "\u{1F4C8}" },
  { href: "/monetization", label: "Monetization", desc: "Learn to monetize your audience", icon: "\u{1F4B0}" },
  { href: "/streak", label: "Streak", desc: "Track your posting consistency", icon: "\u{1F525}" },
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
    <div className="min-h-screen bg-black">
      {creator?.onboardingComplete === false && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="border border-amber-500/30 bg-amber-500/10 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-200">Your profile is incomplete. Finish setup to unlock all features.</span>
            <Link href="/onboarding" className="ml-4 text-sm font-bold text-amber-300 hover:text-white whitespace-nowrap transition-colors uppercase tracking-[1.5px]">Complete profile {"\u2192"}</Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-display-md uppercase font-bold text-white">
            Welcome back{creator?.displayName ? `, ${creator.displayName}` : creator?.email ? `, ${creator.email.split("@")[0]}` : ""}
          </h1>
          <p className="mt-2 text-text-muted text-body-sm">Don{"\u2019"}t guess your next reel. We decide it.</p>
        </div>

        {/* ═══ STREAK BAND ═══ */}
        {streak && (
          <div className="bg-surface-soft border-b border-hairline border-t-4 border-t-accent mb-6 p-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-display-sm font-bold text-accent streak-pulse">{streak.current}</p>
                <p className="spec-label">Day Streak</p>
              </div>
              <div className="h-10 w-px bg-hairline" />
              <div className="text-center">
                <p className="text-title-lg font-bold text-white">{streak.highest}</p>
                <p className="spec-label">Best</p>
              </div>
            </div>
            {/* Reward progress */}
            <div className="hidden sm:flex items-center gap-1">
              {REWARD_MILESTONES.map((r) => (
                <div key={r.days} className="flex-1 min-w-[60px]">
                  <div className={`h-1 ${streak.current >= r.days ? "bg-accent" : "bg-hairline"}`} />
                  <div className="flex items-center justify-center mt-1">
                    <span className={`text-[10px] uppercase tracking-[1px] ${streak.current >= r.days ? "text-accent" : "text-text-muted"}`}>{r.icon} {r.days}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TODAY'S MISSION ═══ */}
        {mission && (
          <div className="card-elevated mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{mission.completed ? "\u2705" : "\u{1F525}"}</span>
                  <span className="spec-label">Today{"\u2019"}s Mission</span>
                  {mission.completed && <span className="tag tag-accent text-xs">Completed</span>}
                </div>
                <h2 className="text-title-lg uppercase font-bold text-white mb-1">{mission.hook}</h2>
                <p className="text-body-sm text-text-body">{mission.concept}</p>
              </div>
            </div>

            {nextReward && !mission.completed && (
              <p className="text-xs text-text-muted mb-4">{"\u{1F513}"} Next unlock: {nextReward.label} at Day {nextReward.days}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {!mission.completed ? (
                <>
                  <button onClick={handleCompleteMission} disabled={completing} className="btn-primary">
                    {completing ? "COMPLETING..." : "\u2705 I POSTED THIS"}
                  </button>
                  <Link href={`/scripts?idea=${encodeURIComponent(mission.hook)}`} className="btn-secondary">
                    {"\u{1F4DD}"} GENERATE SCRIPT
                  </Link>
                </>
              ) : (
                <p className="text-sm text-emerald-400">{"\u{1F389}"} Great work! Come back tomorrow for your next mission.</p>
              )}
            </div>

            {/* Streak loss warning */}
            {streak && streak.current === 0 && streak.highest > 0 && (
              <div className="mt-4 border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs text-red-400">{"\u26A0\uFE0F"} You lost your {streak.highest}-day streak! Complete today{"\u2019"}s mission to start rebuilding.</p>
              </div>
            )}
          </div>
        )}

        {/* Feature grid */}
        <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => (
            <Link key={item.href} href={item.href}
              className="card group hover:border-white transition-colors">
              <div className="flex h-10 w-10 items-center justify-center bg-surface-soft border border-hairline text-xl mb-3">{item.icon}</div>
              <p className="text-sm font-bold text-white uppercase tracking-[1px] group-hover:text-accent transition-colors">{item.label}</p>
              <p className="text-xs text-text-muted mt-1">{item.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-text-muted uppercase tracking-[1.5px] opacity-0 transition-opacity group-hover:opacity-100">
                Open <span>{"\u2192"}</span>
              </div>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  )
}
