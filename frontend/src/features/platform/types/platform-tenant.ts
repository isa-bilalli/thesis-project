export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
export type LocationStatus = 'ACTIVE' | 'INACTIVE'
export type TenantUserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED'
export type MutableTenantUserStatus = 'ACTIVE' | 'DISABLED'
export type TenantRoleCode =
  | 'DEALERSHIP_ADMIN'
  | 'SALES_MANAGER'
  | 'SALESPERSON'

export interface PlatformTenant {
  id: number
  name: string
  slug: string
  contactEmail: string | null
  contactPhone: string | null
  currencyCode: string
  timezone: string
  status: TenantStatus
  primaryLocationCity: string | null
  locationCount: number
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface PlatformLocation {
  id: number
  name: string
  code: string
  addressLine1: string
  addressLine2: string | null
  city: string
  postalCode: string | null
  countryCode: string
  phone: string | null
  email: string | null
  isPrimary: boolean
  status: LocationStatus
  createdAt: string
  updatedAt: string
}

export interface PlatformTenantUser {
  id: number
  tenantId?: number
  defaultLocationId: number | null
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: TenantUserStatus
  lastLoginAt?: string | null
  createdAt: string
  roles: TenantRoleCode[]
}

export interface PlatformTenantRole {
  id: number
  code: TenantRoleCode
  name: string
  description: string | null
}

export interface CreatePlatformTenantInput {
  name: string
  slug: string
  contactEmail?: string | null
  contactPhone?: string | null
  currencyCode: string
  timezone: string
  primaryLocation: {
    name: string
    code: string
    addressLine1: string
    addressLine2?: string | null
    city: string
    postalCode?: string | null
    countryCode: string
    phone?: string | null
    email?: string | null
  }
}

export type UpdatePlatformTenantInput = Pick<
  PlatformTenant,
  'name' | 'contactEmail' | 'contactPhone' | 'currencyCode' | 'timezone'
>

export interface CreatePlatformTenantUserInput {
  defaultLocationId: number
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  password: string
  roleCode: TenantRoleCode
}

export interface PlatformHealth {
  status: 'healthy' | 'unhealthy'
  database: 'connected' | 'disconnected'
}
