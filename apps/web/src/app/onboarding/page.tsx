'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
type FollowerRange = 'under_1k' | '1k_10k' | '10k_100k' | 'over_100k'
interface OnboardingFormData { displayName: string; primaryNiche: string; secondaryNiche: string; instagramHandle: string; followerCountRange: FollowerRange | ''; primaryGoal: string }

const NICHES = ['fitness','finance','comedy','beauty','fashion','food','travel','tech','education','lifestyle','other']
const FOLLOWER_RANGES: { value: FollowerRange; label: string }[] = [
  { value: 'under_1k', label: 'Under 1K' }, { value: '1k_10k', label: '1K – 10K' },
  { value: '10k_100k', label: '10K – 100K' }, { value: 'over_100k', label: '100K+' },
]
const GOALS = ['Grow my audience','Monetize my content','Improve content quality','Build a personal brand','Drive traffic to my business']
const TOTAL_STEPS = 2

export default function OnboardingPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<OnboardingFormData>({ displayName: '', primaryNiche: '', secondaryNiche: '', instagramHandle: '', followerCountRange: '', primaryGoal: '' })

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = await getToken(); if (!token) { router.replace('/login'); return }
        const res = await fetch(`${API_BASE}/onboarding/profile`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const d = await res.json() as Partial<OnboardingFormData>; setForm(p => ({ ...p, displayName: d.displayName ?? '', primaryNiche: d.primaryNiche ?? '', secondaryNiche: d.secondaryNiche ?? '', instagramHandle: d.instagramHandle ?? '', followerCountRange: (d.followerCountRange as FollowerRange) ?? '', primaryGoal: d.primaryGoal ?? '' })) }
      } catch {} finally { setFetching(false) }
    }
    fetchProfile()
  }, [getToken, router])

  function update(field: keyof OnboardingFormData, value: string) { setForm(p => ({ ...p, [field]: value })); setFieldErrors(p => { const n = { ...p }; delete n[field]; return n }) }

  function validateStep1() { const e: Record<string, string> = {}; if (!form.displayName.trim()) e.displayName = 'Required'; if (!form.primaryNiche) e.primaryNiche = 'Required'; setFieldErrors(e); return !Object.keys(e).length }
  function validateStep2() { const e: Record<string, string> = {}; if (!form.followerCountRange) e.followerCountRange = 'Required'; if (!form.primaryGoal) e.primaryGoal = 'Required'; setFieldErrors(e); return !Object.keys(e).length }
  function handleNext(e: FormEvent) { e.preventDefault(); if (validateStep1()) setStep(2) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!validateStep2()) return
    setError(null); setLoading(true)
    try {
      const token = await getToken(); if (!token) { router.replace('/login'); return }
      const payload = { displayName: form.displayName.trim(), primaryNiche: form.primaryNiche, ...(form.secondaryNiche.trim() && { secondaryNiche: form.secondaryNiche.trim() }), ...(form.instagramHandle.trim() && { instagramHandle: form.instagramHandle.trim() }), followerCountRange: form.followerCountRange, primaryGoal: form.primaryGoal }
      const res = await fetch(`${API_BASE}/onboarding/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) { const body = await res.json().catch(() => ({})) as { error?: string; fields?: { field: string; message: string }[] }; if (body.fields) { const fe: Record<string, string> = {}; body.fields.forEach(f => { fe[f.field] = f.message }); setFieldErrors(fe) } else setError(body.error ?? 'Something went wrong.'); return }
      router.push('/dashboard')
    } catch { setError('Something went wrong.') } finally { setLoading(false) }
  }

  if (fetching) return <div className="min-h-screen flex items-center justify-center"><div className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" /><span className="text-sm text-white/40">Loading...</span></div></div>

  const inputCls = (err: boolean) => `w-full rounded-xl border ${err ? 'border-red-500/50' : 'border-white/10'} bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 backdrop-blur-sm transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20`

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12">
      <div className="orb w-[500px] h-[500px] bg-violet-600 top-[-150px] left-[-100px] animate-float" />
      <div className="orb w-[400px] h-[400px] bg-cyan-500 bottom-[-100px] right-[-80px] animate-float-delayed" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        <div className="glass-strong rounded-3xl p-8 sm:p-10">
          <div className="mb-6">
            <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">Step {step} of {TOTAL_STEPS}</p>
            <div className="flex gap-1 mb-5">{Array.from({ length: TOTAL_STEPS }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < step ? 'bg-gradient-to-r from-violet-500 to-cyan-500' : 'bg-white/10'}`} />)}</div>
            <h1 className="text-2xl font-bold text-white">{step === 1 ? 'Tell us about yourself' : 'Your goals & audience'}</h1>
            <p className="text-sm text-white/40 mt-1">{step === 1 ? 'Help us personalise your experience.' : 'Almost done — just a couple more details.'}</p>
          </div>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleNext} noValidate className="space-y-5">
              <div><label htmlFor="displayName" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Display name <span className="text-red-400">*</span></label><input id="displayName" type="text" value={form.displayName} onChange={e => update('displayName', e.target.value)} placeholder="e.g. Alex Rivera" className={inputCls(!!fieldErrors.displayName)} />{fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>}</div>
              <div><label htmlFor="primaryNiche" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Primary niche <span className="text-red-400">*</span></label><select id="primaryNiche" value={form.primaryNiche} onChange={e => update('primaryNiche', e.target.value)} className={inputCls(!!fieldErrors.primaryNiche)}><option value="">Select a niche...</option>{NICHES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}</select>{fieldErrors.primaryNiche && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryNiche}</p>}</div>
              <div><label htmlFor="secondaryNiche" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Secondary niche <span className="text-white/20 normal-case tracking-normal">(optional)</span></label><select id="secondaryNiche" value={form.secondaryNiche} onChange={e => update('secondaryNiche', e.target.value)} className={inputCls(false)}><option value="">None</option>{NICHES.filter(n => n !== form.primaryNiche).map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}</select></div>
              <button type="submit" className="btn-premium w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white">Next</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="instagramHandle" className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Instagram handle <span className="text-white/20 normal-case tracking-normal">(optional)</span></label>
                <div className="flex"><span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-white/30 text-sm">@</span><input id="instagramHandle" type="text" value={form.instagramHandle} onChange={e => update('instagramHandle', e.target.value)} placeholder="yourhandle" className="flex-1 rounded-r-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 transition focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 hover:border-white/20" /></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Follower range <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">{FOLLOWER_RANGES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => update('followerCountRange', value)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-all ${form.followerCountRange === value ? 'border-violet-500/50 bg-violet-500/10 text-violet-300' : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'}`}>{label}</button>
                ))}</div>
                {fieldErrors.followerCountRange && <p className="mt-1 text-xs text-red-400">{fieldErrors.followerCountRange}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Primary goal <span className="text-red-400">*</span></label>
                <div className="space-y-2">{GOALS.map(goal => (
                  <button key={goal} type="button" onClick={() => update('primaryGoal', goal)} className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition-all ${form.primaryGoal === goal ? 'border-violet-500/50 bg-violet-500/10 text-violet-300' : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'}`}>{goal}</button>
                ))}</div>
                {fieldErrors.primaryGoal && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryGoal}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)} className="flex-1 glass rounded-xl px-4 py-3.5 text-sm font-semibold text-white/60 hover:text-white transition">Back</button>
                <button type="submit" disabled={loading} className="flex-1 btn-premium rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
                  {loading ? 'Saving...' : 'Finish setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
