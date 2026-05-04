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
  { href: "/scripts", label: "Scripts", desc: "Trend-powered viral scripts", icon: "✍️" },
  { href: "/reels", label: "Reel feedback", desc: "Submit reels for AI analysis", icon: "🎬" },
  { href: "/virality", label: "Virality engine", desc: "Analyze and improve your reels", icon: "🚀" },
  { href: "/trends", label: "Trend radar", desc: "See what's trending now", icon: "📈" },
  { href: "/hooks", label: "Hook library", desc: "Browse proven viral hooks", icon: "🪝" },
  { href: "/analytics", label: "Analytics", desc: "View your growth metrics", icon: "📊" },
  { href: "/monetization", label: "Monetization", desc: "Learn to monetize your audience", icon: "💰" },
  { href: "/streak", label: "Streak", desc: "Track your posting consistency", icon: "🔥" },
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
    <div className="min-h-screen animate-fade-in">
      <main className="max-w-6xl mx-auto px-6 py-10">
        {creator?.onboardingComplete === false && (
          <div className="mb-6 glass rounded-2xl border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-amber-200">Your profile is incomplete. Finish setup to unlock all features.</span>
            <Link href="/onboarding" className="text-sm font-medium text-amber-300 hover:text-white transition whitespace-nowrap">Complete profile →</Link>
          </div>
        )}

        {/* Streak section */}
        {streak && (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-3xl font-bold text-white">{streak.current}</p>
                  <p className="text-xs text-white/40">day streak</p>
                </div>
              </div>
              <div className="h-10 w-px bg-white/[0.08]" />
              <div>
                <p className="text-lg font-semibold text-white/70">{streak.highest}</p>
                <p className="text-xs text-white/40">best</p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Mission */}
        {mission && (
          <div className="glass-strong rounded-2xl p-6 mb-8 border-l-2 border-violet-500/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{mission.completed ? "✅" : "🎯"}</span>
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Today&apos;s mission</span>
              {mission.completed && (
                <span className="ml-2 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium uppercase">Completed</span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">{mission.hook}</h2>
            <p className="text-sm text-white/50 mb-4">{mission.concept}</p>

            {nextReward && !mission.completed && (
              <p className="text-xs text-white/30 mb-4">Next unlock: {nextReward.label} at Day {nextReward.days}</p>
            )}

            <div className="flex gap-3">
              {!mission.completed ? (
                <>
                  <button onClick={handleCompleteMission} disabled={completing}
                    className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {completing ? "Completing..." : "I posted this"}
                  </button>
                  <Link href={`/scripts?idea=${encodeURIComponent(mission.hook)}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 transition">
                    Generate script
                  </Link>
                </>
              ) : (
                <p className="text-sm text-emerald-400">Great work! Come back tomorrow for your next mission.</p>
              )}
            </div>

            {streak && streak.current === 0 && streak.highest > 0 && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-300">You lost your {streak.highest}-day streak! Complete today&apos;s mission to start rebuilding.</p>
              </div>
            )}
          </div>
        )}

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((item) => (
            <Link key={item.href} href={item.href}
              className="card-3d glass rounded-2xl p-5 group transition-all hover:bg-white/[0.05] hover:border-white/[0.12]">
              <span className="text-2xl mb-3 block">{item.icon}</span>
              <h3 className="text-sm font-medium text-white group-hover:text-violet-300 transition">{item.label}</h3>
              <p className="text-xs text-white/40 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
