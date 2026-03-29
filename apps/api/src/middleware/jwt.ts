import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  sub: string   // creator ID
  email: string
  iat: number
  exp: number
}

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      creator?: JWTPayload
    }
  }
}

/**
 * Public endpoints that do not require JWT verification.
 * Requirement 11.5
 */
const PUBLIC_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google',
  '/auth/google/callback',
  '/auth/google/callback/dev',
  '/health',
]

/**
 * JWT verification middleware.
 * Skips verification for public endpoints.
 * Requirement 11.5
 */
export function jwtVerification(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.includes(req.path)) {
    return next()
  }

  const authHeader = req.headers.authorization

  // Debug mode: log masked headers to verify header arrival
  if (process.env.AUTH_DEBUG === 'true') {
    const masked = authHeader
      ? `Bearer ${authHeader.slice(7, 15)}...${authHeader.slice(-4)}`
      : '(missing)'
    console.log(`[AUTH_DEBUG] ${req.method} ${req.path} | Authorization: ${masked}`)
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({ error: 'server_error', message: 'JWT secret not configured' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as JWTPayload
    req.creator = payload
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'token_expired' })
    } else {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid token' })
    }
  }
}
