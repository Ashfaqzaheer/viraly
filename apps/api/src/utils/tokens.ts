import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '@viraly/db'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7

/**
 * Issues a JWT access token and a random refresh token for the given creator.
 * Stores the refresh token in the Session table with a 7-day expiry.
 */
export async function issueTokens(
  creatorId: string,
  email: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  const accessToken = jwt.sign({ sub: creatorId, email }, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })

  const refreshToken = crypto.randomBytes(32).toString('hex')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  await prisma.session.create({
    data: {
      creatorId,
      refreshToken,
      expiresAt,
    },
  })

  return { accessToken, refreshToken }
}
