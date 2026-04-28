import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'

const router = Router()

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// POST /virality/predict/:reelSubmissionId
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
// ---------------------------------------------------------------------------
router.post('/predict/:reelSubmissionId', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { reelSubmissionId } = req.params

  // Verify the reel submission belongs to this creator
  const submission = await prisma.reelSubmission.findFirst({
    where: { id: reelSubmissionId, creatorId },
  })

  if (!submission) {
    res.status(404).json({ error: 'not_found', message: 'Reel submission not found' })
    return
  }

  // Call AI service for virality prediction with retry-once on failure
  // Requirement 6.6: retry once on AI provider error, then return descriptive error
  const RETRY_DELAY_MS = Number(process.env.VIRALITY_RETRY_DELAY_MS ?? '1000')

  let aiResult: { score: number; reachMin: number; reachMax: number; suggestions: string[]; breakdown?: Record<string, number>; improvements?: Array<{ problem: string; fix: string; reason: string }>; howToFix?: Array<{ problem: string; fix: string; howToShoot: string[]; expectedResult: string }> }

  const callAI = async (): Promise<{ ok: true; data: typeof aiResult } | { ok: false; message: string }> => {
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/predict-virality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ url: submission.url }),
      })

      if (!aiResponse.ok) {
        const body = await aiResponse.json().catch(() => ({})) as { message?: string }
        return { ok: false, message: body.message as string ?? 'Virality prediction failed' }
      }

      const data = await aiResponse.json() as typeof aiResult
      return { ok: true, data }
    } catch (err) { console.error("[virality] AI call error:", err)
      return { ok: false, message: 'Could not reach AI service' }
    }
  }

  // First attempt
  let result = await callAI()

  // Retry once on failure
  if (!result.ok) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    result = await callAI()
  }

  if (!result.ok) {
    res.status(502).json({
      error: 'ai_service_unavailable',
      message: result.message as string,
    })
    return
  }

  aiResult = result.data

  // Requirement 6.5: persist prediction linked to creatorId and reelSubmissionId
  const prediction = await prisma.viralityPrediction.upsert({
    where: { reelSubmissionId },
    create: {
      creatorId,
      reelSubmissionId,
      score: aiResult.score,
      reachMin: aiResult.reachMin,
      reachMax: aiResult.reachMax,
      suggestions: aiResult.suggestions,
    },
    update: {
      score: aiResult.score,
      reachMin: aiResult.reachMin,
      reachMax: aiResult.reachMax,
      suggestions: aiResult.suggestions,
    },
  })

  res.status(201).json({
    id: prediction.id,
    score: prediction.score,
    reachRange: { min: prediction.reachMin, max: prediction.reachMax },
    breakdown: aiResult.breakdown ?? null,
    improvements: aiResult.improvements ?? [],
    howToFix: aiResult.howToFix ?? [],
    suggestions: prediction.suggestions,
    createdAt: prediction.createdAt,
  })
})

export default router
