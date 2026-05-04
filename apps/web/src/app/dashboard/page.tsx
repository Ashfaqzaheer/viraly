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
  { href: "/scripts", label: "Scripts", desc: "Trend-powered viral scripts" },
  { href: "/reels", label: "Reel Feedback", desc: "Submit reels for AI analysis" },
  { href: "/virality", label: "Virality Engine", desc: "Analyze and improve your reels" },
  { href: "/trends", label: "Trend Radar", desc: "See what\u2019s trending now" },
  { href: "/hooks", label: "Hook Library", desc: "Browse proven viral hooks" },
  { href: "/analytics", label: "Analytics", desc: "View your growth metrics" },
  { href: "/monetization", label: "Monetization", desc: "Learn to monetize your audience" },
  { href: "/streak", label: "Streak", desc: "Track your posting consistency" },
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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      {creator?.onboardingComplete === false && (
        <div className="editorial-container pt-4">
          <div className="border border-amber-500/30 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-200" style={{ fontWeight: 300 }}>Your profile is incomplete. Finish setup to unlock all features.</span>
            <Link href="/onboarding" className="nav-item text-amber-300 hover:text-white whitespace-nowrap">COMPLETE PROFILE {"\u2192"}</Link>
          </div>
        </div>
      )}

      <main className="editorial-container">
        {/* ═══ STREAK HERO BAND ═══ */}
        {streak && (
          <section style={{ borderBottom: '1px solid #262626', padding: '48px 0' }}>
            <p className="section-label mb-4">CONSISTENCY</p>
            <h1>{streak.current} DAYS</h1>
            <div className="flex items-center gap-8 mt-6">
              <div className="spec-cell">
                <p className="spec-value text-accent">{streak.current}</p>
                <p className="spec-label">CURRENT STREAK</p>
              </div>
              <div className="spec-cell">
                <p className="spec-value">{streak.highest}</p>
                <p className="spec-label">ALL-TIME BEST</p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ TODAY'S MISSION ═══ */}
        {mission && (
          <section style={{ paddingTop: '48px', paddingBottom: '48px' }}>
            <div className="streak-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="section-label">{mission.completed ? "\u2705" : "\u{1F525}"} TODAY&apos;S MISSION</span>
                {mission.completed && <span className="tag-accent">COMPLETED</span>}
              </div>
              <h5 className="mb-2">{mission.hook}</h5>
              <p className="text-sm text-body" style={{ fontWeight: 300 }}>{mission.concept}</p>

              {nextReward && !mission.completed && (
                <p className="text-xs text-muted mt-4">Next unlock: {nextReward.label} at Day {nextReward.days}</p>
              )}

              <div className="flex gap-3 mt-6">
                {!mission.completed ? (
                  <>
                    <button onClick={handleCompleteMission} disabled={completing} className="btn-primary">
                      {completing ? "COMPLETING..." : "I POSTED THIS"}
                    </button>
                    <Link href={`/scripts?idea=${encodeURIComponent(mission.hook)}`} className="btn-ghost">
                      GENERATE SCRIPT
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-emerald-400" style={{ fontWeight: 300 }}>Great work! Come back tomorrow for your next mission.</p>
                )}
              </div>

              {streak && streak.current === 0 && streak.highest > 0 && (
                <div className="mt-4 border border-red-500/30 p-3">
                  <p className="text-xs text-red-400" style={{ fontWeight: 300 }}>You lost your {streak.highest}-day streak! Complete today{"\u2019"}s mission to start rebuilding.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══ FEATURE GRID ═══ */}
        <section style={{ paddingTop: '48px', paddingBottom: '120px' }}>
          <p className="section-label mb-6">TOOLS</p>
          <nav className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: '#262626' }}>
            {features.map((item) => (
              <Link key={item.href} href={item.href}
                className="group p-6 transition-colors hover:bg-surface-elevated" style={{ background: '#141414' }}>
                <h6 className="group-hover:text-accent transition-colors">{item.label}</h6>
                <p className="text-xs text-muted mt-2" style={{ fontWeight: 300 }}>{item.desc}</p>
              </Link>
            ))}
          </nav>
        </section>
      </main>
    </div>
  )
}
