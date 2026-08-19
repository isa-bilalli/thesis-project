import { apiRequest } from '@/lib/api/api-client'
import type { TenantDashboard } from '../types/dashboard'

export async function getTenantDashboard(): Promise<TenantDashboard> {
  const response = await apiRequest<{ dashboard: TenantDashboard }>(
    '/api/tenant/dashboard',
    { authenticated: true },
  )

  return response.dashboard
}
