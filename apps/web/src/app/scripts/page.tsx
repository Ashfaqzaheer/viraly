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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}><span className="spinner" /></div>}>
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}>
      <div className="text-center max-w-md" style={{ background: '#141414', border: '1px solid #262626', padding: '48px' }}>
        <h4 className="mb-3">Complete your profile first</h4>
        <p className="text-sm text-muted mb-6" style={{ fontWeight: 300 }}>Set your niche so we can generate scripts tailored to your content.</p>
        <Link href="/onboarding" className="btn-primary">COMPLETE PROFILE</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px', paddingBottom: '120px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="nav-item text-xs mb-2 inline-block">{"\u2190"} DASHBOARD</Link>
            <p className="section-label mb-2">CONTENT ENGINE</p>
            <h3>Script generator</h3>
          </div>
          {step !== "idle" && (
            <button onClick={handleStartOver} className="btn-ghost">NEW SEARCH</button>
          )}
        </div>

        {/* Search form — input band */}
        <div className="mb-10" style={{ background: '#0d0d0d', borderTop: '1px solid #262626', borderBottom: '1px solid #262626', padding: '32px 0' }}>
          <form onSubmit={handleSearch}>
            <label htmlFor="idea" className="field-label">WHAT REEL DO YOU WANT TO CREATE?</label>
            <div className="flex gap-4 items-end">
              <input id="idea" type="text" value={idea} onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. mini vlog for devops engineer, gym transformation reveal..."
                className="input flex-1" disabled={loading} />
              <button type="submit" disabled={loading || !idea.trim()} className="btn-primary shrink-0">
                {loading && step === "idle" ? <span className="spinner" /> : "GENERATE"}
              </button>
            </div>
          </form>
        </div>

        {/* Trend Radar */}
        {step === "idle" && trendRadar && trendRadar.clusters.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-4">TRENDING IN YOUR NICHE</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: '#262626' }}>
              {trendRadar.clusters.slice(0, 3).map((cluster) => (
                <div key={cluster.name} style={{ background: '#141414', padding: '20px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white" style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{cluster.name}</span>
                    <span className="text-xs text-emerald-400">+{cluster.growthPercent}%</span>
                  </div>
                  {cluster.description && <p className="text-xs text-muted mb-2" style={{ fontWeight: 300 }}>{cluster.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {cluster.exampleHooks.slice(0, 2).map((h, i) => <span key={i} className="tag text-[10px] truncate max-w-[180px]">{h}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div role="alert" className="mb-6 border border-red-500/30 p-4 text-center"><p className="text-sm text-red-400">{error}</p></div>}
        {loading && <div className="p-8 mb-6 text-center"><span className="spinner" /><p className="text-sm text-muted mt-3">Generating...</p></div>}

        {/* STEP 1: Single script */}
        {!loading && initialScript && step === "initial" && (
          <div className="space-y-6">
            <ScriptCard script={initialScript} badge="YOUR SCRIPT" onViewGuide={() => handleViewFullGuide(initialScript)} />
            <button onClick={handleGenerateMore} disabled={loading} className="btn-ghost w-full">GENERATE 3 MORE SCRIPTS</button>
          </div>
        )}

        {/* STEP 2: Multiple scripts */}
        {!loading && moreScripts.length > 0 && step === "more" && (
          <div className="space-y-6">
            <p className="section-label">PICK A SCRIPT FOR THE FULL GUIDE</p>
            {moreScripts.map((script, idx) => {
              const isLocked = idx === 1 && streakDays < 3 ? "streak" : idx === 2 ? "premium" : null
              return (
                <div key={script.id} className="relative">
                  {isLocked ? (
                    <div className="relative overflow-hidden" style={{ background: '#141414', border: '1px solid #262626', padding: '24px' }}>
                      <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <div className="text-center">
                          <p className="caption-upper text-white mb-1">{isLocked === "streak" ? `UNLOCK AT DAY 3 (${streakDays}/3)` : "PREMIUM ONLY"}</p>
                          <p className="text-xs text-muted" style={{ fontWeight: 300 }}>{isLocked === "streak" ? "Keep posting daily" : "Upgrade to access"}</p>
                        </div>
                      </div>
                      <div className="opacity-20 pointer-events-none">
                        <h5 className="mb-1">{script.hook}</h5>
                        <p className="text-sm text-muted">{script.concept}</p>
                      </div>
                    </div>
                  ) : (
                    <ScriptCard script={script} badge={`SCRIPT ${idx + 1}`} onViewGuide={() => handleViewFullGuide(script)} />
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
          <div className="text-center" style={{ padding: '64px 0' }}>
            <h5 className="mb-3">Don{"\u2019"}t guess your next reel</h5>
            <p className="text-sm text-muted max-w-md mx-auto" style={{ fontWeight: 300 }}>Type your idea above. We'll give you a script idea first, then a full shooting guide when you're ready.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ScriptCard({ script, badge, onViewGuide }: { script: DeepScript; badge: string; onViewGuide: () => void }) {
  const difficulty = getDifficulty(script)
  return (
    <div style={{ background: '#141414', border: '1px solid #262626', padding: '32px' }}>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="tag-accent">{badge}</span>
        {script.trendBased && <span className="tag">TREND-BASED</span>}
      </div>
      <h5 className="mb-2">{script.hook}</h5>
      <p className="text-sm text-body mb-4" style={{ fontWeight: 300 }}>{script.concept}</p>
      <div className="flex items-center gap-3 mb-4">
        <span className="tag">{script.duration || "20-25s"}</span>
        <span className="tag">{difficulty}</span>
      </div>
      {script.whyViral && <p className="text-xs text-emerald-400 mb-4" style={{ fontWeight: 300 }}>{script.whyViral}</p>}
      <button onClick={onViewGuide} className="btn-primary">VIEW FULL GUIDE</button>
    </div>
  )
}

function FullGuideView({ guide, openSections, onToggleSection, onCopy, copied }: { guide: ExecutionGuide; openSections: Record<string, boolean>; onToggleSection: (key: string) => void; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-6">
      <div className="streak-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="tag-accent mb-3 inline-block">FULL SHOOTING GUIDE</span>
            <h5>{guide.title || guide.concept}</h5>
            <p className="text-sm text-body mt-2" style={{ fontWeight: 300 }}>{guide.hook}</p>
          </div>
          <button onClick={onCopy} className="btn-ghost text-xs">{copied ? "COPIED" : "COPY ALL"}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="tag">{guide.duration}</span>
          <span className="tag-accent">{guide.voiceType.split("\u2014")[0].split("--")[0].trim()}</span>
        </div>
      </div>

      {guide.whyViral && (
        <div style={{ borderLeft: '2px solid #34d399', paddingLeft: '16px' }}>
          <p className="caption-upper text-emerald-400 mb-1">VIRAL POTENTIAL</p>
          <p className="text-sm text-emerald-300" style={{ fontWeight: 300 }}>{guide.whyViral}</p>
        </div>
      )}

      <CollapsibleSection label="SCENE BREAKDOWN" count={guide.scenes.length} open={openSections.scenes} onToggle={() => onToggleSection("scenes")}>
        <div className="space-y-4">
          {guide.scenes.map((scene) => (
            <div key={scene.sceneNumber} style={{ padding: '16px 0', borderBottom: '1px solid #262626' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="caption-upper text-accent">{String(scene.sceneNumber).padStart(2, '0')}</span>
                <h6>{scene.title}</h6>
                <span className="caption-upper">{scene.timeRange}</span>
              </div>
              <p className="text-sm text-body mb-1" style={{ fontWeight: 300 }}>{scene.action}</p>
              {scene.dialogue && <p className="text-sm text-amber-400 italic" style={{ fontWeight: 300 }}>&ldquo;{scene.dialogue}&rdquo;</p>}
              {scene.textOverlay && <p className="text-xs text-accent mt-1" style={{ fontWeight: 300 }}>Text: {scene.textOverlay}</p>}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="EDITING TIPS" open={openSections.editing} onToggle={() => onToggleSection("editing")}>
        <div className="space-y-3">
          {guide.subtitlesSuggestion && <div><p className="caption-upper mb-1">SUBTITLES</p><p className="text-sm text-body" style={{ fontWeight: 300 }}>{guide.subtitlesSuggestion}</p></div>}
          {guide.editingNotes && <div><p className="caption-upper mb-1">NOTES</p><p className="text-sm text-body" style={{ fontWeight: 300 }}>{guide.editingNotes}</p></div>}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="TRENDING AUDIO" count={guide.trendingAudio.length} open={openSections.audio} onToggle={() => onToggleSection("audio")}>
        <div className="space-y-2">
          {guide.trendingAudio.map((audio, i) => <p key={i} className="text-sm text-body" style={{ fontWeight: 300, borderBottom: '1px solid #262626', paddingBottom: '8px' }}>{audio}</p>)}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="PRO TIPS" count={guide.proTips.length} open={openSections.tips} onToggle={() => onToggleSection("tips")}>
        <div className="space-y-2">
          {guide.proTips.map((tip, i) => <p key={i} className="text-sm text-body" style={{ fontWeight: 300, borderBottom: '1px solid #262626', paddingBottom: '8px' }}>{tip}</p>)}
        </div>
      </CollapsibleSection>

      <div style={{ borderTop: '1px solid #262626', paddingTop: '24px' }}>
        <p className="caption-upper mb-2">WHY THIS WORKS</p>
        <div className="flex flex-wrap gap-2">
          {guide.whyItWorks.map((reason, i) => <span key={i} className="tag text-emerald-400">{reason}</span>)}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #262626', paddingTop: '24px' }}>
        <p className="caption-upper mb-2">CAPTION</p>
        <p className="text-sm text-body mb-4" style={{ fontWeight: 300 }}>{guide.caption}</p>
        <div className="flex flex-wrap gap-1.5">
          {guide.hashtags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
        </div>
      </div>

      {guide.callToAction && (
        <div style={{ borderTop: '1px solid #262626', paddingTop: '24px' }}>
          <p className="text-sm text-accent" style={{ fontWeight: 400 }}>{guide.callToAction}</p>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ label, count, open, onToggle, children }: { label: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #262626' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between py-5 text-left">
        <div className="flex items-center gap-3">
          <span className="caption-upper">{label}</span>
          {count !== undefined && <span className="tag text-[10px]">{count}</span>}
        </div>
        <span className={`text-xs text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}>{"\u25B6"}</span>
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  )
}
