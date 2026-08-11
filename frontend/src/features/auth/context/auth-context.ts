import { createContext } from 'react'
import type { AuthUser, LoginCredentials, PermissionCode } from '../types/auth'

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<AuthUser | null>
  hasPermission: (permission: PermissionCode) => boolean
  hasAnyPermission: (permissions: PermissionCode[]) => boolean
  hasEveryPermission: (permissions: PermissionCode[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
