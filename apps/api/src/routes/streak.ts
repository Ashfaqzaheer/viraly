import { Router, Request, Response } from 'express'
import { recordDailyAction, getStreak } from '../services/streak'

const router = Router()

// ---------------------------------------------------------------------------
// POST /streak/action
// Records a daily action for the authenticated creator.
// Requirements: 4.1, 4.2
// ---------------------------------------------------------------------------
router.post('/action', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const state = await recordDailyAction(creatorId)
  res.status(200).json(state)
})

// ---------------------------------------------------------------------------
// GET /streak
// Returns the current streak state for the authenticated creator.
// Requirements: 4.1, 4.5
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const state = await getStreak(creatorId)
  res.status(200).json(state)
})

export default router
