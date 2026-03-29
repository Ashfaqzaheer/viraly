import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // AES block size

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64-character) hex string')
  }
  return key
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns a hex string in the format `iv:ciphertext`.
 * Requirements: 1.9
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a ciphertext string produced by `encryptApiKey`.
 * Expects a hex string in the format `iv:ciphertext`.
 * Requirements: 1.9
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format — expected iv:ciphertext')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
