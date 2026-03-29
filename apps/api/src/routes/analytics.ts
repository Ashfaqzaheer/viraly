/**
 * Analytics Dashboard routes.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import { Router, Request, Response } from 'express'
import Redis from 'ioredis'
import { getDashboard, exportCSV } from '../services/analytics'

export function createAnalyticsRouter(redisClient: Redis): Router {
  const router = Router()

  // -------------------------------------------------------------------------
  // GET /analytics/dashboard
  // Returns DashboardData for the authenticated creator.
  // Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
  // -------------------------------------------------------------------------
  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    const creatorId = req.creator?.sub
    if (!creatorId) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const data = await getDashboard(creatorId, redisClient)
    res.status(200).json(data)
  })

  // -------------------------------------------------------------------------
  // GET /analytics/export-csv
  // Returns analytics data as a CSV download.
  // Requirements: 9.5
  // -------------------------------------------------------------------------
  router.get('/export-csv', async (req: Request, res: Response): Promise<void> => {
    const creatorId = req.creator?.sub
    if (!creatorId) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const csv = await exportCSV(creatorId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"')
    res.status(200).send(csv)
  })

  return router
}

export default createAnalyticsRouter
