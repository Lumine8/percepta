/** HTTP client wrapper with normalized errors. */

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown = undefined
  let message = `Request failed with status ${response.status}`
  try {
    const body = await response.json()
    detail = body.detail ?? body
    if (typeof body.detail === 'string') message = body.detail
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(response.status, detail, message)
}

/** GET a JSON resource. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

/** POST JSON, expecting a JSON response. */
export async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

/** POST multipart form data, expecting a JSON response. */
export async function postMultipart<T>(
  path: string,
  fields: Record<string, string | Blob>,
  signal?: AbortSignal,
): Promise<T> {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal,
    body: form,
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

/** Base64 → Uint8Array. */
export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
