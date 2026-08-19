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
import { ModulePlaceholderPage } from '@/features/dashboard/pages/ModulePlaceholderPage'
import { platformRoutes } from '@/features/platform/routes/platform-routes'
import { AccountSettingsPage } from '@/features/tenant/pages/AccountSettingsPage'
import { CreateLeadPage } from '@/features/tenant/pages/CreateLeadPage'
import { CreateOfferPage } from '@/features/tenant/pages/CreateOfferPage'
import { CreateSalePage } from '@/features/tenant/pages/CreateSalePage'
import { CreateVehiclePage } from '@/features/tenant/pages/CreateVehiclePage'
import { CustomersPage } from '@/features/tenant/pages/CustomersPage'
import { InventoryPage } from '@/features/tenant/pages/InventoryPage'
import { LeadDetailPage } from '@/features/tenant/pages/LeadDetailPage'
import { LeadsPage } from '@/features/tenant/pages/LeadsPage'
import { LocationsPage } from '@/features/tenant/pages/LocationsPage'
import { OfferDetailPage } from '@/features/tenant/pages/OfferDetailPage'
import { OffersPage } from '@/features/tenant/pages/OffersPage'
import { ReservationDetailPage } from '@/features/tenant/pages/ReservationDetailPage'
import { ReservationsPage } from '@/features/tenant/pages/ReservationsPage'
import { SaleDetailPage } from '@/features/tenant/pages/SaleDetailPage'
import { SalesPage } from '@/features/tenant/pages/SalesPage'
import { TestDriveDetailPage } from '@/features/tenant/pages/TestDriveDetailPage'
import { TestDrivesPage } from '@/features/tenant/pages/TestDrivesPage'
import { UsersPage } from '@/features/tenant/pages/UsersPage'
import { VehicleDetailPage } from '@/features/tenant/pages/VehicleDetailPage'

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
  {
    path: 'inventory',
    element: <InventoryPage />,
    requiredPermissions: ['inventory.read'],
  },
  {
    path: 'inventory/new',
    element: <CreateVehiclePage />,
    requiredPermissions: ['inventory.write'],
  },
  {
    path: 'inventory/:vehicleId',
    element: <VehicleDetailPage />,
    requiredPermissions: ['inventory.read'],
  },
  {
    path: 'customers',
    element: <CustomersPage />,
    requiredPermissions: ['crm.read'],
  },
  {
    path: 'leads',
    element: <LeadsPage />,
    requiredPermissions: ['crm.read'],
  },
  {
    path: 'leads/new',
    element: <CreateLeadPage />,
    requiredPermissions: ['crm.write'],
  },
  {
    path: 'leads/:leadId',
    element: <LeadDetailPage />,
    requiredPermissions: ['crm.read'],
  },
  {
    path: 'test-drives',
    element: <TestDrivesPage />,
    requiredPermissions: ['crm.read'],
  },
  {
    path: 'test-drives/:testDriveId',
    element: <TestDriveDetailPage />,
    requiredPermissions: ['crm.read'],
  },
  {
    path: 'offers',
    element: <OffersPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'offers/new',
    element: <CreateOfferPage />,
    requiredPermissions: ['sales.create_offer'],
  },
  {
    path: 'offers/:offerId',
    element: <OfferDetailPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'reservations',
    element: <ReservationsPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'reservations/:reservationId',
    element: <ReservationDetailPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'sales',
    element: <SalesPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'sales/new',
    element: <CreateSalePage />,
    requiredPermissions: ['sales.complete'],
  },
  {
    path: 'sales/:saleId',
    element: <SaleDetailPage />,
    requiredPermissions: ['sales.read'],
  },
  {
    path: 'users',
    element: <UsersPage />,
    requiredPermissions: ['users.manage'],
  },
  {
    path: 'locations',
    element: <LocationsPage />,
    requiredPermissions: ['locations.manage'],
  },
  {
    path: 'reports',
    element: (
      <ModulePlaceholderPage
        eyebrow="Reporting"
        title="Reports"
        description="Review dealership performance and operational reporting."
      />
    ),
    requiredPermissions: ['reports.read'],
  },
  {
    path: 'settings',
    element: <AccountSettingsPage />,
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
