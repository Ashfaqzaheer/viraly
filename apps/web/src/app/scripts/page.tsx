"use client"

import { useState, useEffect, useRef, FormEvent, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/api"

interface ScriptScene { sceneNumber: number; title: string; timeRange: string; shotType: string; cameraSetup: string; action: string; dialogue: string | null; textOverlay: string | null; sound: string | null; lightingTip: string | null; editingTip: string | null }
interface DeepScript { id: string; hook: string; concept: string; whyViral: string; duration: string; voiceType: string; trendBased?: boolean; trendCluster?: string | null; scenes: ScriptScene[]; caption: string; hashtags: string[]; trendingAudio: string[]; proTips: string[]; whyItWorks: string[] }
interface ExecutionGuide extends DeepScript { title: string; subtitlesSuggestion: string; editingNotes: string; callToAction: string }
interface TrendClusterInfo { name: string; description: string | null; strength: number; growthPercent: number; exampleHooks: string[] }
interface TrendRadarData { clusters: TrendClusterInfo[]; topHooks: string[] }

function getDifficulty(script: DeepScript): string {
  const scenes = script.scenes?.length ?? 0
  if (scenes <= 3) return "Easy"
  if (scenes <= 5) return "Medium"
  return "Advanced"
}

type Step = "idle" | "initial" | "more" | "guide"

export default function ScriptsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /></div>}>
      <ScriptsPageInner />
    </Suspense>
  )
}

