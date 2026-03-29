'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

/**
 * OAuth callback page.
 * After Google redirects here, the API has already set the httpOnly refresh cookie.
 * We call getToken() which triggers a /auth/refresh — this exchanges the cookie for
 * an access token. If the first attempt fails (cookie not yet propagated), we retry
 * once after a short delay.
 */
export default function OAuthCallbackPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    async function completeOAuth() {
      // First attempt
      let token = await getToken()

      // If first attempt fails, the cookie may not have propagated yet — retry after 500ms
      if (!token) {
        await new Promise(r => setTimeout(r, 500))
        token = await getToken()
      }

      if (token) {
        router.replace('/dashboard')
      } else {
        router.replace('/login?error=oauth_failed')
      }
    }

    completeOAuth()
  }, [getToken, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin" />
        <span className="text-sm text-white/40">Completing sign-in…</span>
      </div>
    </div>
  )
}
