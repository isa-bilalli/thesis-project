import type { TenantAuthContext } from "../shared/auth/tenant-auth-context";

declare global {
    namespace Express { 
        interface Request {
            auth?: TenantAuthContext;
        }
    }
}

export {};