import type { TenantAuthContext } from "../shared/auth/tenant-auth-context";
import type { PlatformAuthContext } from "../shared/auth/platform-auth-context";

declare global {
    namespace Express { 
        interface Request {
            auth?: TenantAuthContext;
            platformAuth?: PlatformAuthContext;
        }
    }
}

export {};
