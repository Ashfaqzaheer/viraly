import cors from 'cors'

/**
 * CORS middleware restricted to the configured frontend domain.
 * Requirement 11.7
 */
export function createCorsMiddleware() {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  return cors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}
