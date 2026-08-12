import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { NotFoundPage } from '@/components/feedback/NotFoundPage'
import { UnauthorizedPage } from '@/components/feedback/UnauthorizedPage'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ProtectedRoute,
  type PermissionMode,
} from '@/features/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from '@/features/auth/components/PublicOnlyRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import type { PermissionCode } from '@/features/auth/types/auth'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { platformRoutes } from '@/features/platform/routes/platform-routes'

interface ProtectedRouteDefinition {
  path: string
  element: ReactNode
  requiredPermissions?: PermissionCode[]
  permissionMode?: PermissionMode
}

// Add authenticated application pages to this table. Supplying
// requiredPermissions automatically adds authorization to that route.
const protectedRoutes: ProtectedRouteDefinition[] = [
  {
    path: 'dashboard',
    element: <DashboardPage />,
  },
]

export const router = createBrowserRouter([
  platformRoutes,
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          ...protectedRoutes.map(
            ({ path, element, requiredPermissions, permissionMode }) => ({
              path,
              element: requiredPermissions ? (
                <ProtectedRoute
                  requiredPermissions={requiredPermissions}
                  permissionMode={permissionMode}
                >
                  {element}
                </ProtectedRoute>
              ) : (
                element
              ),
            }),
          ),
          {
            path: 'unauthorized',
            element: <UnauthorizedPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
