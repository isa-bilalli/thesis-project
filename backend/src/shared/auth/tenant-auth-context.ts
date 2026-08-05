export interface TenantAuthContext {
  userId: number;
  tenantId: number;
  authVersion: number;
  roles: string[];
  permissions: string[];
}
