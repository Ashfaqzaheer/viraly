import express from 'express'
import cookieParser from 'cookie-parser'
import redis from './lib/redis'
import { httpsEnforcement } from './middleware/https'
import { createCorsMiddleware } from './middleware/cors'
import { jwtVerification } from './middleware/jwt'
import { rateLimiter } from './middleware/rateLimiter'
import { inputValidator } from './middleware/inputValidator'
import authRouter from './routes/auth'
import onboardingRouter from './routes/onboarding'
import scriptsRouter from './routes/scripts'
import streakRouter from './routes/streak'
import reelRouter from './routes/reel'
import viralityRouter from './routes/virality'
import trendsRouter from './routes/trends'
import hooksRouter from './routes/hooks'
import createAnalyticsRouter from './routes/analytics'
import monetizationRouter from './routes/monetization'
import missionRouter from './routes/mission'
import { scheduleStreakResetJob } from './jobs/streakReset'
import { scheduleTrendsRefreshJob } from './jobs/trendsRefresh'

const app = express()
const PORT = process.env.PORT ?? 3001

// Parse JSON bodies before middleware runs
app.use(express.json())
app.use(cookieParser())

// Middleware stack (in order):
// 1. HTTPS enforcement
app.use(httpsEnforcement)

// 2. CORS — restricted to configured frontend domain
app.use(createCorsMiddleware())

// 3. JWT verification — skips public endpoints
app.use(jwtVerification)

// 4. Rate limiter — Redis sliding window, 100 req/min per creator
app.use(rateLimiter)

// 5. Input validator — SQL and script injection detection
app.use(inputValidator)

// Route handlers
app.use('/auth', authRouter)
app.use('/onboarding', onboardingRouter)
app.use('/scripts', scriptsRouter)
app.use('/streak', streakRouter)
app.use('/reel', reelRouter)
app.use('/virality', viralityRouter)
app.use('/trends', trendsRouter)
app.use('/hooks', hooksRouter)
app.use('/analytics', createAnalyticsRouter(redis))
app.use('/monetization', monetizationRouter)
app.use('/mission', missionRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  scheduleStreakResetJob()
  scheduleTrendsRefreshJob()
})

export default app
