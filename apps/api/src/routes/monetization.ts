/**
 * Monetization Coach routes.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
import { Router, Request, Response } from 'express'
import { getModules, completeLesson, getOverallProgress } from '../services/monetization'

const router = Router()

// ---------------------------------------------------------------------------
// GET /monetization/modules
// Returns all modules with lessons and per-module completion percent.
// Requirements: 10.1, 10.2, 10.5
// ---------------------------------------------------------------------------
router.get('/modules', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const modules = await getModules(creatorId)
  res.status(200).json({ modules })
})

// ---------------------------------------------------------------------------
// POST /monetization/lessons/:lessonId/complete
// Marks a lesson as completed for the authenticated creator.
// Requirements: 10.3
// ---------------------------------------------------------------------------
router.post('/lessons/:lessonId/complete', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { lessonId } = req.params
  if (!lessonId) {
    res.status(400).json({ error: 'bad_request', message: 'lessonId is required' })
    return
  }

  await completeLesson(creatorId, lessonId)
  res.status(200).json({ completed: true })
})

// ---------------------------------------------------------------------------
// GET /monetization/progress
// Returns overall completion percentage across all lessons.
// Requirements: 10.4
// ---------------------------------------------------------------------------
router.get('/progress', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const percent = await getOverallProgress(creatorId)
  res.status(200).json({ percent })
})

export default router