function ScriptsPageInner() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const autoTriggered = useRef(false)

  const [idea, setIdea] = useState("")
  const [currentIdea, setCurrentIdea] = useState("")
  const [step, setStep] = useState<Step>("idle")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const [initialScript, setInitialScript] = useState<DeepScript | null>(null)
  const [moreScripts, setMoreScripts] = useState<DeepScript[]>([])
  const [guide, setGuide] = useState<ExecutionGuide | null>(null)
  const [copied, setCopied] = useState(false)
  const [trendRadar, setTrendRadar] = useState<TrendRadarData | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ scenes: true, dialogue: false, editing: false, audio: false, tips: false })

  useEffect(() => {
    apiFetch<TrendRadarData>("/scripts/trend-radar", getToken).then(setTrendRadar).catch(() => {})
    apiFetch<{ current: number }>("/streak", getToken).then(data => setStreakDays(data.current)).catch(() => {})
  }, [getToken])

  useEffect(() => {
    if (autoTriggered.current) return
    const mode = searchParams.get("mode")
    const ideaParam = searchParams.get("idea")
    if ((mode === "improve" || mode === "trend") && ideaParam) {
      autoTriggered.current = true
      setIdea(ideaParam); setCurrentIdea(ideaParam); setLoading(true); setError(null); setStep("initial")
      apiFetch<{ script: DeepScript }>("/scripts/initial", getToken, { method: "POST", body: JSON.stringify({ idea: ideaParam }) })
        .then(res => { setInitialScript(res.script); setStep("initial"); window.dispatchEvent(new Event("streak-updated")) })
        .catch(err => { if (err instanceof ApiError && err.code === "onboarding_incomplete") setNeedsOnboarding(true); else setError(err instanceof Error ? err.message : "Failed to generate"); setStep("idle") })
        .finally(() => setLoading(false))
    }
  }, [searchParams, getToken])

  function handleError(err: unknown) { if (err instanceof ApiError && err.code === "onboarding_incomplete") setNeedsOnboarding(true); else setError(err instanceof Error ? err.message : "Something went wrong") }
  function toggleSection(key: string) { setOpenSections(prev => ({ ...prev, [key]: !prev[key] })) }

  async function handleSearch(e: FormEvent) {
    e.preventDefault(); const trimmed = idea.trim(); if (!trimmed) return
    setLoading(true); setError(null); setInitialScript(null); setMoreScripts([]); setGuide(null); setCurrentIdea(trimmed)
    try { const res = await apiFetch<{ script: DeepScript }>("/scripts/initial", getToken, { method: "POST", body: JSON.stringify({ idea: trimmed }) }); setInitialScript(res.script); setStep("initial"); window.dispatchEvent(new Event("streak-updated")) }
    catch (err) { handleError(err) }
    setLoading(false)
  }

  async function handleGenerateMore() {
    setLoading(true); setError(null)
    try { const res = await apiFetch<{ scripts: DeepScript[] }>("/scripts/more", getToken, { method: "POST", body: JSON.stringify({ idea: currentIdea }) }); setMoreScripts(res.scripts); setStep("more") }
    catch (err) { handleError(err) }
    setLoading(false)
  }

  async function handleViewFullGuide(script: DeepScript) {
    setLoading(true); setError(null)
    try { const res = await apiFetch<{ guide: ExecutionGuide }>("/scripts/guide", getToken, { method: "POST", body: JSON.stringify({ idea: currentIdea, hook: script.hook, concept: script.concept }) }); setGuide(res.guide); setStep("guide"); setOpenSections({ scenes: true, dialogue: false, editing: false, audio: false, tips: false }) }
    catch (err) { handleError(err) }
    setLoading(false)
  }

  function handleStartOver() { setStep("idle"); setInitialScript(null); setMoreScripts([]); setGuide(null); setError(null); setIdea(""); setCurrentIdea("") }

  function copyScript(script: DeepScript) {
    let text = `${script.concept}\n${script.hook}\n${script.duration}\n${script.voiceType}\n\n`
    text += script.scenes.map(s => `Scene ${s.sceneNumber}: ${s.title} (${s.timeRange})\nShot: ${s.shotType}\nCamera: ${s.cameraSetup}\nAction: ${s.action}` + (s.dialogue ? `\n"${s.dialogue}"` : "") + (s.textOverlay ? `\nText: ${s.textOverlay}` : "")).join("\n\n")
    text += `\n\nCaption: ${script.caption}\n${script.hashtags.map(t => "#" + t).join(" ")}`
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (needsOnboarding) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-10 text-center max-w-md">
        <h2 className="text-lg font-semibold text-white mb-3">Complete your profile first</h2>
        <p className="text-sm text-white/40 mb-6">Set your niche so we can generate scripts tailored to your content.</p>
        <Link href="/onboarding" className="btn-premium inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white">Complete profile</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-white">Script generator</h1>
            <p className="text-sm text-white/40 mt-1">Trend-powered viral scripts for your reels</p>
          </div>
          {step !== "idle" && (
            <button onClick={handleStartOver} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition">New search</button>
          )}
        </div>

        {/* Search form */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <form onSubmit={handleSearch}>
            <label htmlFor="idea" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">What reel do you want to create?</label>
            <div className="flex gap-3 items-end">
              <input id="idea" type="text" value={idea} onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. mini vlog for devops engineer, gym transformation reveal..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20"
                disabled={loading} />
              <button type="submit" disabled={loading || !idea.trim()} className="btn-premium rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 shrink-0">
                {loading && step === "idle" ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Generate"}
              </button>
            </div>
          </form>
        </div>

        {/* Trend Radar */}
        {step === "idle" && trendRadar && trendRadar.clusters.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Trending in your niche</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {trendRadar.clusters.slice(0, 3).map((cluster) => (
                <div key={cluster.name} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{cluster.name}</span>
                    <span className="text-xs text-emerald-400">+{cluster.growthPercent}%</span>
                  </div>
                  {cluster.description && <p className="text-xs text-white/40 mb-2">{cluster.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {cluster.exampleHooks.slice(0, 2).map((h, i) => <span key={i} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/50 truncate max-w-[160px]">{h}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div role="alert" className="mb-6 glass rounded-2xl border-red-500/20 bg-red-500/5 p-4 text-center"><p className="text-sm text-red-300">{error}</p></div>}
        {loading && <div className="glass rounded-2xl p-8 mb-6 text-center"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin inline-block" /><p className="text-sm text-white/40 mt-3">Generating...</p></div>}

        {/* STEP 1: Single script */}
        {!loading && initialScript && step === "initial" && (
          <div className="space-y-4">
            <ScriptCard script={initialScript} badge="Your script" onViewGuide={() => handleViewFullGuide(initialScript)} />
            <button onClick={handleGenerateMore} disabled={loading} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:border-white/20 transition">Generate 3 more scripts</button>
          </div>
        )}

        {/* STEP 2: Multiple scripts */}
        {!loading && moreScripts.length > 0 && step === "more" && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Pick a script for the full guide</p>
            {moreScripts.map((script, idx) => {
              const isLocked = idx === 1 && streakDays < 3 ? "streak" : idx === 2 ? "premium" : null
              return (
                <div key={script.id} className="relative">
                  {isLocked ? (
                    <div className="relative overflow-hidden glass rounded-2xl p-6">
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm">
                        <div className="text-center">
                          <p className="text-sm font-medium text-white mb-1">{isLocked === "streak" ? `Unlock at Day 3 (${streakDays}/3)` : "Premium only"}</p>
                          <p className="text-xs text-white/40">{isLocked === "streak" ? "Keep posting daily" : "Upgrade to access"}</p>
                        </div>
                      </div>
                      <div className="opacity-20 pointer-events-none">
                        <h3 className="text-sm font-medium text-white mb-1">{script.hook}</h3>
                        <p className="text-xs text-white/40">{script.concept}</p>
                      </div>
                    </div>
                  ) : (
                    <ScriptCard script={script} badge={`Script ${idx + 1}`} onViewGuide={() => handleViewFullGuide(script)} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* STEP 3: Full guide */}
        {!loading && guide && step === "guide" && (
          <FullGuideView guide={guide} openSections={openSections} onToggleSection={toggleSection} onCopy={() => copyScript(guide)} copied={copied} />
        )}

        {/* Empty state */}
        {step === "idle" && !loading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">✍️</p>
            <h2 className="text-lg font-semibold text-white mb-2">Don&apos;t guess your next reel</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">Type your idea above. We'll give you a script idea first, then a full shooting guide when you're ready.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ScriptCard({ script, badge, onViewGuide }: { script: DeepScript; badge: string; onViewGuide: () => void }) {
  const difficulty = getDifficulty(script)
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-medium">{badge}</span>
        {script.trendBased && <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50">Trend-based</span>}
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{script.hook}</h3>
      <p className="text-sm text-white/50 mb-4">{script.concept}</p>
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">{script.duration || "20-25s"}</span>
        <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">{difficulty}</span>
      </div>
      {script.whyViral && <p className="text-xs text-emerald-400 mb-4">{script.whyViral}</p>}
      <button onClick={onViewGuide} className="btn-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white">View full guide</button>
    </div>
  )
}

function FullGuideView({ guide, openSections, onToggleSection, onCopy, copied }: { guide: ExecutionGuide; openSections: Record<string, boolean>; onToggleSection: (key: string) => void; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-6 border-l-2 border-violet-500/50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-medium mb-3 inline-block">Full shooting guide</span>
            <h2 className="text-lg font-semibold text-white">{guide.title || guide.concept}</h2>
            <p className="text-sm text-white/50 mt-1">{guide.hook}</p>
          </div>
          <button onClick={onCopy} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 transition">{copied ? "Copied!" : "Copy all"}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">{guide.duration}</span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">{guide.voiceType.split("\u2014")[0].split("--")[0].trim()}</span>
        </div>
      </div>

      {guide.whyViral && (
        <div className="glass rounded-2xl p-4 border-l-2 border-emerald-500/30">
          <p className="text-xs font-medium text-emerald-400 mb-1">Viral potential</p>
          <p className="text-sm text-emerald-300/80">{guide.whyViral}</p>
        </div>
      )}

      <CollapsibleSection label="Scene breakdown" count={guide.scenes.length} open={openSections.scenes} onToggle={() => onToggleSection("scenes")}>
        <div className="space-y-3">
          {guide.scenes.map((scene) => (
            <div key={scene.sceneNumber} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-violet-400">{String(scene.sceneNumber).padStart(2, '0')}</span>
                <span className="text-sm font-medium text-white">{scene.title}</span>
                <span className="text-xs text-white/30 ml-auto">{scene.timeRange}</span>
              </div>
              <p className="text-sm text-white/50 mb-1">{scene.action}</p>
              {scene.dialogue && <p className="text-sm text-amber-400/80 italic">&ldquo;{scene.dialogue}&rdquo;</p>}
              {scene.textOverlay && <p className="text-xs text-violet-300 mt-1">Text: {scene.textOverlay}</p>}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="Editing tips" open={openSections.editing} onToggle={() => onToggleSection("editing")}>
        <div className="space-y-3">
          {guide.subtitlesSuggestion && <div><p className="text-xs font-medium text-white/50 mb-1">Subtitles</p><p className="text-sm text-white/60">{guide.subtitlesSuggestion}</p></div>}
          {guide.editingNotes && <div><p className="text-xs font-medium text-white/50 mb-1">Notes</p><p className="text-sm text-white/60">{guide.editingNotes}</p></div>}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="Trending audio" count={guide.trendingAudio.length} open={openSections.audio} onToggle={() => onToggleSection("audio")}>
        <div className="space-y-2">
          {guide.trendingAudio.map((audio, i) => <p key={i} className="text-sm text-white/60 py-2 border-b border-white/[0.06] last:border-0">{audio}</p>)}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="Pro tips" count={guide.proTips.length} open={openSections.tips} onToggle={() => onToggleSection("tips")}>
        <div className="space-y-2">
          {guide.proTips.map((tip, i) => <p key={i} className="text-sm text-white/60 py-2 border-b border-white/[0.06] last:border-0">{tip}</p>)}
        </div>
      </CollapsibleSection>

      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Why this works</p>
        <div className="flex flex-wrap gap-2">
          {guide.whyItWorks.map((reason, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">{reason}</span>)}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Caption</p>
        <p className="text-sm text-white/60 mb-3">{guide.caption}</p>
        <div className="flex flex-wrap gap-1.5">
          {guide.hashtags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/40">#{tag}</span>)}
        </div>
      </div>

      {guide.callToAction && (
        <div className="glass rounded-2xl p-5 border-l-2 border-violet-500/30">
          <p className="text-sm text-violet-300">{guide.callToAction}</p>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ label, count, open, onToggle, children }: { label: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/70">{label}</span>
          {count !== undefined && <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] text-[10px] text-white/40">{count}</span>}
        </div>
        <span className={`text-xs text-white/30 transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▶</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}
