import { authTokenStore } from './auth-token-store'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, '')

interface ApiErrorPayload {
  error?: {
    message?: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean
  authorizationToken?: string | null
}

function getRequestUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalizedPath}`
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text || null
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    authenticated = false,
    authorizationToken,
    headers,
    ...requestOptions
  } = options
  const requestHeaders = new Headers(headers)

  if (authenticated || authorizationToken !== undefined) {
    const accessToken =
      authorizationToken !== undefined
        ? authorizationToken
        : authTokenStore.get()

    if (!accessToken) {
      throw new ApiError('Authentication required', 401)
    }

    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(getRequestUrl(path), {
    ...requestOptions,
    credentials: requestOptions.credentials ?? 'include',
    headers: requestHeaders,
  })
  const payload = await readResponsePayload(response)

  if (!response.ok) {
    const apiPayload = payload as ApiErrorPayload | null
    const message =
      apiPayload?.error?.message ??
      (typeof payload === 'string' ? payload : null) ??
      `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
