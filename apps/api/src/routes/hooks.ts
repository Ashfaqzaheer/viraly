/**
 * Hook Library routes.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
import { Router, Request, Response } from 'express'
import { searchHooks, saveHook, getSavedHooks } from '../services/hooks'
import { recordDailyAction } from '../services/streak'

const router = Router()

// ---------------------------------------------------------------------------
// GET /hooks/search?niche=&query=&page=&pageSize=
// Returns paginated hooks filtered by niche and/or free-text query.
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
// ---------------------------------------------------------------------------
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const niche = typeof req.query.niche === 'string' ? req.query.niche : undefined
  const query = typeof req.query.query === 'string' ? req.query.query : undefined
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined

  const result = await searchHooks({ niche, query, page, pageSize })

  // Requirement 4.2: record daily streak action on hook library access
  await recordDailyAction(creatorId).catch(() => {})

  res.status(200).json(result)
})

// ---------------------------------------------------------------------------
// POST /hooks/save
// Saves a hook for the authenticated creator.
// Body: { hookId: string }
// Requirement: 8.6
// ---------------------------------------------------------------------------
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { hookId } = req.body as { hookId?: string }
  if (!hookId || typeof hookId !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'hookId is required' })
    return
  }

  await saveHook(creatorId, hookId)
  res.status(200).json({ saved: true })
})

// ---------------------------------------------------------------------------
// GET /hooks/saved
// Returns all hooks saved by the authenticated creator.
// Requirement: 8.6
// ---------------------------------------------------------------------------
router.get('/saved', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const hooks = await getSavedHooks(creatorId)
  res.status(200).json({ hooks })
})

export default router
