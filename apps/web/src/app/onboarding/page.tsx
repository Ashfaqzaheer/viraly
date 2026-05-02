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

  if (fetching) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="flex items-center gap-3"><span className="spinner" /><span className="text-sm text-text-muted">Loading...</span></div></div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-black">
      <div className="w-full max-w-lg">
        <div className="bg-surface-card border border-hairline p-8 sm:p-10">
          <div className="mb-6">
            <p className="spec-label text-accent mb-2">Step {step} of {TOTAL_STEPS}</p>
            <div className="flex gap-1 mb-5">{Array.from({ length: TOTAL_STEPS }).map((_, i) => <div key={i} className={`h-1 flex-1 transition-all duration-500 ${i < step ? 'bg-accent' : 'bg-hairline'}`} />)}</div>
            <h1 className="text-display-sm uppercase font-bold text-white">{step === 1 ? 'Tell Us About Yourself' : 'Your Goals & Audience'}</h1>
            <p className="text-body-sm text-text-muted mt-1">{step === 1 ? 'Help us personalise your experience.' : 'Almost done — just a couple more details.'}</p>
          </div>

          {error && <div role="alert" className="mb-5 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleNext} noValidate className="space-y-5">
              <div><label htmlFor="displayName" className="label">Display name <span className="text-red-400">*</span></label><input id="displayName" type="text" value={form.displayName} onChange={e => update('displayName', e.target.value)} placeholder="e.g. Alex Rivera" className={`input ${fieldErrors.displayName ? 'border-red-500' : ''}`} />{fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>}</div>
              <div><label htmlFor="primaryNiche" className="label">Primary niche <span className="text-red-400">*</span></label><select id="primaryNiche" value={form.primaryNiche} onChange={e => update('primaryNiche', e.target.value)} className={`input ${fieldErrors.primaryNiche ? 'border-red-500' : ''}`}><option value="">Select a niche...</option>{NICHES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}</select>{fieldErrors.primaryNiche && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryNiche}</p>}</div>
              <div><label htmlFor="secondaryNiche" className="label">Secondary niche <span className="text-text-muted normal-case tracking-normal font-normal">(optional)</span></label><select id="secondaryNiche" value={form.secondaryNiche} onChange={e => update('secondaryNiche', e.target.value)} className="input"><option value="">None</option>{NICHES.filter(n => n !== form.primaryNiche).map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}</select></div>
              <button type="submit" className="btn-primary w-full">NEXT</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="instagramHandle" className="label">Instagram handle <span className="text-text-muted normal-case tracking-normal font-normal">(optional)</span></label>
                <div className="flex"><span className="inline-flex items-center px-3 border border-r-0 border-hairline bg-surface-soft text-text-muted text-sm">@</span><input id="instagramHandle" type="text" value={form.instagramHandle} onChange={e => update('instagramHandle', e.target.value)} placeholder="yourhandle" className="input flex-1" /></div>
              </div>
              <div>
                <label className="label">Follower range <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">{FOLLOWER_RANGES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => update('followerCountRange', value)} className={`border px-3 py-2.5 text-sm font-bold text-left transition-colors ${form.followerCountRange === value ? 'border-accent text-accent bg-accent/10' : 'border-hairline bg-surface-soft text-text-muted hover:border-white hover:text-white'}`}>{label}</button>
                ))}</div>
                {fieldErrors.followerCountRange && <p className="mt-1 text-xs text-red-400">{fieldErrors.followerCountRange}</p>}
              </div>
              <div>
                <label className="label">Primary goal <span className="text-red-400">*</span></label>
                <div className="space-y-2">{GOALS.map(goal => (
                  <button key={goal} type="button" onClick={() => update('primaryGoal', goal)} className={`w-full border px-4 py-2.5 text-sm font-bold text-left transition-colors ${form.primaryGoal === goal ? 'border-accent text-accent bg-accent/10' : 'border-hairline bg-surface-soft text-text-muted hover:border-white hover:text-white'}`}>{goal}</button>
                ))}</div>
                {fieldErrors.primaryGoal && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryGoal}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">BACK</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'SAVING...' : 'FINISH SETUP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
