import { Router } from "express";
import { requireTenantAuth } from "../../../shared/middleware/require-tenant-auth.js";

export const locationRouter = Router();

locationRouter.use(requireTenantAuth);
