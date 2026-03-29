import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'
import { recordDailyAction } from '../services/streak'

const router = Router()

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Domain validation helper
// Requirements: 5.1, 5.5
// ---------------------------------------------------------------------------
const ALLOWED_DOMAINS = ['instagram.com', 'tiktok.com']

/**
 * Returns true if the URL's hostname is instagram.com or tiktok.com
 * (including subdomains like www.instagram.com).
 */
export function isAllowedDomain(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl)
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// POST /reel/submit
// Requirements: 5.1, 5.4, 5.5, 5.6
// ---------------------------------------------------------------------------
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { url } = req.body as { url?: string }

  if (!url) {
    res.status(400).json({ error: 'validation_failed', message: 'url is required' })
    return
  }

  // Requirement 5.1, 5.5: validate domain — return within 5 seconds, no AI call
  if (!isAllowedDomain(url)) {
    res.status(400).json({
      error: 'unsupported_domain',
      message: 'Only Instagram and TikTok URLs are accepted',
    })
    return
  }

  // Requirement 5.6: daily submission limit — count submissions in last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const submissionCount = await prisma.reelSubmission.count({
    where: {
      creatorId,
      submittedAt: { gte: since },
    },
  })

  if (submissionCount >= 10) {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Daily submission limit of 10 reached',
    })
    return
  }

  // Create the ReelSubmission record first (feedback will be added after AI call)
  const submission = await prisma.reelSubmission.create({
    data: { creatorId, url },
  })

  // Call AI service for feedback
  let feedback: unknown
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/analyze-reel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!aiResponse.ok) {
      const body = await aiResponse.json().catch(() => ({})) as { message?: string }
      // Clean up the submission record since AI failed
      await prisma.reelSubmission.delete({ where: { id: submission.id } })
      res.status(502).json({
        error: 'ai_service_unavailable',
        message: body.message ?? 'Reel analysis failed',
      })
      return
    }

    feedback = await aiResponse.json()
  } catch (err) {
    // Network error — clean up and return 502
    await prisma.reelSubmission.delete({ where: { id: submission.id } })
    res.status(502).json({
      error: 'ai_service_unavailable',
      message: 'Could not reach AI service',
    })
    return
  }

  // Requirement 5.4: persist feedback JSON to ReelSubmission record
  const updated = await prisma.reelSubmission.update({
    where: { id: submission.id },
    data: { feedback: feedback as import('@prisma/client').Prisma.InputJsonValue },
  })

  // Requirement 4.2: record daily streak action on reel submission
  await recordDailyAction(creatorId).catch(() => {
    // Non-fatal: streak failure doesn't break the response
  })

  res.status(201).json({
    id: updated.id,
    url: updated.url,
    feedback,
    submittedAt: updated.submittedAt,
  })
})

// ---------------------------------------------------------------------------
// GET /reel/history
// Requirements: 5.4
// ---------------------------------------------------------------------------
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const submissions = await prisma.reelSubmission.findMany({
    where: { creatorId },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      url: true,
      feedback: true,
      submittedAt: true,
    },
  })

  res.status(200).json(submissions)
})

export default router
