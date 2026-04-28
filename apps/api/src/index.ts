import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
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
import analyticsRouter from './routes/analytics'
import monetizationRouter from './routes/monetization'
import missionRouter from './routes/mission'
import paymentRouter from './routes/payment'
import pushRouter from './routes/push'
import { scheduleStreakResetJob } from './jobs/streakReset'
import { scheduleTrendsRefreshJob } from './jobs/trendsRefresh'
import { scheduleStreakReminderJob } from './jobs/streakReminder'

const app = express()
const PORT = process.env.PORT ?? 3001

// ── CORS — MUST be first, before everything ──────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://viraly-production.up.railway.app',
  'http://localhost:3000',
].filter(Boolean) as string[]

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.warn(`[CORS] Blocked origin: ${origin}`)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// Handle preflight OPTIONS for ALL routes
app.options('*', cors(corsOptions))

// Apply CORS to all requests
app.use(cors(corsOptions))

// ── Body parsing + cookies ───────────────────────────────────────────────
app.use(express.json())
app.use(cookieParser())

// ── Middleware (after CORS, after body parsing) ──────────────────────────
app.use(jwtVerification)
app.use(rateLimiter)
app.use(inputValidator)

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ── Routes under /api prefix (production) ────────────────────────────────
const apiRouter = express.Router()
apiRouter.use('/auth', authRouter)
apiRouter.use('/onboarding', onboardingRouter)
apiRouter.use('/scripts', scriptsRouter)
apiRouter.use('/streak', streakRouter)
apiRouter.use('/reel', reelRouter)
apiRouter.use('/virality', viralityRouter)
apiRouter.use('/trends', trendsRouter)
apiRouter.use('/hooks', hooksRouter)
apiRouter.use('/analytics', analyticsRouter)
apiRouter.use('/monetization', monetizationRouter)
apiRouter.use('/mission', missionRouter)
apiRouter.use('/payment', paymentRouter)
apiRouter.use('/push', pushRouter)
app.use('/api', apiRouter)

// ── Same routes without prefix (local dev backward compat) ───────────────
app.use('/auth', authRouter)
app.use('/onboarding', onboardingRouter)
app.use('/scripts', scriptsRouter)
app.use('/streak', streakRouter)
app.use('/reel', reelRouter)
app.use('/virality', viralityRouter)
app.use('/trends', trendsRouter)
app.use('/hooks', hooksRouter)
app.use('/analytics', analyticsRouter)
app.use('/monetization', monetizationRouter)
app.use('/mission', missionRouter)
app.use('/payment', paymentRouter)
app.use('/push', pushRouter)

// ── Start server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`)
  scheduleStreakResetJob()
  scheduleTrendsRefreshJob()
  scheduleStreakReminderJob()
})

export default app
