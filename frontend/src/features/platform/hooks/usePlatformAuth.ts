import { useContext } from 'react'
import { PlatformAuthContext } from '../context/platform-auth-context'

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext)

  if (!context) {
    throw new Error('usePlatformAuth must be used within a PlatformAuthProvider')
  }

  return context
}
