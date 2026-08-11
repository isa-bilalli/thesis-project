import { apiRequest } from '@/lib/api/api-client'
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from '../types/auth'

interface CurrentUserResponse {
  user: AuthUser
}

let pendingRefresh: Promise<AuthSession> | null = null

export function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function refreshSessionRequest(): Promise<AuthSession> {
  if (!pendingRefresh) {
    pendingRefresh = apiRequest<AuthSession>('/api/auth/refresh', {
      method: 'POST',
    }).finally(() => {
      pendingRefresh = null
    })
  }

  return pendingRefresh
}

export async function currentUserRequest(): Promise<AuthUser> {
  const response = await apiRequest<CurrentUserResponse>('/api/auth/me', {
    authenticated: true,
  })

  return response.user
}

export function logoutRequest(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}
