'use client'

/**
 * Auth context — access token stored in memory only (never localStorage/sessionStorage).
 * Refresh token is stored in an httpOnly cookie managed by the API server.
 * Auto-refresh fires when the access token is within 60s of expiry or on a 401 response.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Creator {
  id: string
  email: string
  onboardingComplete?: boolean
  displayName?: string
  primaryNiche?: string
  secondaryNiche?: string
  instagramHandle?: string
  followerCountRange?: string
  primaryGoal?: string
}

interface AuthState {
  accessToken: string | null
  creator: Creator | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Returns a valid access token, refreshing if needed. */
  getToken: () => Promise<string | null>
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function msUntilExpiry(token: string): number {
  const exp = parseJwtExpiry(token)
  if (exp === null) return 0
  return exp - Date.now()
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    creator: null,
    isLoading: true,
  })

  // Ref so callbacks always see the latest token without stale closure issues
  const tokenRef = useRef<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ------------------------------------------------------------------
  // Core: call /auth/refresh and update state
  // ------------------------------------------------------------------
  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends httpOnly refresh-token cookie
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        // Refresh token invalid/expired — clear auth state
        tokenRef.current = null
        setState({ accessToken: null, creator: null, isLoading: false })
    window.location.href = '/login'
        return null
      }

      const data = (await res.json()) as { accessToken: string; creator?: Creator }
      tokenRef.current = data.accessToken
      setState((prev: AuthState) => ({
        ...prev,
        accessToken: data.accessToken,
        creator: data.creator ?? prev.creator,
        isLoading: false,
      }))
      scheduleRefresh(data.accessToken)
      return data.accessToken
    } catch {
      tokenRef.current = null
      setState({ accessToken: null, creator: null, isLoading: false })
    window.location.href = '/login'
      return null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Schedule a proactive refresh 60s before expiry
  // ------------------------------------------------------------------
  const scheduleRefresh = useCallback(
    (token: string) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      const delay = msUntilExpiry(token) - 60_000 // 60s before expiry
      if (delay > 0) {
        refreshTimerRef.current = setTimeout(() => {
          refresh()
        }, delay)
      }
    },
    [refresh],
  )

  // ------------------------------------------------------------------
  // getToken — returns current token or refreshes if near/past expiry
  // ------------------------------------------------------------------
  const getToken = useCallback(async (): Promise<string | null> => {
    const current = tokenRef.current
    if (!current) return refresh()
    if (msUntilExpiry(current) < 30_000) return refresh()
    return current
  }, [refresh])

  // ------------------------------------------------------------------
  // On mount: attempt a silent refresh to restore session
  // ------------------------------------------------------------------
  useEffect(() => {
    refresh()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [refresh])

  // ------------------------------------------------------------------
  // login
  // ------------------------------------------------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'invalid_credentials')
      }

      const data = (await res.json()) as { accessToken: string; creator: Creator }
      tokenRef.current = data.accessToken
      setState({ accessToken: data.accessToken, creator: data.creator, isLoading: false })
      scheduleRefresh(data.accessToken)
    },
    [scheduleRefresh],
  )

  // ------------------------------------------------------------------
  // register
  // ------------------------------------------------------------------
  const register = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
          minLength?: number
        }
        throw new Error(body.error ?? 'registration_failed')
      }

      const data = (await res.json()) as { accessToken: string; creator: Creator }
      tokenRef.current = data.accessToken
      setState({ accessToken: data.accessToken, creator: data.creator, isLoading: false })
      scheduleRefresh(data.accessToken)
    },
    [scheduleRefresh],
  )

  // ------------------------------------------------------------------
  // logout
  // ------------------------------------------------------------------
  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // best-effort
    }
    tokenRef.current = null
    setState({ accessToken: null, creator: null, isLoading: false })
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
