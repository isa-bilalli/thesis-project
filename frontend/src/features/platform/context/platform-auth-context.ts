import { createContext } from 'react'
import type {
  PlatformLoginCredentials,
  PlatformUser,
} from '../types/platform-auth'

export type PlatformAuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'

export interface PlatformAuthContextValue {
  status: PlatformAuthStatus
  user: PlatformUser | null
  isAuthenticated: boolean
  login: (credentials: PlatformLoginCredentials) => Promise<PlatformUser>
  logout: () => Promise<void>
  refresh: () => Promise<PlatformUser | null>
}

export const PlatformAuthContext = createContext<
  PlatformAuthContextValue | undefined
>(undefined)
