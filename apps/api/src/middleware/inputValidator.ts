import { Request, Response, NextFunction } from 'express'

/**
 * SQL injection patterns to detect.
 * Requirement 11.4
 */
const SQL_INJECTION_PATTERNS = [
  /'\s*;\s*DROP\s+TABLE/i,
  /'\s*OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /'\s*OR\s+\w+\s*=\s*\w+/i,
  /\bOR\b\s+'[^']*'='[^']*/i,           // ' OR 'a'='a style (with or without closing quote)
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
  /\bUNION\b.*\bSELECT\b/i,
  /\bINSERT\b.*\bINTO\b/i,
  /\bDELETE\b.*\bFROM\b/i,
  /\bUPDATE\b.*\bSET\b/i,
  /\bDROP\b.*\bTABLE\b/i,
  /\bEXEC\b(\s+|\s*\()/i,
  /\bEXECUTE\b(\s+|\s*\()/i,
]

/**
 * Script injection patterns to detect.
 * Requirement 11.4
 */
const SCRIPT_INJECTION_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["'`]/i,   // event handlers like onclick=, onerror=
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
]

function containsInjection(value: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) return true
  }
  for (const pattern of SCRIPT_INJECTION_PATTERNS) {
    if (pattern.test(value)) return true
  }
  return false
}

function scanValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return containsInjection(value)
  }
  if (Array.isArray(value)) {
    return value.some(item => scanValue(item))
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(v => scanValue(v))
  }
  return false
}

/**
 * Input validation and sanitization middleware.
 * Rejects requests containing SQL or script injection patterns.
 * Requirements 11.3, 11.4
 */
export function inputValidator(req: Request, res: Response, next: NextFunction): void {
  const targets = [req.body, req.query, req.params]

  for (const target of targets) {
    if (scanValue(target)) {
      res.status(400).json({
        error: 'validation_failed',
        message: 'Request contains disallowed patterns',
      })
      return
    }
  }

  next()
}
