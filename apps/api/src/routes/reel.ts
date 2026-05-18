import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'
import { recordDailyAction } from '../services/streak'
import { analyzeReel } from '../lib/groq'
import redis from '../lib/redis'

const router = Router()

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
  } catch (err) { console.error("[reel] domain parse error:", err)
    return false
  }
}

// ---------------------------------------------------------------------------
// GET /reel/count
// Returns the user's total submission count and limit
// ---------------------------------------------------------------------------
router.get('/count', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const count = await prisma.reelSubmission.count({ where: { creatorId } })
  res.status(200).json({ count, limit: 10 })
})

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

  // Total submission limit: 10 per user (not per day)
  const submissionCount = await prisma.reelSubmission.count({
    where: { creatorId },
  })

  if (submissionCount >= 10) {
    res.status(429).json({
      error: 'SUBMISSION_LIMIT_REACHED',
      message: "You've reached the 10 reel feedback limit. Delete an old submission to add a new one.",
    })
    return
  }

  // Duplicate URL detection: check if user already submitted this URL
  const existingSubmission = await prisma.reelSubmission.findFirst({
    where: { creatorId, url },
  })

  if (existingSubmission) {
    res.status(409).json({
      error: 'DUPLICATE_REEL',
      message: 'This reel has already been submitted.',
    })
    return
  }

  // Create the ReelSubmission record first (feedback will be added after AI call)
  const submission = await prisma.reelSubmission.create({
    data: { creatorId, url },
  })

  // Check Redis cache by URL hash (same video = same analysis)
  const urlHash = Buffer.from(url).toString('base64').slice(0, 40)
  const reelCacheKey = `reel:analysis:v2:${urlHash}`
  try {
    const cached = await redis.get(reelCacheKey)
    if (cached) {
      const feedback = JSON.parse(cached)
      await prisma.reelSubmission.update({ where: { id: submission.id }, data: { feedback: feedback as any } })
      await recordDailyAction(creatorId).catch(() => {})
      res.status(201).json({ id: submission.id, url: submission.url, feedback, submittedAt: submission.submittedAt, cached: true })
      return
    }
  } catch (err) { console.error('[reel] Cache read failed:', err) }

  // Call AI service for feedback
  let feedback: unknown
  try {
    feedback = await analyzeReel({ url })
  } catch (err) {
    // AI error — clean up and return 502
    await prisma.reelSubmission.delete({ where: { id: submission.id } })
    res.status(502).json({
      error: 'ai_service_unavailable',
      message: 'Reel analysis failed',
    })
    return
  }

  // Requirement 5.4: persist feedback JSON to ReelSubmission record
  const updated = await prisma.reelSubmission.update({
    where: { id: submission.id },
    data: { feedback: feedback as import('@prisma/client').Prisma.InputJsonValue },
  })

  // Cache the analysis by URL for 24 hours
  try { await redis.set(reelCacheKey, JSON.stringify(feedback), 'EX', 86400) } catch (err) { console.error('[reel] Cache write failed:', err) }

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
// DELETE /reel/:id
// Deletes a submission owned by the authenticated user
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { id } = req.params

  const submission = await prisma.reelSubmission.findFirst({
    where: { id, creatorId },
  })

  if (!submission) {
    res.status(404).json({ error: 'not_found' })
    return
  }

  // Delete associated virality prediction first (if exists)
  await prisma.viralityPrediction.deleteMany({ where: { reelSubmissionId: id } })
  await prisma.reelSubmission.delete({ where: { id } })

  res.status(200).json({ success: true })
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
