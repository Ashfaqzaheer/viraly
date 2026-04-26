import cors from 'cors'

/**
 * CORS middleware restricted to the configured frontend domain.
 * Supports multiple origins for dev + production.
 * Requirement 11.7
 */
export function createCorsMiddleware() {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  // Allow both the configured frontend URL and localhost for dev
  const allowedOrigins = [frontendUrl]
  if (frontendUrl !== 'http://localhost:3000') {
    allowedOrigins.push('http://localhost:3000')
  }

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}
