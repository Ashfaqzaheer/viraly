'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: 'An account with this email already exists.',
  password_too_short: 'Password must be at least 8 characters.',
  registration_failed: 'Registration failed. Please try again.',
}

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(ERROR_MESSAGES.password_too_short)
      return
    }

    setLoading(true)
    try {
      await register(email, password)
      router.push('/onboarding')
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'registration_failed'
      setError(ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleRegister() {
    window.location.href = `${API_BASE}/auth/google`
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000000' }}>
      <div className="w-full max-w-[440px]">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <Link href="/" className="wordmark inline-block">VIRALY</Link>
          <p className="caption-upper mt-3">YOUR CREATOR TOOLKIT</p>
        </div>

        {/* Card */}
        <div style={{ background: '#141414', border: '1px solid #262626', padding: '48px' }}>
          <div className="text-center mb-8">
            <h4>Create account</h4>
            <p className="mt-2 text-sm text-muted">Start growing your audience with AI</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div>
              <label htmlFor="email" className="field-label">EMAIL</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                PASSWORD <span className="text-muted" style={{ textTransform: 'none', letterSpacing: '0' }}>(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  key={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="progress-track flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-[2px] flex-1 transition-all duration-300"
                        style={{
                          background: level <= passwordStrength.level
                            ? passwordStrength.level <= 1 ? '#ef4444' : passwordStrength.level <= 2 ? '#f59e0b' : passwordStrength.level <= 3 ? '#8b5cf6' : '#34d399'
                            : '#262626'
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{
                    color: passwordStrength.level <= 1 ? '#ef4444' : passwordStrength.level <= 2 ? '#f59e0b' : passwordStrength.level <= 3 ? '#8b5cf6' : '#34d399'
                  }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  CREATING ACCOUNT...
                </span>
              ) : (
                'CREATE ACCOUNT'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#262626' }} />
            <span className="caption-upper">OR</span>
            <div className="flex-1 h-px" style={{ background: '#262626' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="btn-ghost w-full gap-3"
          >
            <GoogleIcon />
            CONTINUE WITH GOOGLE
          </button>

          <p className="mt-8 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:text-white transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function getPasswordStrength(pw: string): { level: number; label: string } {
  if (pw.length === 0) return { level: 0, label: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { level: 1, label: 'Weak' }
  if (score <= 2) return { level: 2, label: 'Fair' }
  if (score <= 3) return { level: 3, label: 'Strong' }
  return { level: 4, label: 'Very strong' }
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  )
}
