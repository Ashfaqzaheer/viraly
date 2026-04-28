import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '@viraly/db'
import { issueTokens } from '../utils/tokens'

const router = Router()

const BCRYPT_COST = 12
const REFRESH_COOKIE_NAME = 'refresh_token'
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

function setRefreshCookie(res: Response, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
}

// ---------------------------------------------------------------------------
// POST /auth/register
// Requirements: 1.1, 1.3, 1.8
// ---------------------------------------------------------------------------
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'password_too_short', minLength: 8 })
    return
  }

  if (!email) {
    res.status(400).json({ error: 'validation_failed', fields: [{ field: 'email', message: 'email is required' }] })
    return
  }

  // Check email uniqueness
  const existing = await prisma.creator.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'email_taken' })
    return
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

  const creator = await prisma.creator.create({
    data: { email, passwordHash },
  })

  const { accessToken, refreshToken } = await issueTokens(creator.id, creator.email)

  setRefreshCookie(res, refreshToken)

  res.status(201).json({
    accessToken,
    creator: { id: creator.id, email: creator.email, onboardingComplete: false },
  })
})

// ---------------------------------------------------------------------------
// POST /auth/login
// Requirements: 1.4, 1.6
// ---------------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string }

  const start = Date.now()

  const invalidCredentials = async (): Promise<void> => {
    // Ensure response takes at least 500ms to prevent timing attacks (Req 1.6)
    const elapsed = Date.now() - start
    const remaining = 500 - elapsed
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }
    res.status(401).json({ error: 'invalid_credentials' })
  }

  if (!email || !password) {
    await invalidCredentials()
    return
  }

  const creator = await prisma.creator.findUnique({ where: { email } })
  if (!creator || !creator.passwordHash) {
    await invalidCredentials()
    return
  }

  const passwordMatch = await bcrypt.compare(password, creator.passwordHash)
  if (!passwordMatch) {
    await invalidCredentials()
    return
  }

  const { accessToken, refreshToken } = await issueTokens(creator.id, creator.email)

  setRefreshCookie(res, refreshToken)

  res.status(200).json({
    accessToken,
    creator: {
      id: creator.id, email: creator.email, onboardingComplete: creator.onboardingComplete,
      displayName: creator.displayName, primaryNiche: creator.primaryNiche,
      secondaryNiche: creator.secondaryNiche, instagramHandle: creator.instagramHandle,
      followerCountRange: creator.followerCountRange, primaryGoal: creator.primaryGoal,
    },
  })
})

// ---------------------------------------------------------------------------
// POST /auth/refresh
// Requirements: 1.5
// ---------------------------------------------------------------------------
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined

  if (!refreshToken) {
    res.status(401).json({ error: 'invalid_refresh_token' })
    return
  }

  const session = await prisma.session.findUnique({ where: { refreshToken } })

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: 'invalid_refresh_token' })
    return
  }

  const creator = await prisma.creator.findUnique({ where: { id: session.creatorId } })
  if (!creator) {
    res.status(401).json({ error: 'invalid_refresh_token' })
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'server_error' })
    return
  }

  const jwt = await import('jsonwebtoken')
  const accessToken = jwt.default.sign({ sub: creator.id, email: creator.email }, secret, {
    expiresIn: '15m',
  })

  res.status(200).json({
    accessToken,
    creator: {
      id: creator.id, email: creator.email, onboardingComplete: creator.onboardingComplete,
      displayName: creator.displayName, primaryNiche: creator.primaryNiche,
      secondaryNiche: creator.secondaryNiche, instagramHandle: creator.instagramHandle,
      followerCountRange: creator.followerCountRange, primaryGoal: creator.primaryGoal,
    },
  })
})

// ---------------------------------------------------------------------------
// POST /auth/logout
// Requirements: 1.7
// ---------------------------------------------------------------------------
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined

  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } })
  }

  clearRefreshCookie(res)
  res.status(204).send()
})

// ---------------------------------------------------------------------------
// GET /auth/google
// Initiates Google OAuth flow — redirects user to Google consent screen
// Requirements: 1.2
// ---------------------------------------------------------------------------
router.get('/google', (_req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    res.status(500).json({ error: 'oauth_not_configured', message: 'Google OAuth credentials are not set. Add GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.' })
    return
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

// ---------------------------------------------------------------------------
// GET /auth/google/callback
// Requirements: 1.2
// ---------------------------------------------------------------------------
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query as { code?: string }

  if (!code) {
    res.status(400).json({ error: 'missing_code', message: 'OAuth authorization code is required' })
    return
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).json({ error: 'server_error', message: 'Google OAuth not configured' })
    return
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    res.status(401).json({ error: 'oauth_failed', message: 'Failed to exchange authorization code' })
    return
  }

  const tokenData = await tokenResponse.json() as { access_token?: string }
  const googleAccessToken = tokenData.access_token

  if (!googleAccessToken) {
    res.status(401).json({ error: 'oauth_failed', message: 'No access token returned from Google' })
    return
  }

  // Fetch user info from Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  })

  if (!userInfoResponse.ok) {
    res.status(401).json({ error: 'oauth_failed', message: 'Failed to fetch user info from Google' })
    return
  }

  const userInfo = await userInfoResponse.json() as { id?: string; email?: string }
  const { id: googleId, email } = userInfo

  if (!googleId || !email) {
    res.status(401).json({ error: 'oauth_failed', message: 'Incomplete user info from Google' })
    return
  }

  // Upsert Creator: find by googleId, or by email (then attach googleId), or create new
  let creator = await prisma.creator.findUnique({ where: { googleId } })

  if (!creator) {
    // Try to find by email and attach googleId
    const byEmail = await prisma.creator.findUnique({ where: { email } })
    if (byEmail) {
      creator = await prisma.creator.update({
        where: { id: byEmail.id },
        data: { googleId },
      })
    } else {
      // Create new creator
      creator = await prisma.creator.create({
        data: { email, googleId },
      })
    }
  }

  const { accessToken, refreshToken } = await issueTokens(creator.id, creator.email)

  setRefreshCookie(res, refreshToken)

  // Redirect to frontend callback page — the cookie is set, frontend will do a silent refresh
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  res.redirect(`${frontendUrl}/auth/callback`)
})

export default router
