// Feature: viraly-app, Property 7: API keys stored encrypted
import * as fc from 'fast-check'
import crypto from 'crypto'

// Set a deterministic 32-byte encryption key for tests
const TEST_KEY = crypto.randomBytes(32).toString('hex')
process.env.ENCRYPTION_KEY = TEST_KEY

import { encryptApiKey, decryptApiKey } from '../../utils/encryption'

describe('Property 7: API keys stored encrypted', () => {
  /**
   * Validates: Requirements 1.9
   *
   * For any Creator with a stored API key, the value persisted in the database
   * SHALL NOT equal the plaintext key — it SHALL be an AES-256 encrypted
   * ciphertext. Decrypting the ciphertext SHALL recover the original plaintext.
   */
  it('encrypted value never equals plaintext and decryption round-trips correctly', async () => {
    // Feature: viraly-app, Property 7: API keys stored encrypted
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (plaintext) => {
          const ciphertext = encryptApiKey(plaintext)

          // 1. Ciphertext must not equal the plaintext
          expect(ciphertext).not.toBe(plaintext)

          // 2. Ciphertext must follow the iv:encrypted hex format
          const parts = ciphertext.split(':')
          expect(parts).toHaveLength(2)
          expect(parts[0]).toMatch(/^[0-9a-f]{32}$/) // 16-byte IV = 32 hex chars
          expect(parts[1]).toMatch(/^[0-9a-f]+$/)

          // 3. Plaintext must not appear as a substring of the ciphertext
          // (only meaningful for plaintexts longer than 2 chars; short strings
          // like "b" can coincidentally appear in hex-encoded output)
          if (plaintext.length > 2) {
            expect(ciphertext).not.toContain(plaintext)
          }

          // 4. Decryption recovers the original plaintext
          const decrypted = decryptApiKey(ciphertext)
          expect(decrypted).toBe(plaintext)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Validates: Requirements 1.9
   *
   * Encrypting the same plaintext twice SHALL produce different ciphertexts
   * (due to random IV), but both SHALL decrypt to the same original value.
   */
  it('produces distinct ciphertexts for the same plaintext due to random IV', () => {
    // Feature: viraly-app, Property 7: API keys stored encrypted
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (plaintext) => {
          const c1 = encryptApiKey(plaintext)
          const c2 = encryptApiKey(plaintext)

          // Different IVs should produce different ciphertexts
          expect(c1).not.toBe(c2)

          // Both must decrypt to the same original value
          expect(decryptApiKey(c1)).toBe(plaintext)
          expect(decryptApiKey(c2)).toBe(plaintext)
        }
      ),
      { numRuns: 100 }
    )
  })
})
