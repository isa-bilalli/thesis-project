import { Router } from "express";
import { locationRouter } from "./location/location.routes.js";
import { tenantRouter } from "./tenant/tenant.routes.js";

export const tenancyRouter = Router();

tenancyRouter.use("/platform/tenants", tenantRouter);
tenancyRouter.use("/tenant/locations", locationRouter);
