export type PermissionCode =
  | 'users.manage'
  | 'locations.manage'
  | 'inventory.read'
  | 'inventory.financials.read'
  | 'inventory.write'
  | 'inventory.reserve'
  | 'crm.read'
  | 'crm.write'
  | 'sales.read'
  | 'sales.create_offer'
  | 'sales.complete'
  | 'reports.read'

export interface AuthUser {
  id: number
  tenantId: number
  tenant: {
    id: number
    name: string
    slug: string
    currencyCode: string
    timezone: string
  }
  defaultLocationId: number | null
  firstName: string
  lastName: string
  email: string
  roles: string[]
  permissions: PermissionCode[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSession {
  accessToken: string
  expiresInSeconds: number
}

export interface LoginResponse extends AuthSession {
  user: AuthUser
}
