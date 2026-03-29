import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'

const router = Router()

type FollowerRange = 'under_1k' | '1k_10k' | '10k_100k' | 'over_100k'

const VALID_FOLLOWER_RANGES: FollowerRange[] = ['under_1k', '1k_10k', '10k_100k', 'over_100k']

const REQUIRED_FIELDS = ['displayName', 'primaryNiche', 'followerCountRange', 'primaryGoal'] as const

// ---------------------------------------------------------------------------
// POST /onboarding/profile
// Requirements: 2.2, 2.3, 2.4
// ---------------------------------------------------------------------------
router.post('/profile', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const body = req.body as {
    displayName?: string
    primaryNiche?: string
    secondaryNiche?: string
    instagramHandle?: string
    followerCountRange?: string
    primaryGoal?: string
  }

  // Validate required fields
  const fieldErrors: { field: string; message: string }[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = body[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      fieldErrors.push({ field, message: 'required' })
    }
  }

  // Validate followerCountRange enum value (only if it was provided)
  if (body.followerCountRange && !VALID_FOLLOWER_RANGES.includes(body.followerCountRange as FollowerRange)) {
    fieldErrors.push({ field: 'followerCountRange', message: `must be one of: ${VALID_FOLLOWER_RANGES.join(', ')}` })
  }

  if (fieldErrors.length > 0) {
    res.status(422).json({ error: 'validation_failed', fields: fieldErrors })
    return
  }

  const creator = await prisma.creator.update({
    where: { id: creatorId },
    data: {
      displayName: body.displayName!.trim(),
      primaryNiche: body.primaryNiche!.trim(),
      secondaryNiche: body.secondaryNiche?.trim() ?? null,
      instagramHandle: body.instagramHandle?.trim() ?? null,
      followerCountRange: body.followerCountRange!,
      primaryGoal: body.primaryGoal!.trim(),
      onboardingComplete: true,
    },
  })

  res.status(200).json({
    id: creator.id,
    displayName: creator.displayName,
    primaryNiche: creator.primaryNiche,
    secondaryNiche: creator.secondaryNiche,
    instagramHandle: creator.instagramHandle,
    followerCountRange: creator.followerCountRange,
    primaryGoal: creator.primaryGoal,
    onboardingComplete: creator.onboardingComplete,
  })
})

// ---------------------------------------------------------------------------
// GET /onboarding/profile
// Requirements: 2.5, 2.6
// ---------------------------------------------------------------------------
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      displayName: true,
      primaryNiche: true,
      secondaryNiche: true,
      instagramHandle: true,
      followerCountRange: true,
      primaryGoal: true,
      onboardingComplete: true,
    },
  })

  if (!creator) {
    res.status(404).json({ error: 'not_found' })
    return
  }

  const response: Record<string, unknown> = {
    id: creator.id,
    displayName: creator.displayName,
    primaryNiche: creator.primaryNiche,
    secondaryNiche: creator.secondaryNiche,
    instagramHandle: creator.instagramHandle,
    followerCountRange: creator.followerCountRange,
    primaryGoal: creator.primaryGoal,
    onboardingComplete: creator.onboardingComplete,
  }

  // Requirement 2.5: if onboarding is not complete, include incomplete flag
  if (!creator.onboardingComplete) {
    response.incomplete = true
  }

  res.status(200).json(response)
})

export default router
