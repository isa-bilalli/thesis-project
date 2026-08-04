export interface TenantAuthContext {
    userId: number,
    tenantId: number,
    roles: string[],
    permissions: string[];
}