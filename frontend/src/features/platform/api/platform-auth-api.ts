import { apiRequest } from '@/lib/api/api-client'
import type {
  PlatformLoginCredentials,
  PlatformLoginResponse,
  PlatformSession,
  PlatformUser,
} from '../types/platform-auth'
import { platformTokenStore } from './platform-token-store'

interface PlatformCurrentUserResponse {
  user: PlatformUser
}

let pendingPlatformRefresh: Promise<PlatformSession> | null = null

export function platformLoginRequest(
  credentials: PlatformLoginCredentials,
): Promise<PlatformLoginResponse> {
  return apiRequest<PlatformLoginResponse>('/api/platform/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function platformRefreshRequest(): Promise<PlatformSession> {
  if (!pendingPlatformRefresh) {
    pendingPlatformRefresh = apiRequest<PlatformSession>(
      '/api/platform/auth/refresh',
      { method: 'POST' },
    ).finally(() => {
      pendingPlatformRefresh = null
    })
  }

  return pendingPlatformRefresh
}

export async function platformCurrentUserRequest(): Promise<PlatformUser> {
  const response = await apiRequest<PlatformCurrentUserResponse>(
    '/api/platform/auth/me',
    {
      authorizationToken: platformTokenStore.get(),
    },
  )

  return response.user
}

export function platformLogoutRequest(): Promise<void> {
  return apiRequest<void>('/api/platform/auth/logout', {
    method: 'POST',
  })
}
