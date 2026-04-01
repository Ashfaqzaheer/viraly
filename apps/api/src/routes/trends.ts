/**
 * Trend Radar route — GET /trends
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */
import { Router, Request, Response } from 'express'
import { getTrends } from '../services/trends'

const router = Router()

// ---------------------------------------------------------------------------
// GET /trends
// Returns non-stale trends, optionally filtered by ?niche=
// Requires JWT (enforced by global middleware).
// Requirements: 7.1, 7.3, 7.4, 7.5
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const niche = typeof req.query.niche === 'string' ? req.query.niche : undefined

  const { trends, isFallback } = await getTrends(niche)
  res.status(200).json({ trends, isFallback })
})

export default router
