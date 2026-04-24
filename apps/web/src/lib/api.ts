const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Authenticated fetch wrapper. Attaches Bearer token and handles common error shapes.
 */
export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit
): Promise<T> {
  const token = await getToken()
  if (!token) throw new ApiError('unauthorized', 'Not authenticated', 401)

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; message?: string }
    throw new ApiError(body.error ?? 'unknown', body.message ?? res.statusText, res.status)
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
