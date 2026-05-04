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

  if (fetching) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}><span className="spinner" /></div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#000000' }}>
      <div className="w-full max-w-[560px]">
        <div style={{ background: '#141414', border: '1px solid #262626', padding: '48px' }}>
          {/* Progress */}
          <div className="mb-8">
            <p className="caption-upper text-accent mb-3">STEP {step} OF {TOTAL_STEPS}</p>
            <div className="progress-track flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className="flex-1 h-[2px] transition-all duration-500" style={{ background: i < step ? '#8b5cf6' : '#262626' }} />
              ))}
            </div>
            <h4 className="mt-5">{step === 1 ? 'Tell us about yourself' : 'Your goals & audience'}</h4>
            <p className="text-sm text-muted mt-2" style={{ fontWeight: 300 }}>{step === 1 ? 'Help us personalise your experience.' : 'Almost done — just a couple more details.'}</p>
          </div>

          {error && <div role="alert" className="mb-5 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleNext} noValidate className="space-y-6">
              <div>
                <label htmlFor="displayName" className="field-label">DISPLAY NAME <span className="text-red-400">*</span></label>
                <input id="displayName" type="text" value={form.displayName} onChange={e => update('displayName', e.target.value)} placeholder="e.g. Alex Rivera" className={`input ${fieldErrors.displayName ? 'border-b-red-500' : ''}`} />
                {fieldErrors.displayName && <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>}
              </div>
              <div>
                <label htmlFor="primaryNiche" className="field-label">PRIMARY NICHE <span className="text-red-400">*</span></label>
                <select id="primaryNiche" value={form.primaryNiche} onChange={e => update('primaryNiche', e.target.value)} className={`input ${fieldErrors.primaryNiche ? 'border-b-red-500' : ''}`}>
                  <option value="">Select a niche...</option>
                  {NICHES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
                {fieldErrors.primaryNiche && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryNiche}</p>}
              </div>
              <div>
                <label htmlFor="secondaryNiche" className="field-label">SECONDARY NICHE <span className="text-muted" style={{ textTransform: 'none', letterSpacing: '0' }}>(optional)</span></label>
                <select id="secondaryNiche" value={form.secondaryNiche} onChange={e => update('secondaryNiche', e.target.value)} className="input">
                  <option value="">None</option>
                  {NICHES.filter(n => n !== form.primaryNiche).map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">NEXT</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div>
                <label htmlFor="instagramHandle" className="field-label">INSTAGRAM HANDLE <span className="text-muted" style={{ textTransform: 'none', letterSpacing: '0' }}>(optional)</span></label>
                <div className="flex items-end gap-2">
                  <span className="text-sm text-muted pb-2">@</span>
                  <input id="instagramHandle" type="text" value={form.instagramHandle} onChange={e => update('instagramHandle', e.target.value)} placeholder="yourhandle" className="input flex-1" />
                </div>
              </div>
              <div>
                <label className="field-label">FOLLOWER RANGE <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-px" style={{ background: '#262626' }}>
                  {FOLLOWER_RANGES.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => update('followerCountRange', value)}
                      className="text-left transition-colors" style={{
                        background: '#000000', padding: '20px 24px',
                        border: form.followerCountRange === value ? '1px solid #8b5cf6' : 'none',
                        color: form.followerCountRange === value ? '#8b5cf6' : '#999999',
                        fontSize: '12px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px'
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                {fieldErrors.followerCountRange && <p className="mt-1 text-xs text-red-400">{fieldErrors.followerCountRange}</p>}
              </div>
              <div>
                <label className="field-label">PRIMARY GOAL <span className="text-red-400">*</span></label>
                <div className="grid gap-px" style={{ background: '#262626' }}>
                  {GOALS.map(goal => (
                    <button key={goal} type="button" onClick={() => update('primaryGoal', goal)}
                      className="w-full text-left transition-colors" style={{
                        background: '#000000', padding: '20px 24px',
                        border: form.primaryGoal === goal ? '1px solid #8b5cf6' : 'none',
                        color: form.primaryGoal === goal ? '#8b5cf6' : '#999999',
                        fontSize: '13px', fontWeight: 300
                      }}>
                      {goal}
                    </button>
                  ))}
                </div>
                {fieldErrors.primaryGoal && <p className="mt-1 text-xs text-red-400">{fieldErrors.primaryGoal}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">BACK</button>
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
