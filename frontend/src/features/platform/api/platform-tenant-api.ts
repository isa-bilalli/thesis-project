import { apiRequest } from '@/lib/api/api-client'
import type {
  CreatePlatformTenantInput,
  CreatePlatformTenantUserInput,
  PlatformHealth,
  PlatformLocation,
  PlatformTenant,
  PlatformTenantRole,
  PlatformTenantUser,
  MutableTenantUserStatus,
  TenantStatus,
  UpdatePlatformTenantInput,
} from '../types/platform-tenant'
import { platformTokenStore } from './platform-token-store'

function platformRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    authorizationToken: platformTokenStore.get(),
  })
}

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const response = await platformRequest<{ tenants: PlatformTenant[] }>(
    '/api/platform/tenants',
  )
  return response.tenants
}

export async function getPlatformTenant(
  tenantId: number,
): Promise<PlatformTenant> {
  const response = await platformRequest<{ tenant: PlatformTenant }>(
    `/api/platform/tenants/${tenantId}`,
  )
  return response.tenant
}

export async function createPlatformTenant(
  input: CreatePlatformTenantInput,
): Promise<PlatformTenant> {
  const response = await platformRequest<{ tenant: PlatformTenant }>(
    '/api/platform/tenants',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.tenant
}

export async function updatePlatformTenant(
  tenantId: number,
  input: UpdatePlatformTenantInput,
): Promise<PlatformTenant> {
  const response = await platformRequest<{ tenant: PlatformTenant }>(
    `/api/platform/tenants/${tenantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
  return response.tenant
}

export async function updatePlatformTenantStatus(
  tenantId: number,
  status: TenantStatus,
): Promise<PlatformTenant> {
  const response = await platformRequest<{ tenant: PlatformTenant }>(
    `/api/platform/tenants/${tenantId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
  return response.tenant
}

export async function listPlatformTenantLocations(
  tenantId: number,
): Promise<PlatformLocation[]> {
  const response = await platformRequest<{ locations: PlatformLocation[] }>(
    `/api/platform/tenants/${tenantId}/locations`,
  )
  return response.locations
}

export async function listPlatformTenantUsers(
  tenantId: number,
): Promise<PlatformTenantUser[]> {
  const response = await platformRequest<{ users: PlatformTenantUser[] }>(
    `/api/platform/tenants/${tenantId}/users`,
  )
  return response.users
}

export async function listPlatformTenantRoles(
  tenantId: number,
): Promise<PlatformTenantRole[]> {
  const response = await platformRequest<{ roles: PlatformTenantRole[] }>(
    `/api/platform/tenants/${tenantId}/roles`,
  )
  return response.roles
}

export async function createPlatformTenantUser(
  tenantId: number,
  input: CreatePlatformTenantUserInput,
): Promise<PlatformTenantUser> {
  const response = await platformRequest<{ user: PlatformTenantUser }>(
    `/api/platform/tenants/${tenantId}/users`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.user
}

export async function updatePlatformTenantUserStatus(
  tenantId: number,
  userId: number,
  status: MutableTenantUserStatus,
): Promise<Pick<PlatformTenantUser, 'id' | 'status'>> {
  const response = await platformRequest<{
    user: Pick<PlatformTenantUser, 'id' | 'status'>
  }>(`/api/platform/tenants/${tenantId}/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return response.user
}

export function getPlatformHealth(): Promise<PlatformHealth> {
  return apiRequest<PlatformHealth>('/api/health')
}
