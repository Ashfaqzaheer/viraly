"use client"

import { useState, useEffect, useRef, FormEvent, Suspense } from "react"
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

// ── Virality score helper ──────────────────────────────────────────────────

function getViralityScore(script: DeepScript): string {
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
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><span className="spinner" /></div>}>
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    scenes: true, dialogue: false, editing: false, audio: false, tips: false,
  })

  useEffect(() => {
    apiFetch<TrendRadarData>("/scripts/trend-radar", getToken)
      .then(setTrendRadar)
      .catch(() => {})
    apiFetch<{ current: number }>("/streak", getToken)
      .then(data => setStreakDays(data.current))
      .catch(() => {})
  }, [getToken])

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="card-elevated p-10 text-center max-w-md">
        <div className="text-4xl mb-4">{"\u{1F4DD}"}</div>
        <h2 className="text-title-lg uppercase font-bold text-white mb-2">Complete your profile first</h2>
        <p className="text-body-sm text-text-muted mb-6">Set your niche so we can generate scripts tailored to your content.</p>
        <Link href="/onboarding" className="btn-primary">COMPLETE PROFILE {"\u2192"}</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-xs text-text-muted hover:text-white transition-colors mb-2 inline-block uppercase tracking-[1.5px]">{"\u2190"} Dashboard</Link>
            <h1 className="text-display-md uppercase font-bold text-white">Script Generator</h1>
            <p className="text-body-sm text-text-muted mt-1">Don{"\u2019"}t guess your next reel. We decide it.</p>
          </div>
          {step !== "idle" && (
            <button onClick={handleStartOver} className="btn-secondary h-10 px-4 text-xs">
              {"\u2728"} NEW SEARCH
            </button>
          )}
        </div>

        {/* Search form */}
        <div className="card-soft mb-8">
          <form onSubmit={handleSearch}>
            <label htmlFor="idea" className="label">
              What reel do you want to create?
            </label>
            <div className="flex gap-3">
              <input
                id="idea"
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. mini vlog for devops engineer, gym transformation reveal, cooking hack..."
                className="input flex-1"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !idea.trim()} className="btn-primary shrink-0">
                {loading && step === "idle" ? <Spinner /> : "\u{1F50D} SEARCH"}
              </button>
            </div>
          </form>
        </div>

        {/* Trend Radar */}
        {step === "idle" && trendRadar && trendRadar.clusters.length > 0 && (
          <div className="mb-6">
            <p className="spec-label mb-3">{"\u{1F525}"} Trending in your niche</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trendRadar.clusters.slice(0, 3).map((cluster) => (
                <div key={cluster.name} className="card">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white truncate">{cluster.name}</span>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">+{cluster.growthPercent}%</span>
                  </div>
                  {cluster.description && (
                    <p className="text-xs text-text-muted mb-2 line-clamp-2">{cluster.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {cluster.exampleHooks.slice(0, 2).map((h, i) => (
                      <span key={i} className="tag text-[10px] truncate max-w-[180px]">{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card p-8 mb-6 text-center">
            <Spinner />
            <p className="text-sm text-text-muted mt-3">Generating...</p>
          </div>
        )}

        {/* ═══ STEP 1: LIGHT SCRIPT VIEW (single script) ═══ */}
        {!loading && initialScript && step === "initial" && (
          <div className="space-y-4">
            <LightScriptCard
              script={initialScript}
              badge="Your Script"
              onViewGuide={() => handleViewFullGuide(initialScript)}
            />
            <button onClick={handleGenerateMore} disabled={loading} className="btn-secondary w-full">
              {loading ? <Spinner /> : "\u{1F504} GENERATE 3 MORE SCRIPTS"}
            </button>
          </div>
        )}

        {/* ═══ STEP 2: LIGHT SCRIPT VIEW (3 scripts) ═══ */}
        {!loading && moreScripts.length > 0 && step === "more" && (
          <div className="space-y-4">
            <p className="spec-label">Pick a script to get the full shooting guide</p>
            {moreScripts.map((script, idx) => {
              const isLocked = idx === 1 && streakDays < 3 ? "streak" : idx === 2 ? "premium" : null
              return (
                <div key={script.id} className="relative">
                  {isLocked ? (
                    <div className="card relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl mb-2">{isLocked === "streak" ? "\u{1F513}" : "\u{1F451}"}</p>
                          <p className="text-sm font-bold text-white mb-1">
                            {isLocked === "streak" ? `Unlock with Day 3 streak (${streakDays}/3)` : "Unlock with Premium"}
                          </p>
                          <p className="text-xs text-text-muted">
                            {isLocked === "streak" ? "Keep posting daily to unlock" : "Upgrade to access all scripts"}
                          </p>
                        </div>
                      </div>
                      <div className="opacity-30 pointer-events-none">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="tag tag-accent text-xs">Script {idx + 1}</span>
                        </div>
                        <h3 className="text-title-lg uppercase font-bold text-white mb-1">{script.hook}</h3>
                        <p className="text-body-sm text-text-body">{script.concept}</p>
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

        {/* ═══ STEP 3: FULL EXECUTION GUIDE ═══ */}
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
          <div className="card p-10 text-center">
            <div className="text-4xl mb-4">{"\u{1F3AC}"}</div>
            <h2 className="text-title-lg uppercase font-bold text-white mb-2">Don{"\u2019"}t guess your next reel</h2>
            <p className="text-body-sm text-text-muted max-w-md mx-auto">
              Type your idea above. We{"\u2019"}ll give you a script idea first, then a full shooting guide when you{"\u2019"}re ready.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// ═══ LIGHT SCRIPT CARD ═══════════════════════════════════════════════════════

function LightScriptCard({ script, badge, onViewGuide }: {
  script: DeepScript
  badge: string
  onViewGuide: () => void
}) {
  const viralityScore = getViralityScore(script)
  const difficulty = getDifficulty(script)
  const style = script.voiceType?.split("—")[0]?.split("--")[0]?.trim() || "Mixed"

  return (
    <div className="card">
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="tag tag-accent text-xs">{badge}</span>
        {script.trendBased && (
          <span className="tag text-xs border-amber-500 text-amber-400">{"\u{1F525}"} Trend-based</span>
        )}
        {script.trendCluster && (
          <span className="tag text-xs">{script.trendCluster}</span>
        )}
      </div>

      {/* Script Idea */}
      <div className="mb-4">
        <p className="spec-label mb-2">{"\u{1F3AF}"} Script Idea</p>
        <h3 className="text-title-lg uppercase font-bold text-white mb-2">{script.hook}</h3>
        <p className="text-body-sm text-text-body">{script.concept}</p>
      </div>

      {/* Style + Virality Score row */}
      <div className="flex items-center gap-3 mb-4">
        <span className="tag text-xs">{"\u{1F3A4}"} {style}</span>
        <span className="tag text-xs border-amber-500 text-amber-400">{viralityScore === 'Trending' ? '\u{1F525} Trending' : '\u2728 New'}</span>
      </div>

      {/* Quick Overview */}
      <div className="bg-surface-soft border border-hairline p-4 mb-4">
        <p className="spec-label mb-2">{"\u26A1"} Quick Overview</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-sm font-bold text-white">{script.duration || "20-25s"}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-[1px]">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">{difficulty}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-[1px]">Difficulty</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">{"\u{1F4F1}"} Phone</p>
            <p className="text-[10px] text-text-muted uppercase tracking-[1px]">Shoot Style</p>
          </div>
        </div>
      </div>

      {/* Why viral */}
      {script.whyViral && (
        <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 mb-4">
          <p className="text-xs text-emerald-400">{"\u{1F680}"} {script.whyViral}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={onViewGuide} className="btn-primary flex-1">
          {"\u2705"} VIEW FULL GUIDE
        </button>
      </div>
    </div>
  )
}

// ═══ FULL GUIDE VIEW ═════════════════════════════════════════════════════════

function FullGuideView({ guide, openSections, onToggleSection, onCopy, copied }: {
  guide: ExecutionGuide
  openSections: Record<string, boolean>
  onToggleSection: (key: string) => void
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Guide header */}
      <div className="card-elevated">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="tag text-xs border-amber-500 text-amber-400 mb-2 inline-block">Full Shooting Guide</span>
            <h2 className="text-title-lg uppercase font-bold text-white">{guide.title || guide.concept}</h2>
            <p className="text-body-sm text-text-muted mt-1">{guide.hook}</p>
          </div>
          <button onClick={onCopy} className="btn-secondary h-8 px-3 text-xs shrink-0">
            {copied ? "\u2713 COPIED" : "\u{1F4CB} COPY ALL"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="tag text-xs">{"\u23F1\uFE0F"} {guide.duration}</span>
          <span className="tag tag-accent text-xs">{"\u{1F3A4}"} {guide.voiceType.split("\u2014")[0].split("--")[0].trim()}</span>
        </div>
      </div>

      {/* Voice guidance */}
      <div className="card">
        <p className="spec-label mb-2">{"\u{1F3A4}"} Voice Guidance</p>
        <p className="text-body-sm text-text-body">{guide.voiceType}</p>
      </div>

      {/* Viral potential */}
      {guide.whyViral && (
        <div className="card border-emerald-500/30">
          <p className="spec-label text-emerald-400 mb-2">{"\u{1F680}"} Viral Potential</p>
          <p className="text-body-sm text-emerald-300">{guide.whyViral}</p>
        </div>
      )}

      {/* Scene Breakdown */}
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

      {/* Editing & Subtitles */}
      <CollapsibleSection
        title={"\u2702\uFE0F"} label="Editing Tips" open={openSections.editing} onToggle={() => onToggleSection("editing")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {guide.subtitlesSuggestion && (
            <div className="bg-surface-soft border border-hairline p-4">
              <p className="spec-label mb-1">{"\u{1F4DD}"} Subtitles</p>
              <p className="text-body-sm text-text-body">{guide.subtitlesSuggestion}</p>
            </div>
          )}
          {guide.editingNotes && (
            <div className="bg-surface-soft border border-hairline p-4">
              <p className="spec-label mb-1">{"\u2702\uFE0F"} Notes</p>
              <p className="text-body-sm text-text-body">{guide.editingNotes}</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Trending Audio */}
      <CollapsibleSection
        title={"\u{1F3B5}"} label="Trending Audio" count={guide.trendingAudio.length}
        open={openSections.audio} onToggle={() => onToggleSection("audio")}
      >
        <div className="space-y-1.5">
          {guide.trendingAudio.map((audio, i) => (
            <div key={i} className="flex items-start gap-2 bg-surface-soft border border-hairline px-3 py-2">
              <span className="text-accent text-xs mt-0.5">{"\u266A"}</span>
              <p className="text-xs text-text-body">{audio}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Pro Tips */}
      <CollapsibleSection
        title={"\u26A1"} label="Pro Tips" count={guide.proTips.length}
        open={openSections.tips} onToggle={() => onToggleSection("tips")}
      >
        <div className="space-y-1.5">
          {guide.proTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 bg-surface-soft border border-hairline px-3 py-2">
              <span className="text-amber-400 text-xs mt-0.5">{"\u26A1"}</span>
              <p className="text-xs text-text-body">{tip}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Why it works */}
      <div className="card">
        <p className="spec-label mb-2">{"\u{1F3AF}"} Why This Works</p>
        <div className="flex flex-wrap gap-1.5">
          {guide.whyItWorks.map((reason, i) => (
            <span key={i} className="tag text-xs border-emerald-500/30 text-emerald-400">{"\u2713"} {reason}</span>
          ))}
        </div>
      </div>

      {/* Caption & Hashtags */}
      <div className="card">
        <p className="spec-label mb-2">Caption</p>
        <p className="text-body-sm text-text-body mb-4">{guide.caption}</p>
        <div className="pt-3 border-t border-hairline">
          <p className="spec-label mb-2">Hashtags</p>
          <div className="flex flex-wrap gap-1.5">
            {guide.hashtags.map(tag => (
              <span key={tag} className="tag text-xs">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      {guide.callToAction && (
        <div className="card border-accent/30">
          <p className="text-sm font-bold text-accent">{guide.callToAction}</p>
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
    <div className="card overflow-hidden p-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left group">
        <div className="flex items-center gap-2">
          <span className="text-sm">{title}</span>
          <span className="text-xs font-bold text-white uppercase">{label}</span>
          {count !== undefined && (
            <span className="tag text-[10px]">{count}</span>
          )}
        </div>
        <span className={`text-xs text-text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}>{"\u25B6"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ═══ Scene Row ═══════════════════════════════════════════════════════════════

function SceneRow({ scene }: { scene: ScriptScene }) {
  return (
    <div className="bg-surface-soft border border-hairline p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 bg-accent/20 border border-accent text-xs font-bold text-accent">{scene.sceneNumber}</span>
        <span className="text-xs font-mono text-accent">{scene.timeRange}</span>
        <span className="text-xs text-text-muted">{"\u2022"}</span>
        <span className="text-sm font-bold text-white">{scene.title}</span>
      </div>
      <div className="grid gap-1.5 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-text-muted shrink-0 text-xs">{"\u{1F4F7}"}</span>
          <span className="text-text-body text-xs"><span className="text-text-muted">Shot:</span> {scene.shotType}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-text-muted shrink-0 text-xs">{"\u{1F4F9}"}</span>
          <span className="text-text-body text-xs"><span className="text-text-muted">Camera:</span> {scene.cameraSetup}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-text-muted shrink-0 text-xs">{"\u{1F3AC}"}</span>
          <span className="text-text-body text-xs">{scene.action}</span>
        </div>
        {scene.dialogue && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted shrink-0 text-xs">{"\u{1F4AC}"}</span>
            <span className="text-amber-400 italic text-xs">&ldquo;{scene.dialogue}&rdquo;</span>
          </div>
        )}
        {scene.textOverlay && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted shrink-0 text-xs">{"\u{1F4DD}"}</span>
            <span className="text-accent text-xs">Text: {scene.textOverlay}</span>
          </div>
        )}
        {scene.sound && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted shrink-0 text-xs">{"\u{1F50A}"}</span>
            <span className="text-text-muted text-xs">{scene.sound}</span>
          </div>
        )}
        {scene.lightingTip && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted shrink-0 text-xs">{"\u{1F4A1}"}</span>
            <span className="text-amber-300 text-xs">{scene.lightingTip}</span>
          </div>
        )}
        {scene.editingTip && (
          <div className="flex items-start gap-2">
            <span className="text-text-muted shrink-0 text-xs">{"\u2702\uFE0F"}</span>
            <span className="text-text-muted text-xs">{scene.editingTip}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="spinner" />
      <span className="text-sm">GENERATING...</span>
    </span>
  )
}
