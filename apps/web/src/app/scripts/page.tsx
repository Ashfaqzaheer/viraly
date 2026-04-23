"use client"

import { useState, useEffect, useRef, FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { apiFetch, ApiError } from "@/lib/api"

// ── Types ────────────────────────────────────────────────────────────────────

interface ScriptScene {
  sceneNumber: number
  title: string
  timeRange: string
  shotType: string
  cameraSetup: string
  action: string
  dialogue: string | null
  textOverlay: string | null
  sound: string | null
  lightingTip: string | null
  editingTip: string | null
}

interface DeepScript {
  id: string
  hook: string
  concept: string
  whyViral: string
  duration: string
  voiceType: string
  trendBased?: boolean
  trendCluster?: string | null
  scenes: ScriptScene[]
  caption: string
  hashtags: string[]
  trendingAudio: string[]
  proTips: string[]
  whyItWorks: string[]
}

interface ExecutionGuide extends DeepScript {
  title: string
  subtitlesSuggestion: string
  editingNotes: string
  callToAction: string
}

interface TrendClusterInfo {
  name: string
  description: string | null
  strength: number
  growthPercent: number
  exampleHooks: string[]
}

interface TrendRadarData {
  clusters: TrendClusterInfo[]
  topHooks: string[]
}

// ── Virality score helper (derived from trend data) ──────────────────────────

function getViralityScore(script: DeepScript): string {
  // Real score comes from AI analysis — show trend indicator instead of fake number
  if (script.trendBased) return 'Trending'
  return 'New'
}

function getDifficulty(script: DeepScript): string {
  const scenes = script.scenes?.length ?? 0
  if (scenes <= 3) return "Easy"
  if (scenes <= 5) return "Medium"
  return "Advanced"
}

// ── Component ────────────────────────────────────────────────────────────────

type Step = "idle" | "initial" | "more" | "guide"

export default function ScriptsPage() {
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
  // Which script is showing full detail (null = all light view)
  const [fullViewId, setFullViewId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [trendRadar, setTrendRadar] = useState<TrendRadarData | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  // Collapsible sections in full view
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    scenes: true, dialogue: false, editing: false, audio: false, tips: false,
  })

  useEffect(() => {
    apiFetch<TrendRadarData>("/scripts/trend-radar", getToken)
      .then(setTrendRadar)
      .catch(() => {})
    // Fetch streak for scarcity system
    apiFetch<{ current: number }>("/streak", getToken)
      .then(data => setStreakDays(data.current))
      .catch(() => {})
  }, [getToken])

  // Auto-trigger script generation when navigated from virality page with ?mode=improve&idea=...
  useEffect(() => {
    if (autoTriggered.current) return
    const mode = searchParams.get("mode")
    const ideaParam = searchParams.get("idea")
    if ((mode === "improve" || mode === "trend") && ideaParam) {
      autoTriggered.current = true
      setIdea(ideaParam)
      setCurrentIdea(ideaParam)
      setLoading(true)
      setError(null)
      setStep("initial")
      apiFetch<{ script: DeepScript }>("/scripts/initial", getToken, {
        method: "POST",
        body: JSON.stringify({ idea: ideaParam }),
      })
        .then(res => {
          setInitialScript(res.script)
          setStep("initial")
          window.dispatchEvent(new Event("streak-updated"))
        })
        .catch(err => {
          if (err instanceof ApiError && err.code === "onboarding_incomplete") setNeedsOnboarding(true)
          else setError(err instanceof Error ? err.message : "Failed to generate improved script")
          setStep("idle")
        })
        .finally(() => setLoading(false))
    }
  }, [searchParams, getToken])

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.code === "onboarding_incomplete") setNeedsOnboarding(true)
    else setError(err instanceof Error ? err.message : "Something went wrong")
  }

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = idea.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setInitialScript(null)
    setMoreScripts([])
    setGuide(null)
    setFullViewId(null)
    setCurrentIdea(trimmed)
    try {
      const res = await apiFetch<{ script: DeepScript }>("/scripts/initial", getToken, {
        method: "POST",
        body: JSON.stringify({ idea: trimmed }),
      })
      setInitialScript(res.script)
      setStep("initial")
      window.dispatchEvent(new Event("streak-updated"))
    } catch (err) { handleError(err) }
    setLoading(false)
  }

  async function handleGenerateMore() {
    setLoading(true)
    setError(null)
    setFullViewId(null)
    try {
      const res = await apiFetch<{ scripts: DeepScript[] }>("/scripts/more", getToken, {
        method: "POST",
        body: JSON.stringify({ idea: currentIdea }),
      })
      setMoreScripts(res.scripts)
      setStep("more")
    } catch (err) { handleError(err) }
    setLoading(false)
  }

  async function handleViewFullGuide(script: DeepScript) {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ guide: ExecutionGuide }>("/scripts/guide", getToken, {
        method: "POST",
        body: JSON.stringify({ idea: currentIdea, hook: script.hook, concept: script.concept }),
      })
      setGuide(res.guide)
      setStep("guide")
      setOpenSections({ scenes: true, dialogue: false, editing: false, audio: false, tips: false })
    } catch (err) { handleError(err) }
    setLoading(false)
  }

  function handleStartOver() {
    setStep("idle")
    setInitialScript(null)
    setMoreScripts([])
    setGuide(null)
    setError(null)
    setIdea("")
    setCurrentIdea("")
    setFullViewId(null)
  }

  function copyScript(script: DeepScript) {
    let text = `\u{1F3AC} ${script.concept}\n\u{1FA9D} ${script.hook}\n\u23F1\uFE0F ${script.duration}\n\u{1F3A4} ${script.voiceType}\n\n`
    text += script.scenes.map(s =>
      `\u2500\u2500 Scene ${s.sceneNumber}: ${s.title} (${s.timeRange}) \u2500\u2500\n` +
      `\u{1F4F7} Shot: ${s.shotType}\n\u{1F4F9} Camera: ${s.cameraSetup}\n\u{1F3AC} Action: ${s.action}` +
      (s.dialogue ? `\n\u{1F4AC} "${s.dialogue}"` : "") +
      (s.textOverlay ? `\n\u{1F4DD} Text: ${s.textOverlay}` : "") +
      (s.sound ? `\n\u{1F50A} Sound: ${s.sound}` : "") +
      (s.lightingTip ? `\n\u{1F4A1} Lighting: ${s.lightingTip}` : "") +
      (s.editingTip ? `\n\u2702\uFE0F Edit: ${s.editingTip}` : "")
    ).join("\n\n")
    text += `\n\n\u{1F4DD} Caption: ${script.caption}\n${script.hashtags.map(t => "#" + t).join(" ")}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (needsOnboarding) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-3xl p-10 text-center max-w-md animate-fade-in">
        <div className="text-4xl mb-4">{"\u{1F4DD}"}</div>
        <h2 className="text-xl font-bold text-white mb-2">Complete your profile first</h2>
        <p className="text-sm text-white/40 mb-6">Set your niche so we can generate scripts tailored to your content.</p>
        <Link href="/onboarding" className="btn-premium inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white">Complete profile {"\u2192"}</Link>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb w-[400px] h-[400px] bg-blue-600 top-[-100px] right-[-80px] animate-float" />
      <div className="orb w-[300px] h-[300px] bg-cyan-500 bottom-[-50px] left-[-60px] animate-float-delayed" />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-xs text-white/30 hover:text-white/50 transition mb-2 inline-block">{"\u2190"} Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Script Generator</h1>
            <p className="text-sm text-white/40 mt-1">Don{"\u2019"}t guess your next reel. We decide it.</p>
          </div>
          {step !== "idle" && (
            <button onClick={handleStartOver} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/50 hover:text-white hover:border-white/20 transition">
              {"\u2728"} New Search
            </button>
          )}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="glass-strong rounded-2xl p-5 mb-8">
          <label htmlFor="idea" className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
            What reel do you want to create?
          </label>
          <div className="flex gap-3">
            <input
              id="idea"
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. mini vlog for devops engineer, gym transformation reveal, cooking hack..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 backdrop-blur-sm transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !idea.trim()} className="btn-premium shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {loading && step === "idle" ? <Spinner /> : "\u{1F50D} Search"}
            </button>
          </div>
        </form>

        {/* Improve mode banner */}
        {(searchParams.get("mode") === "improve" || searchParams.get("mode") === "trend") && initialScript && !loading && (
          <div className="glass rounded-2xl p-4 mb-4 border border-violet-500/20 bg-violet-500/5 animate-fade-in">
            <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-1">
              {searchParams.get("mode") === "trend" ? "\u{1F525} Trend-Based Script" : "\u{1F680} Improved Script"}
            </p>
            <p className="text-sm text-white/50">
              {searchParams.get("mode") === "trend"
                ? "This script was generated from a trending pattern in your niche."
                : "This script was generated based on your reel analysis. All identified weaknesses have been addressed."}
            </p>
          </div>
        )}

        {/* Trend Radar */}
        {step === "idle" && trendRadar && trendRadar.clusters.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">{"\u{1F525}"} Trending in your niche</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trendRadar.clusters.slice(0, 3).map((cluster) => (
                <div key={cluster.name} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white/80 truncate">{cluster.name}</span>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">+{cluster.growthPercent}%</span>
                  </div>
                  {cluster.description && (
                    <p className="text-xs text-white/40 mb-2 line-clamp-2">{cluster.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {cluster.exampleHooks.slice(0, 2).map((h, i) => (
                      <span key={i} className="inline-block rounded-lg bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300/70 truncate max-w-[180px]">{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 glass rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass rounded-2xl p-8 mb-6 text-center animate-fade-in">
            <Spinner />
            <p className="text-sm text-white/40 mt-3">
              {searchParams.get("mode") === "improve" && step === "initial" && "\u{1F525} Improving your script based on analysis..."}
              {searchParams.get("mode") === "trend" && step === "initial" && "\u{1F525} Generating script from trend..."}
              {step === "idle" && "Finding the perfect script for you..."}
              {step === "initial" && !searchParams.get("mode") && "Creating 3 unique script ideas..."}
              {step === "more" && "Building your complete shooting guide..."}
            </p>
          </div>
        )}

        {/* ═══ STEP 1: LIGHT SCRIPT VIEW (single script) ═══ */}
        {!loading && initialScript && step === "initial" && (
          <div className="space-y-4 animate-slide-up">
            <LightScriptCard
              script={initialScript}
              badge="Your Script"
              onViewGuide={() => handleViewFullGuide(initialScript)}
            />
            <button onClick={handleGenerateMore} disabled={loading} className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition disabled:opacity-50">
              {loading ? <Spinner /> : "\u{1F504} Generate 3 More Scripts"}
            </button>
          </div>
        )}

        {/* ═══ STEP 2: LIGHT SCRIPT VIEW (3 scripts) ═══ */}
        {!loading && moreScripts.length > 0 && step === "more" && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-xs text-white/40 uppercase tracking-wider">Pick a script to get the full shooting guide</p>
            {moreScripts.map((script, idx) => {
              const isLocked = idx === 1 && streakDays < 3 ? "streak" : idx === 2 ? "premium" : null
              return (
                <div key={script.id} style={{ animationDelay: `${idx * 80}ms` }} className="relative">
                  {isLocked ? (
                    <div className="glass rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute inset-0 backdrop-blur-md bg-black/40 z-10 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl mb-2">{isLocked === "streak" ? "\u{1F513}" : "\u{1F451}"}</p>
                          <p className="text-sm font-medium text-white/80 mb-1">
                            {isLocked === "streak" ? `Unlock with Day 3 streak (${streakDays}/3)` : "Unlock with Premium"}
                          </p>
                          <p className="text-xs text-white/40">
                            {isLocked === "streak" ? "Keep posting daily to unlock" : "Upgrade to access all scripts"}
                          </p>
                        </div>
                      </div>
                      <div className="opacity-30 pointer-events-none">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">Script {idx + 1}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{script.hook}</h3>
                        <p className="text-sm text-white/60">{script.concept}</p>
                      </div>
                    </div>
                  ) : (
                    <LightScriptCard
                      script={script}
                      badge={`Script ${idx + 1}`}
                      onViewGuide={() => handleViewFullGuide(script)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ STEP 3: FULL EXECUTION GUIDE (collapsible sections) ═══ */}
        {!loading && guide && step === "guide" && (
          <FullGuideView
            guide={guide}
            openSections={openSections}
            onToggleSection={toggleSection}
            onCopy={() => copyScript(guide)}
            copied={copied}
          />
        )}

        {/* Empty state */}
        {step === "idle" && !loading && (
          <div className="glass rounded-2xl p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4">{"\u{1F3AC}"}</div>
            <h2 className="text-lg font-semibold text-white mb-2">Don{"\u2019"}t guess your next reel</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Type your idea above. We{"\u2019"}ll give you a script idea first, then a full shooting guide when you{"\u2019"}re ready.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// ═══ LIGHT SCRIPT CARD — Step 1 default view ═══════════════════════════════

function LightScriptCard({ script, badge, onViewGuide }: {
  script: DeepScript
  badge: string
  onViewGuide: () => void
}) {
  const viralityScore = getViralityScore(script)
  const difficulty = getDifficulty(script)
  const style = script.voiceType?.split("—")[0]?.split("--")[0]?.trim() || "Mixed"

  return (
    <div className="glass rounded-2xl p-6 transition-all">
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">{badge}</span>
        {script.trendBased && (
          <span className="inline-flex items-center rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-300">{"\u{1F525}"} Based on trending reels</span>
        )}
        {script.trendCluster && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300/70">{script.trendCluster}</span>
        )}
      </div>

      {/* Script Idea — the LIGHT view */}
      <div className="mb-4">
        <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-2">{"\u{1F3AF}"} Script Idea</p>
        <h3 className="text-lg font-semibold text-white mb-2">{script.hook}</h3>
        <p className="text-sm text-white/60">{script.concept}</p>
      </div>

      {/* Style + Virality Score row */}
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center rounded-lg bg-violet-500/10 border border-violet-500/15 px-2.5 py-1 text-xs text-violet-300">{"\u{1F3A4}"} {style}</span>
        <span className="inline-flex items-center rounded-lg bg-amber-500/10 border border-amber-500/15 px-2.5 py-1 text-xs text-amber-300">{viralityScore === 'Trending' ? '🔥 Trending' : '✨ New'}</span>
      </div>

      {/* Quick Overview */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
        <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-2">{"\u26A1"} Quick Overview</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-white/80">{script.duration || "20-25s"}</p>
            <p className="text-[10px] text-white/30 uppercase">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white/80">{difficulty}</p>
            <p className="text-[10px] text-white/30 uppercase">Difficulty</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white/80">{"\u{1F4F1}"} Phone</p>
            <p className="text-[10px] text-white/30 uppercase">Shoot Style</p>
          </div>
        </div>
      </div>

      {/* Why viral — compact */}
      {script.whyViral && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 mb-4">
          <p className="text-xs text-emerald-300/70">{"\u{1F680}"} {script.whyViral}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={onViewGuide} className="btn-premium flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white">
          {"\u2705"} View Full Guide
        </button>
      </div>
    </div>
  )
}

// ═══ FULL GUIDE VIEW — Step 2 with collapsible sections ═════════════════════

function FullGuideView({ guide, openSections, onToggleSection, onCopy, copied }: {
  guide: ExecutionGuide
  openSections: Record<string, boolean>
  onToggleSection: (key: string) => void
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Guide header */}
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300 mb-2">Full Shooting Guide</span>
            <h2 className="text-xl font-bold text-white">{guide.title || guide.concept}</h2>
            <p className="text-sm text-white/50 mt-1">{guide.hook}</p>
          </div>
          <button onClick={onCopy} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition shrink-0">
            {copied ? "\u2713 Copied" : "\u{1F4CB} Copy All"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-xs text-cyan-300">{"\u23F1\uFE0F"} {guide.duration}</span>
          <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs text-violet-300">{"\u{1F3A4}"} {guide.voiceType.split("\u2014")[0].split("--")[0].trim()}</span>
        </div>
      </div>

      {/* Voice guidance */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{"\u{1F3A4}"} Voice Guidance</p>
        <p className="text-sm text-white/70">{guide.voiceType}</p>
      </div>

      {/* Viral potential */}
      {guide.whyViral && (
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-2">{"\u{1F680}"} Viral Potential</p>
          <p className="text-sm text-emerald-300/70">{guide.whyViral}</p>
        </div>
      )}

      {/* ▶ Scene Breakdown — collapsible */}
      <CollapsibleSection
        title={"\u{1F3AC}"} label="Scene Breakdown" count={guide.scenes.length}
        open={openSections.scenes} onToggle={() => onToggleSection("scenes")}
      >
        <div className="space-y-3">
          {guide.scenes.map((scene) => (
            <SceneRow key={scene.sceneNumber} scene={scene} />
          ))}
        </div>
      </CollapsibleSection>

      {/* ▶ Editing & Subtitles — collapsible */}
      <CollapsibleSection
        title={"\u2702\uFE0F"} label="Editing Tips" open={openSections.editing} onToggle={() => onToggleSection("editing")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {guide.subtitlesSuggestion && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs font-medium text-white/40 mb-1">{"\u{1F4DD}"} Subtitles</p>
              <p className="text-sm text-white/60">{guide.subtitlesSuggestion}</p>
            </div>
          )}
          {guide.editingNotes && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs font-medium text-white/40 mb-1">{"\u2702\uFE0F"} Notes</p>
              <p className="text-sm text-white/60">{guide.editingNotes}</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ▶ Trending Audio — collapsible */}
      <CollapsibleSection
        title={"\u{1F3B5}"} label="Trending Audio" count={guide.trendingAudio.length}
        open={openSections.audio} onToggle={() => onToggleSection("audio")}
      >
        <div className="space-y-1.5">
          {guide.trendingAudio.map((audio, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-pink-500/5 border border-pink-500/10 px-3 py-2">
              <span className="text-pink-400 text-xs mt-0.5">{"\u266A"}</span>
              <p className="text-xs text-pink-300/80">{audio}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ▶ Pro Tips — collapsible */}
      <CollapsibleSection
        title={"\u26A1"} label="Pro Tips" count={guide.proTips.length}
        open={openSections.tips} onToggle={() => onToggleSection("tips")}
      >
        <div className="space-y-1.5">
          {guide.proTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-orange-500/5 border border-orange-500/10 px-3 py-2">
              <span className="text-orange-400 text-xs mt-0.5">{"\u26A1"}</span>
              <p className="text-xs text-orange-300/80">{tip}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Why it works */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{"\u{1F3AF}"} Why This Works</p>
        <div className="flex flex-wrap gap-1.5">
          {guide.whyItWorks.map((reason, i) => (
            <span key={i} className="inline-block rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400/80">{"\u2713"} {reason}</span>
          ))}
        </div>
      </div>

      {/* Caption & Hashtags */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Caption</p>
        <p className="text-sm text-white/60 mb-4">{guide.caption}</p>
        <div className="pt-3 border-t border-white/[0.06]">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {guide.hashtags.map(tag => (
              <span key={tag} className="inline-block rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-white/50">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      {guide.callToAction && (
        <div className="glass rounded-2xl p-5 border-violet-500/20 bg-violet-500/5">
          <p className="text-sm font-medium text-violet-400">{guide.callToAction}</p>
        </div>
      )}
    </div>
  )
}

// ═══ Collapsible Section ═════════════════════════════════════════════════════

function CollapsibleSection({ title, label, count, open, onToggle, children }: {
  title: string
  label: string
  count?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left group">
        <div className="flex items-center gap-2">
          <span className="text-sm">{title}</span>
          <span className="text-xs font-medium text-white/60">{label}</span>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">{count}</span>
          )}
        </div>
        <span className={`text-xs text-white/30 transition-transform duration-200 ${open ? "rotate-90" : ""}`}>{"\u25B6"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ═══ Scene Row ═══════════════════════════════════════════════════════════════

function SceneRow({ scene }: { scene: ScriptScene }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400">{scene.sceneNumber}</span>
        <span className="text-xs font-mono text-cyan-400">{scene.timeRange}</span>
        <span className="text-xs text-white/30">{"\u2022"}</span>
        <span className="text-sm font-medium text-white/80">{scene.title}</span>
      </div>
      <div className="grid gap-1.5 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-white/30 shrink-0 text-xs">{"\u{1F4F7}"}</span>
          <span className="text-white/60 text-xs"><span className="text-white/40">Shot:</span> {scene.shotType}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-white/30 shrink-0 text-xs">{"\u{1F4F9}"}</span>
          <span className="text-white/60 text-xs"><span className="text-white/40">Camera:</span> {scene.cameraSetup}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-white/30 shrink-0 text-xs">{"\u{1F3AC}"}</span>
          <span className="text-white/70 text-xs">{scene.action}</span>
        </div>
        {scene.dialogue && (
          <div className="flex items-start gap-2">
            <span className="text-white/30 shrink-0 text-xs">{"\u{1F4AC}"}</span>
            <span className="text-amber-300/80 italic text-xs">&ldquo;{scene.dialogue}&rdquo;</span>
          </div>
        )}
        {scene.textOverlay && (
          <div className="flex items-start gap-2">
            <span className="text-white/30 shrink-0 text-xs">{"\u{1F4DD}"}</span>
            <span className="text-cyan-300/80 text-xs">Text: {scene.textOverlay}</span>
          </div>
        )}
        {scene.sound && (
          <div className="flex items-start gap-2">
            <span className="text-white/30 shrink-0 text-xs">{"\u{1F50A}"}</span>
            <span className="text-white/40 text-xs">{scene.sound}</span>
          </div>
        )}
        {scene.lightingTip && (
          <div className="flex items-start gap-2">
            <span className="text-white/30 shrink-0 text-xs">{"\u{1F4A1}"}</span>
            <span className="text-yellow-300/60 text-xs">{scene.lightingTip}</span>
          </div>
        )}
        {scene.editingTip && (
          <div className="flex items-start gap-2">
            <span className="text-white/30 shrink-0 text-xs">{"\u2702\uFE0F"}</span>
            <span className="text-pink-300/60 text-xs">{scene.editingTip}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      <span className="text-sm">Generating...</span>
    </span>
  )
}
