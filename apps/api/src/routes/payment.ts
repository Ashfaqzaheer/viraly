import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '@viraly/db'

const router = Router()

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? ''
const PREMIUM_AMOUNT_PAISE = 29900 // ₹299

// POST /payment/create-order — create a Razorpay order
router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.warn('[payment] Razorpay not configured')
    res.status(503).json({ error: 'payment_not_configured', message: 'Payment system not configured yet' })
    return
  }

  try {
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        amount: PREMIUM_AMOUNT_PAISE,
        currency: 'INR',
        receipt: `premium_${creatorId}_${Date.now()}`,
        notes: { creatorId },
      }),
    })

    if (!orderRes.ok) {
      console.error('[payment] Razorpay order creation failed:', await orderRes.text())
      res.status(502).json({ error: 'payment_failed', message: 'Could not create payment order' })
      return
    }

    const order = await orderRes.json() as { id: string; amount: number; currency: string }
    res.status(200).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID })
  } catch (err) {
    console.error('[payment] Order creation error:', err)
    res.status(502).json({ error: 'payment_failed', message: 'Payment service unavailable' })
  }
})

// POST /payment/verify — verify payment and activate premium
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
    razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'bad_request', message: 'Missing payment verification fields' })
    return
  }

  // Verify signature server-side (NEVER trust frontend)
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    console.warn(`[payment] Signature mismatch for creator=${creatorId}`)
    res.status(400).json({ error: 'invalid_signature', message: 'Payment verification failed' })
    return
  }

  // Activate premium
  await prisma.creator.update({
    where: { id: creatorId },
    data: { isPremium: true, premiumSince: new Date() },
  })

  console.log(`[payment] Premium activated for creator=${creatorId}`)
  res.status(200).json({ success: true, isPremium: true })
})

// GET /payment/status — check premium status
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { isPremium: true, premiumSince: true },
  })

  res.status(200).json({ isPremium: creator?.isPremium ?? false, premiumSince: creator?.premiumSince })
})

export default router
