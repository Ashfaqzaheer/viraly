/**
 * Analytics Dashboard routes.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import { Router, Request, Response } from 'express'
import { getDashboard, exportCSV } from '../services/analytics'

const router = Router()

router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }
  const data = await getDashboard(creatorId)
  res.status(200).json(data)
})

router.get('/export-csv', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }
  const csv = await exportCSV(creatorId)
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"')
  res.status(200).send(csv)
})

export default router
