import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  platformCurrentUserRequest,
  platformLoginRequest,
  platformLogoutRequest,
  platformRefreshRequest,
} from '../api/platform-auth-api'
import { platformTokenStore } from '../api/platform-token-store'
import type {
  PlatformLoginCredentials,
  PlatformSession,
  PlatformUser,
} from '../types/platform-auth'
import {
  PlatformAuthContext,
  type PlatformAuthStatus,
} from './platform-auth-context'

const REFRESH_EARLY_MS = 60_000
const MINIMUM_REFRESH_DELAY_MS = 5_000

export function PlatformAuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<PlatformAuthStatus>('initializing')
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)

  const clearSession = useCallback(() => {
    platformTokenStore.clear()
    setUser(null)
    setExpiresAt(null)
    setStatus('unauthenticated')
  }, [])

  const applySession = useCallback((session: PlatformSession) => {
    platformTokenStore.set(session.accessToken)
    setExpiresAt(Date.now() + session.expiresInSeconds * 1_000)
  }, [])

  const refresh = useCallback(async (): Promise<PlatformUser | null> => {
    try {
      const session = await platformRefreshRequest()
      applySession(session)

      const currentUser = await platformCurrentUserRequest()
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
    async (credentials: PlatformLoginCredentials): Promise<PlatformUser> => {
      const response = await platformLoginRequest(credentials)
      applySession(response)
      setUser(response.user)
      setStatus('authenticated')

      return response.user
    },
    [applySession],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await platformLogoutRequest()
    } catch {
      // Clear local credentials even if the API cannot revoke the cookie session.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      refresh,
    }),
    [login, logout, refresh, status, user],
  )

  return (
    <PlatformAuthContext.Provider value={value}>
      {children}
    </PlatformAuthContext.Provider>
  )
}
