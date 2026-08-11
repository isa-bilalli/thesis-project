import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { authTokenStore } from '@/lib/api/auth-token-store'
import {
  currentUserRequest,
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
} from '../api/auth-api'
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  PermissionCode,
} from '../types/auth'
import { AuthContext, type AuthStatus } from './auth-context'

const REFRESH_EARLY_MS = 60_000
const MINIMUM_REFRESH_DELAY_MS = 5_000

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('initializing')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)

  const clearSession = useCallback(() => {
    authTokenStore.clear()
    setUser(null)
    setExpiresAt(null)
    setStatus('unauthenticated')
  }, [])

  const applySession = useCallback((session: AuthSession) => {
    authTokenStore.set(session.accessToken)
    setExpiresAt(Date.now() + session.expiresInSeconds * 1_000)
  }, [])

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const session = await refreshSessionRequest()
      applySession(session)

      const currentUser = await currentUserRequest()
      setUser(currentUser)
      setStatus('authenticated')

      return currentUser
    } catch {
      clearSession()
      return null
    }
  }, [applySession, clearSession])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (status !== 'authenticated' || expiresAt === null) {
      return
    }

    const delay = Math.max(
      expiresAt - Date.now() - REFRESH_EARLY_MS,
      MINIMUM_REFRESH_DELAY_MS,
    )
    const timer = window.setTimeout(() => {
      void refresh()
    }, delay)

    return () => window.clearTimeout(timer)
  }, [expiresAt, refresh, status])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      const response = await loginRequest(credentials)
      applySession(response)
      setUser(response.user)
      setStatus('authenticated')

      return response.user
    },
    [applySession],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest()
    } catch {
      // Local credentials still need to be cleared when the API is unavailable.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const hasPermission = useCallback(
    (permission: PermissionCode) => user?.permissions.includes(permission) ?? false,
    [user],
  )

  const hasAnyPermission = useCallback(
    (permissions: PermissionCode[]) => permissions.some(hasPermission),
    [hasPermission],
  )

  const hasEveryPermission = useCallback(
    (permissions: PermissionCode[]) => permissions.every(hasPermission),
    [hasPermission],
  )

  const value = useMemo(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      refresh,
      hasPermission,
      hasAnyPermission,
      hasEveryPermission,
    }),
    [
      hasAnyPermission,
      hasEveryPermission,
      hasPermission,
      login,
      logout,
      refresh,
      status,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
