import { Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { PlatformProtectedRoute } from '../components/PlatformProtectedRoute'
import { PlatformPublicOnlyRoute } from '../components/PlatformPublicOnlyRoute'
import { PlatformAuthProvider } from '../context/PlatformAuthProvider'
import { CreateTenantPage } from '../pages/CreateTenantPage'
import { PlatformDashboardPage } from '../pages/PlatformDashboardPage'
import { PlatformLoginPage } from '../pages/PlatformLoginPage'
import { TenantDetailPage } from '../pages/TenantDetailPage'
import { TenantListPage } from '../pages/TenantListPage'

export const platformRoutes: RouteObject = {
  path: '/platform',
  element: (
    <PlatformAuthProvider>
      <Outlet />
    </PlatformAuthProvider>
  ),
  children: [
    {
      element: <PlatformPublicOnlyRoute />,
      children: [
        {
          path: 'login',
          element: <PlatformLoginPage />,
        },
      ],
    },
    {
      element: <PlatformProtectedRoute />,
      children: [
        {
          index: true,
          element: <Navigate to="dashboard" replace />,
        },
        {
          path: 'dashboard',
          element: <PlatformDashboardPage />,
        },
        {
          path: 'tenants',
          element: <TenantListPage />,
        },
        {
          path: 'tenants/new',
          element: <CreateTenantPage />,
        },
        {
          path: 'tenants/:tenantId',
          element: <TenantDetailPage />,
        },
      ],
    },
  ],
}
