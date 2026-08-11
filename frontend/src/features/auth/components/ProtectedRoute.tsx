import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { useAuth } from '../hooks/useAuth'
import type { PermissionCode } from '../types/auth'

export type PermissionMode = 'all' | 'any'

interface ProtectedRouteProps {
  children?: ReactNode
  requiredPermissions?: PermissionCode[]
  permissionMode?: PermissionMode
}



export function ProtectedRoute({
  children,
  requiredPermissions = [],
  permissionMode = 'all',
}: ProtectedRouteProps) {
  const location = useLocation()
  const { status, hasAnyPermission, hasEveryPermission } = useAuth()

  const bypassAuth =
  import.meta.env.DEV &&
  import.meta.env.VITE_BYPASS_AUTH === 'true'

  if (bypassAuth) {
    return children ?? <Outlet />
  }

  if (status === 'initializing') {
    return <FullPageLoader />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const isAllowed =
    requiredPermissions.length === 0 ||
    (permissionMode === 'any'
      ? hasAnyPermission(requiredPermissions)
      : hasEveryPermission(requiredPermissions))

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return children ?? <Outlet />
}
