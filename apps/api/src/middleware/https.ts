import { Request, Response, NextFunction } from 'express'

/**
 * HTTPS enforcement middleware.
 * Redirects HTTP requests to HTTPS in production.
 * Requirement 11.6
 */
export function httpsEnforcement(req: Request, res: Response, next: NextFunction): void {
  // In production, enforce HTTPS via x-forwarded-proto (set by load balancers/proxies)
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto']
    if (proto && proto !== 'https') {
      res.redirect(301, `https://${req.headers.host}${req.url}`)
      return
    }
  }
  next()
}
