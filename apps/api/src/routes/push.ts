import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'

const router = Router()

// POST /push/subscribe — register push subscription
router.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const { endpoint, keys } = req.body as {
    endpoint?: string; keys?: { p256dh?: string; auth?: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'bad_request', message: 'Invalid push subscription data' })
    return
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { creatorId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { creatorId, p256dh: keys.p256dh, auth: keys.auth },
  })

  console.log(`[push] Subscription registered for creator=${creatorId}`)
  res.status(200).json({ success: true })
})

// DELETE /push/unsubscribe — remove push subscription
router.delete('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const { endpoint } = req.body as { endpoint?: string }
  if (!endpoint) { res.status(400).json({ error: 'bad_request' }); return }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, creatorId } })
  res.status(200).json({ success: true })
})

export default router
